import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import multer from "multer";
import fs from "fs";
import path from "path";
import { createEmbeddings, createVectorStore, deleteFile } from "./utils.js";
import { GoogleGenAI } from "@google/genai";
import {
  addUserFile,
  getUserFiles,
  deleteUserFile,
  saveUserChat,
  getUserChats,
  deleteAllUserChats,
} from "./valkey.js";
import { QdrantClient } from "@qdrant/js-client-rest";
import { clerkMiddleware, getAuth } from "@clerk/express";
import cookieParser from "cookie-parser";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { randomUUID } from "crypto";

dotenv.config();

const app = express();

const upload = multer({
  dest: path.join(process.cwd(), "uploads"),
});

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  })
);
app.use(express.json());
app.use(
  cookieParser({
    sameSite: "None",
    secure: true,
  })
);
app.use(clerkMiddleware());

app.get("/", (req, res) => {
  res.send("Server is running on port 8000");
});

// Example file upload endpoint
app.post("/upload", upload.single("file"), async (req, res) => {
  const uploadedFile = req.file;
  const auth = getAuth(req);
  const userId = auth.userId;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });
  if (!uploadedFile) {
    return res.status(400).json({ error: "No file uploaded" });
  }
  try {
    const fileId = `${uploadedFile.filename}-${Date.now()}`;
    const collectionName = `pdf-docs-${userId}`;

    // PDF processing
    const pdfLoader = new PDFLoader(uploadedFile.path);
    const rawDocs = await pdfLoader.load();

    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 100,
    });
    const chunkedDocs = await textSplitter.splitDocuments(rawDocs);

    const embeddings = createEmbeddings();
    const vectorStore = await createVectorStore(embeddings, collectionName);

    // Assign explicit UUIDs to each chunk
    const vectorIds = [];
    chunkedDocs.forEach((doc) => {
      const id = randomUUID();
      doc.id = id;
      vectorIds.push(id);
    });
    await vectorStore.addDocuments(chunkedDocs);
    console.log("Documents added to Qdrant with IDs:", vectorIds);

    // Save file metadata in Valkey
    const fileMeta = {
      id: fileId,
      originalname: uploadedFile.originalname,
      filename: uploadedFile.filename,
      path: uploadedFile.path,
      mimetype: uploadedFile.mimetype,
      size: uploadedFile.size,
      destination: uploadedFile.destination,
      collectionName,
      vectorIds,
    };
    await addUserFile(userId, fileMeta);

    // Delete file from disk
    deleteFile(uploadedFile.path);

    res.json({
      message: "File uploaded and processed successfully",
      file: fileMeta,
    });
  } catch (err) {
    deleteFile(uploadedFile?.path);
    res
      .status(500)
      .json({ error: "Error processing file", details: err.message });
  }
});

// List files for logged-in user
app.get("/files", async (req, res) => {
  const auth = getAuth(req);
  const userId = auth.userId;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });
  try {
    const files = await getUserFiles(userId);
    res.json({ files });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Error fetching files", details: err.message });
  }
});

// Delete file for user and remove from Qdrant
app.delete("/file/:id", async (req, res) => {
  const auth = getAuth(req);
  const userId = auth.userId;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });
  try {
    const files = await getUserFiles(userId);
    const file = files.find((f) => f.id === req.params.id);
    if (!file) return res.status(404).json({ error: "File not found" });

    // Remove vectors from Qdrant (assume vector IDs are stored in file.vectorIds)
    const qdrantClient = new QdrantClient({
      url: process.env.QDRANT_URL,
      apiKey: process.env.QDRANT_API_KEY,
    });
    if (
      file.vectorIds &&
      Array.isArray(file.vectorIds) &&
      file.vectorIds.length > 0
    ) {
      await qdrantClient.delete(file.collectionName, {
        points: file.vectorIds,
      });
    } else {
      console.log("No Qdrant vector IDs to delete for file", file.id);
    }
    // Remove file metadata from Valkey
    await deleteUserFile(userId, req.params.id);
    res.json({ message: "File and vectors deleted" });
  } catch (err) {
    console.error("Error deleting file:", err);
    res
      .status(500)
      .json({ error: "Error deleting file", details: err.message });
  }
});

app.post("/chat", async (req, res) => {
  try {
    const auth = getAuth(req);
    const userId = auth.userId;
    if (!userId) return res.status(401).json({ error: "Not authenticated" });

    const userQuery = req.body.query;
    const collectionName = `pdf-docs-${userId}`;
    const embeddings = createEmbeddings();
    const vectorStore = await createVectorStore(
      embeddings,
      collectionName,
      process.env.QDRANT_URL
    );
    const retriever = vectorStore.asRetriever({ k: 3 });
    const retrieverResponse = await retriever.invoke(userQuery);

    // Fetch previous chats for context
    const previousChats = await getUserChats(userId);
    let chatHistory = "";
    if (previousChats.length > 0) {
      chatHistory = previousChats
        .map((chat, idx) => `User: ${chat.query}\nAI: ${chat.response}`)
        .join("\n\n");
    }

    const SYSTEM_PROMPT = `
You are a helpful AI assistant who answers the user's query based on the context provided. Use the following pieces of context and previous chat history to answer the question at the end. If you don't know the answer, just say that you don't know, don't try to make up an answer.

context:
${JSON.stringify(retrieverResponse)}

Previous chat history:
${chatHistory}
`;

    const ai = new GoogleGenAI({});

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "model",
          parts: [
            {
              text: SYSTEM_PROMPT,
            },
          ],
        },
        {
          role: "user",
          parts: [
            {
              text: userQuery,
            },
          ],
        },
      ],
      config: {
        thinkingConfig: {
          thinkingBudget: 0, // Disables thinking
        },
      },
    });
    console.log(SYSTEM_PROMPT);

    // Save chat in Valkey
    await saveUserChat(userId, {
      query: userQuery,
      response: response.text,
      docs: retrieverResponse,
      timestamp: Date.now(),
    });

    return res.json({ response: response.text, docs: retrieverResponse });
  } catch (error) {
    console.error("Error in /chat:", error);
    res.status(500).json({ error: "Error processing chat request" });
  }
});

// Route to get saved chats for user
app.get("/chats", async (req, res) => {
  const auth = getAuth(req);
  console.log("Auth data:", auth);

  const userId = auth.userId;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });
  try {
    const chats = await getUserChats(userId);
    res.json({ chats });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Error fetching chats", details: err.message });
  }
});

// Route to delete all previous chats for user
app.post("/start-new-chat", async (req, res) => {
  const auth = getAuth(req);
  const userId = auth.userId;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });
  try {
    await deleteAllUserChats(userId);
    res.json({ message: "All previous chats deleted" });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Error deleting chats", details: err.message });
  }
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

function getUserInfo(req) {
  const auth = getAuth(req);
  if (!auth.userId) return null;
  return {
    userId: auth.userId,
    sessionId: auth.sessionId,
    ...auth,
  };
}
