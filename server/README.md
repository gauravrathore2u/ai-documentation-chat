# AI PDF Chat Server

This is a Node.js Express server running on port 8000. It uses ES module imports and is configured with dotenv, cors, and multer.

## Features

- Express server (ES module syntax)
- dotenv for environment variables
- cors for cross-origin requests
- multer for file uploads

## Getting Started

1. Install dependencies:
   ```sh
   npm install
   ```
2. Start the server:
   ```sh
   npm start
   ```

The server will run on port 8000 (or the value in `.env`).

## Endpoints

- `GET /` — Health check
- `POST /upload` — Upload a file (form field: `file`)
