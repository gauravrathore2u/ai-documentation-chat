
"use client";
import { useRef, useState, useEffect } from "react";
import { FiPlus } from "react-icons/fi";
import { Tooltip } from "@/components/ui/tooltip";
import { useUser } from "@clerk/nextjs";
import { FiTrash2 } from "react-icons/fi";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { FileMeta } from "@/lib/types";

type Message = {
  role: "user" | "model";
  content: string;
};

type ChatHistoryItem = {
  query: string;
  response: string;
  docs: string;
  timestamp: number;
};

export default function Home() {
  const chatBoxRef = useRef<HTMLDivElement>(null);
  // Handler to start a new chat
  const { user } = useUser();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<FileMeta[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [sending, setSending] = useState(false);
  // Fetch files metadata on mount
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/files`, {
          method: "GET",
          credentials: "include",
        });
        if (res.ok) {
          const result = await res.json();
          let files: FileMeta[] = [];
          if (Array.isArray(result)) {
            files = result;
          } else if (result && Array.isArray(result.files)) {
            files = result.files;
          }
          setUploadedFiles(files);
        }
      } catch (err) {
        console.error("Failed to fetch files metadata:", err);
      }
    };

    const fetchChats = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/chats`, {
          method: "GET",
          credentials: "include",
        });
        if (res.ok) {
          const chatHistory: { chats: ChatHistoryItem[] } = await res.json();
          // Map chat history to messages
          const mappedMessages: Message[] = chatHistory.chats.flatMap(chat => [
            { role: "user", content: chat.query },
            { role: "model", content: chat.response }
          ]);
          setMessages(mappedMessages);
        }
      } catch (err) {
        console.error("Failed to fetch chat history:", err);
      }
    };

    fetchFiles();
    fetchChats();
  }, [API_BASE_URL]);


  useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, [messages]);

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/file/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        setUploadedFiles((prev) => prev.filter((f) => f.id !== id));
      }
    } catch (err) {
      // Optionally handle error
      console.error("Delete failed for file:", id, err);
    }
  };

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const files = fileInputRef.current?.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const uploaded: FileMeta[] = [];
    for (let i = 0; i < files.length; i++) {
      const formData = new FormData();
      formData.append("file", files[i]);
      try {
        const res = await fetch(`${API_BASE_URL}/upload`, {
          method: "POST",
          body: formData,
          credentials: "include",
        });
        if (res.ok) {
          const result = await res.json();
          if (result && result.file) {
            uploaded.push(result.file);
          }
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
      const res = await fetch(`${API_BASE_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: chatInput }),
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [...prev, { role: "model", content: data.response }]);
      }
    } catch (err) {
      // Optionally handle error
      console.error("Chat request failed:", err);
    }
    setSending(false);
    setChatInput("");
  };

  const handleStartNewChat = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/start-new-chat`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        setMessages([]);
      }
    } catch (err) {
      console.error("Failed to start new chat:", err);
    }
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
          <Button type="submit" disabled={uploading} className="cursor-pointer">
            {uploading ? "Uploading..." : "Upload"}
          </Button>
        </form>
        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-2 text-white">Uploaded Files</h3>
          <ul className="list-disc pl-5 space-y-2">
            {uploadedFiles.length === 0 ? (
              <li className="text-zinc-300">No files uploaded yet.</li>
            ) : (
              uploadedFiles.map((file, idx) => (
                <li key={idx} className="text-zinc-300">
                  <div className="flex items-center justify-between">
                    <span>{file.originalname}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      className="ml-2 text-red-500 hover:text-red-700 p-1 cursor-pointer"
                      onClick={() => handleDelete(file.id)}
                      title="Delete document"
                    >
                      <FiTrash2 size={18} />
                    </Button>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      </section>

      {/* Right Section: Chat Interface */}
      <section className="flex-1 flex flex-col p-8">
        <h2 className="text-xl font-bold mb-4 text-white flex items-center gap-2">
          Chat
          <Tooltip content="New chat">
            <span
              className="cursor-pointer"
              onClick={handleStartNewChat}
            >
              <FiPlus size={22} />
            </span>
          </Tooltip>
        </h2>
        <div ref={chatBoxRef} className="flex-1 border border-zinc-700 rounded p-4 bg-zinc-800 mb-4 overflow-y-auto max-h-[80vh]">
          {messages.length === 0 ? (
            <div className="text-zinc-400">No messages yet.</div>
          ) : (
            <ul className="space-y-4">
              {messages.map((msg, idx) => (
                msg.role === "user" ? (
                  <li
                    key={idx}
                    className="flex items-start justify-end gap-3"
                  >
                    <div className="flex flex-col items-end max-w-[70%]">
                      <span className="whitespace-pre-line text-blue-200 bg-zinc-700 rounded-lg px-4 py-2">{msg.content}</span>
                    </div>
                    <Avatar>
                      {user?.imageUrl ? (
                        <AvatarImage src={user.imageUrl} alt={user.fullName || "User"} />
                      ) : (
                        <AvatarFallback className="bg-blue-600 text-white text-lg">
                          {user?.fullName
                            ? user.fullName.split(" ").map(n => n[0]).join("")
                            : "U"}
                        </AvatarFallback>
                      )}
                    </Avatar>
                  </li>
                ) : (
                  <li
                    key={idx}
                    className="flex items-start justify-start gap-3"
                  >
                    <Avatar>
                      <AvatarFallback className="bg-gray-600">AI</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col items-start max-w-[70%]">
                      <span className="whitespace-pre-line text-green-200 bg-zinc-700 rounded-lg px-4 py-2">{msg.content}</span>
                    </div>
                  </li>
                )
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
          <Button type="submit" disabled={sending} className="cursor-pointer">
            {sending ? "Sending..." : "Send"}
          </Button>
        </form>
      </section>
    </main>
  );
}
