import { Worker } from "bullmq";
import fs from "fs";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { QdrantVectorStore } from "@langchain/qdrant";
import { Document } from "@langchain/core/documents";
import { QdrantClient } from "@qdrant/js-client-rest";

const worker = new Worker(
  "file-upload",
  async (job) => {
    console.log("Job received:", job.id);
    const { path } = job.data;

    /**
     * read the pdf from the path
     * chunk the pdf into smaller parts
     * create embeddings for each chunk using google ai studio embeddings api
     * store the chunk and embeddings in quadrant db
     */

    const pdfLoader = new PDFLoader(path);
    const rawDocs = await pdfLoader.load();

    console.log("Raw documents:", JSON.stringify(rawDocs, null, 2));
    console.log("Number of documents:", rawDocs.length);

    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 100,
    });
    const chunkedDocs = await textSplitter.splitDocuments(rawDocs);

    console.log("Chunked documents:", JSON.stringify(chunkedDocs));

    const qdrantClient = new QdrantClient({ host: "localhost", port: 6333 });
    const embeddings = new GoogleGenerativeAIEmbeddings({
      apiKey: process.env.GEMINI_API_KEY,
      model: "text-embedding-004",
    });

    const vectorStore = await QdrantVectorStore.fromExistingCollection(
      embeddings,
      {
        url: process.env.QDRANT_URL,
        collectionName: "pdf-docs",
      }
    );

    await vectorStore.addDocuments(chunkedDocs);
    console.log("Documents added to Qdrant");

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
