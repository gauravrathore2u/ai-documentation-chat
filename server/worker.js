import { Worker } from "bullmq";
import fs from "fs";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { createEmbeddings, createVectorStore, deleteFile } from "./utils.js";
import { addUserFile } from "./valkey.js";
import { randomUUID } from "crypto";

const worker = new Worker(
  "file-upload",
  async (job) => {
    console.log("Job received:", job.id);
    const { path, collectionName } = job.data;

    /**
     * read the pdf from the path
     * chunk the pdf into smaller parts
     * create embeddings for each chunk using google ai studio embeddings api
     * store the chunk and embeddings in quadrant db
     */

    const pdfLoader = new PDFLoader(path);
    const rawDocs = await pdfLoader.load();

    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 100,
    });
    const chunkedDocs = await textSplitter.splitDocuments(rawDocs);

    const embeddings = createEmbeddings();
    const vectorStore = await createVectorStore(embeddings, collectionName);

    // Assign explicit IDs to each chunk
    const vectorIds = [];
    chunkedDocs.forEach((doc) => {
      const id = randomUUID();
      doc.id = id;
      vectorIds.push(id);
    });
    // Add documents to Qdrant with explicit IDs
    await vectorStore.addDocuments(chunkedDocs);
    console.log("Documents added to Qdrant");

    // Save file metadata in Valkey
    try {
      const {
        userId,
        id: fileId,
        originalname,
        filename,
        mimetype,
        size,
        destination,
      } = job.data;
      const fileMeta = {
        id: fileId,
        originalname,
        filename,
        path,
        mimetype,
        size,
        destination,
        collectionName,
        vectorIds,
      };
      await addUserFile(userId, fileMeta);
    } catch (err) {
      console.error("Error saving file metadata in Valkey:", err);
    }

    deleteFile(path);
    if (path) {
      fs.unlink(path, (err) => {
        if (err) {
          console.error("Error deleting file:", err);
        }
      });
    }
    return { status: "done" };
  },
  {
    connection: {
      host: "localhost",
      port: 6379,
    },
  }
);

worker.on("active", (job) => {
  console.log(`Job ${job.id} is now active.`);
});

worker.on("stalled", (jobId) => {
  console.warn(`Job ${jobId} stalled.`);
});

worker.on("error", (err) => {
  console.error("Worker connection error:", err);
});

worker.on("ready", () => {
  console.log("BullMQ worker is ready and connected to Valkey.");
});

worker.on("error", (err) => {
  console.error("Worker connection error:", err);
});

worker.on("completed", (job) => {
  console.log(`Job ${job.id} completed!`);
});

worker.on("failed", (job, err) => {
  console.error(`Job ${job.id} failed:`, err);
});
