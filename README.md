# AI PDF Chat

A full-stack application for secure, per-user PDF chat powered by Clerk authentication, Valkey (Redis), Qdrant, LangChain, and GoogleGenAI. The project consists of a Next.js client and a Node.js Express backend using Retrieval-Augmented Generation (RAG) for document-grounded AI chat.

---

## Features

- **User authentication** via Clerk
- **PDF upload, chunking, and semantic search**
- **Per-user file and chat history**
- **Chat interface with context-aware AI responses**
- **Valkey (Redis) for metadata and chat storage**
- **Qdrant vector store for semantic search**
- **Responsive, dark-themed UI**
- **Docker Compose for Valkey and Qdrant services**

---

## Monorepo Structure

```
AI-pdf-chat/
├── client/   # Next.js frontend
├── server/   # Node.js Express backend
```

### Client (`client/`)

- Next.js 15, React 19
- Clerk authentication
- PDF upload and management
- Chat UI with context-aware responses
- Tailwind CSS for styling
- UI primitives (Avatar, Button, Tooltip)

### Server (`server/`)

- Express.js API
- Clerk authentication middleware
- PDF chunking and embedding via LangChain
- Qdrant for vector storage and semantic search
- Valkey (Redis) for file metadata and chat history
- GoogleGenAI for LLM responses
- Docker Compose for Valkey and Qdrant

---

## Getting Started

### Prerequisites

- Node.js 18+
- Docker (for Valkey and Qdrant)

### Setup

#### 1. Clone the repository

```sh
git clone <repo-url>
cd AI-pdf-chat
```

#### 2. Install dependencies

```sh
cd client && npm install
cd ../server && npm install
```

#### 3. Configure environment variables

- **Client (`client/.env`):**
  ```
  NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your-clerk-key
  ```
- **Server (`server/.env`):**
  ```
  FRONTEND_URL=http://localhost:3000
  QDRANT_URL=http://localhost:6333
  GEMINI_API_KEY=your-google-genai-key
  ```

#### 4. Start Valkey and Qdrant

```sh
cd server
docker-compose up -d
```

#### 5. Start the backend server

```sh
npm start
```

#### 6. Start the frontend

```sh
cd ../client
npm run dev
```

---

## Usage

1. **Sign up or log in** using Clerk authentication.
2. **Upload PDF files** using the sidebar.
3. **Chat with the AI** about your uploaded documents.
4. **Delete files** or start a new chat session as needed.

---

## API Endpoints

### Backend (`server/`)

- `GET /` — Health check
- `POST /upload` — Upload PDF (form field: `file`)
- `GET /files` — List user files
- `DELETE /file/:id` — Delete file and vectors
- `POST /chat` — Chat with context/history
- `GET /chats` — List chat history
- `POST /start-new-chat` — Delete all previous chats

---

## Technologies Used

- **Next.js, React, Tailwind CSS** (frontend)
- **Express.js, Clerk, LangChain, Qdrant, Valkey, GoogleGenAI** (backend)
- **Docker Compose** (infrastructure)

---

## License

MIT
