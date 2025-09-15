# AI PDF Chat Client

A modern Next.js frontend for secure, per-user PDF chat powered by Clerk authentication. This client interfaces with the AI PDF Chat backend to enable document upload, semantic search, and conversational AI over your PDFs.

## Features

- **User authentication** via Clerk
- **PDF upload** and management
- **Chat interface** with context-aware AI responses
- **Per-user file and chat history**
- **Responsive, dark-themed UI**
- **Integration with backend endpoints** for file, chat, and history

## Getting Started

1. **Install dependencies:**
   ```sh
   npm install
   ```
2. **Configure environment:**
   - Create a `.env` file with:
     ```
     NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
     NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your-clerk-key
     ```
   - Ensure the backend is running and accessible at the specified API base URL.
3. **Run the development server:**
   ```sh
   npm run dev
   ```

## Usage

1. **Sign up or log in** using Clerk authentication.
2. **Upload PDF files** using the left sidebar.
3. **Start chatting** with the AI about your uploaded documents.
4. **Delete files** or start a new chat session as needed.

## Project Structure

- `src/app/` — Main Next.js app, including layout and page components
- `src/components/ui/` — UI primitives (Avatar, Button, Tooltip)
- `src/lib/` — Shared types and utilities
- `public/` — Static assets
- `globals.css` — Global styles (Tailwind CSS)

## Environment Variables

- `NEXT_PUBLIC_API_BASE_URL` — Backend API URL
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` — Clerk publishable key

## Backend Integration

This client expects the backend (see `../server/README.md`) to provide endpoints for:

- `POST /upload` — Upload PDF
- `GET /files` — List user files
- `DELETE /file/:id` — Delete file
- `POST /chat` — Chat with context/history
- `GET /chats` — List chat history
- `POST /start-new-chat` — Delete all previous chats

## License

MIT
