
"use client";
import { useRef, useState } from "react";
import { FiTrash2 } from "react-icons/fi";

type Message = {
  role: "user" | "model";
  content: string;
};

export default function Home() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [sending, setSending] = useState(false);

  const handleDelete = async (filename: string) => {
    try {
      const res = await fetch("http://localhost:8000/delete-doc", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ filename }),
      });
      if (res.ok) {
        setUploadedFiles((prev) => prev.filter((f) => f !== filename));
      }
    } catch (err) {
      // Optionally handle error
      console.error("Delete failed for file:", filename, err);
    }
  };

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const files = fileInputRef.current?.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const uploaded: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const formData = new FormData();
      formData.append("file", files[i]);
      try {
        const res = await fetch("http://localhost:8000/upload", {
          method: "POST",
          body: formData,
        });
        if (res.ok) {
          uploaded.push(files[i].name);
        }
      } catch (err) {
        // Optionally handle error
        console.error("Upload failed for file:", files[i].name, err);
      }
    }
    setUploadedFiles((prev) => [...prev, ...uploaded]);
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleChatSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const userMsg: Message = { role: "user", content: chatInput };
    setMessages((prev) => [...prev, userMsg]);
    setSending(true);
    try {
      const res = await fetch("http://localhost:8000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: chatInput }),
      });
      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [...prev, { role: "model", content: data.response }]);
      }
    } catch (err) {
      // Optionally handle error
    }
    setSending(false);
    setChatInput("");
  };

  return (
    <main className="min-h-screen flex flex-row bg-zinc-900">
      {/* Left Section: File Upload & List */}
      <section className="w-full max-w-md bg-zinc-800 border-r border-zinc-700 p-8 flex flex-col gap-8">
        <h2 className="text-xl font-bold mb-4 text-white">Upload Files</h2>
        <form className="flex flex-col gap-4" onSubmit={handleUpload}>
          <input
            type="file"
            multiple
            accept="application/pdf"
            className="border border-zinc-700 bg-zinc-900 text-white p-2 rounded"
            ref={fileInputRef}
            disabled={uploading}
          />
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            disabled={uploading}
          >
            {uploading ? "Uploading..." : "Upload"}
          </button>
        </form>
        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-2 text-white">Uploaded Files</h3>
          <ul className="list-disc pl-5 space-y-2">
            {uploadedFiles.length === 0 ? (
              <li className="text-zinc-300">No files uploaded yet.</li>
            ) : (
              uploadedFiles.map((file, idx) => (
                <li key={idx} className="text-zinc-300 flex items-center justify-between">
                  <span>{file}</span>
                  <button
                    type="button"
                    className="ml-2 text-red-500 hover:text-red-700"
                    onClick={() => handleDelete(file)}
                    title="Delete document"
                  >
                    <FiTrash2 size={18} />
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      </section>

      {/* Right Section: Chat Interface */}
      <section className="flex-1 flex flex-col p-8">
        <h2 className="text-xl font-bold mb-4 text-white">Chat</h2>
        <div className="flex-1 overflow-y-auto border border-zinc-700 rounded p-4 bg-zinc-800 mb-4">
          {messages.length === 0 ? (
            <div className="text-zinc-400">No messages yet.</div>
          ) : (
            <ul className="space-y-4">
              {messages.map((msg, idx) => (
                <li key={idx} className={msg.role === "user" ? "text-blue-400" : "text-green-400"}>
                  <span className="block font-semibold mb-1">{msg.role === "user" ? "You" : "AI"}</span>
                  <span className="whitespace-pre-line">{msg.content}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <form className="flex gap-2" onSubmit={handleChatSubmit}>
          <input
            type="text"
            placeholder="Type your message..."
            className="flex-1 border border-zinc-700 bg-zinc-900 text-white p-2 rounded"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            disabled={sending}
          />
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            disabled={sending}
          >
            {sending ? "Sending..." : "Send"}
          </button>
        </form>
      </section>
    </main>
  );
}
