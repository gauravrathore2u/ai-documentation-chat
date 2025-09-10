// Utility functions for repeatable code in worker.js and index.js
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { QdrantVectorStore } from "@langchain/qdrant";
import fs from "fs";

export function createEmbeddings(
  apiKey = process.env.GEMINI_API_KEY,
  model = "text-embedding-004"
) {
  return new GoogleGenerativeAIEmbeddings({
    apiKey,
    model,
  });
}

export async function createVectorStore(
  embeddings,
  collectionName = "pdf-docs",
  url = process.env.QDRANT_URL
) {
  return await QdrantVectorStore.fromExistingCollection(embeddings, {
    url,
    collectionName,
  });
}

export function deleteFile(filePath) {
  if (filePath) {
    fs.unlink(filePath, (err) => {
      if (err) {
        console.error("Error deleting file:", err);
      }
    });
  }
}
