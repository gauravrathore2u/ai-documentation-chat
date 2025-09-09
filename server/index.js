// Basic Express server with dotenv, cors, multer
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import multer from "multer";
import { Queue } from "bullmq";
import fs from "fs";
import path from "path";
import { createEmbeddings, createVectorStore, deleteFile } from "./utils.js";
import { GoogleGenAI } from "@google/genai";

dotenv.config();
// BullMQ queue for file uploads
const fileUploadQueue = new Queue("file-upload", {
  connection: {
    host: "localhost",
    port: 6379,
  },
});

const app = express();

const upload = multer({
  dest: path.join(process.cwd(), "uploads"),
});

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Server is running on port 8000");
});

// Example file upload endpoint
app.post("/upload", upload.single("file"), async (req, res) => {
  const uploadedFile = req.file;
  if (!uploadedFile) {
    return res.status(400).json({ error: "No file uploaded" });
  }
  try {
    // Add file info to BullMQ queue
    const job = await fileUploadQueue.add(
      "process",
      {
        originalname: uploadedFile.originalname,
        filename: uploadedFile.filename,
        path: uploadedFile.path,
        destination: uploadedFile.destination,
        mimetype: uploadedFile.mimetype,
        size: uploadedFile.size,
      },
      {
        removeOnComplete: false,
        removeOnFail: false,
      }
    );
    console.log("Job added to BullMQ queue:", job.id);
    res.json({
      message: "File uploaded and queued successfully",
      file: uploadedFile,
    });
  } catch (err) {
    deleteFile(uploadedFile?.path);
    res
      .status(500)
      .json({ error: "Error processing file", details: err.message });
  }
});

app.post("/chat", async (req, res) => {
  const userQuery = req.body.query;
  const embeddings = createEmbeddings();
  const vectorStore = await createVectorStore(embeddings);
  const retriever = vectorStore.asRetriever({ k: 3 });
  const retrieverResponse = await retriever.invoke(userQuery);

  const SYSTEM_PROMPT = `
  You are a helpful AI assistant who answers the user's query based on the context provided. Use the following pieces of context to answer the question at the end. If you don't know the answer, just say that you don't know, don't try to make up an answer. 
  context: 
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
            text: `${retrieverResponse}\n\n${userQuery}`,
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
  console.log(response.text);

  return res.json({ response: response.text, docs: retrieverResponse });
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
  // Start BullMQ worker when server starts
  import("./worker.js")
    .then(() => {
      console.log("BullMQ worker started with server.");
    })
    .catch((err) => {
      console.error("Failed to start BullMQ worker:", err);
    });
});
