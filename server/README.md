# AI PDF Chat Server

A Node.js Express backend for secure, per-user PDF chat powered by Clerk authentication, Valkey (Redis), Qdrant, LangChain, and GoogleGenAI.

## Retrieval-Augmented Generation (RAG)

This backend uses Retrieval-Augmented Generation (RAG) to answer user queries:

- When you chat, the server retrieves relevant PDF chunks from Qdrant using semantic search.
- These chunks are provided as context to the LLM (GoogleGenAI), which generates responses based on both your query and the retrieved information.
- This ensures answers are grounded in your uploaded documents.

## Features

- **Clerk authentication** for all endpoints
- **Per-user file upload and storage** (PDFs)
- **PDF chunking and embedding** via LangChain
- **Qdrant vector store** for semantic search
- **Valkey (Redis)** for file metadata and chat history
- **Synchronous file upload and processing** (no workers/queues)
- **Chat endpoint** with context and history for LLM
- **Vector deletion** for specific files
- **Chat history management** (list, delete, start new chat)
- **Docker Compose** for Valkey and Qdrant services

## Getting Started

1. Install dependencies:
   ```sh
   npm install
   ```
2. Set up `.env` with:
   ```
   FRONTEND_URL=http://localhost:3000
   QDRANT_URL=http://localhost:6333
   GEMINI_API_KEY=your-google-genai-key
   ```
3. Start Valkey and Qdrant with Docker Compose:
   ```sh
   docker-compose up -d
   ```
4. Start the server:
   ```sh
   npm start
   ```

## Endpoints

- `GET /` — Health check
- `POST /upload` — Upload PDF (form field: `file`)
- `GET /files` — List user files
- `DELETE /file/:id` — Delete file and vectors
- `POST /chat` — Chat with context/history
- `GET /chats` — List chat history
- `POST /start-new-chat` — Delete all previous chats

## File Structure

- `index.js` — Main Express server
- `utils.js` — Embedding, vector store, file utilities
- `valkey.js` — Valkey (Redis) file/chat helpers
- `docker-compose.yml` — Valkey and Qdrant setup

## Notes

- All endpoints require Clerk authentication.
- PDF processing and vector storage are synchronous.
- Chat prompt construction ensures only the model role receives context/history.
