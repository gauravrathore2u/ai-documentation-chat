import Redis from "ioredis";
import dotenv from "dotenv";
dotenv.config();
const redis = new Redis(process.env.VALKEY_URL);

export async function addUserFile(userId, fileMeta) {
  // Store file metadata as JSON in a list for the user
  await redis.rpush(`user:${userId}:files`, JSON.stringify(fileMeta));
}

export async function getUserFiles(userId) {
  const files = await redis.lrange(`user:${userId}:files`, 0, -1);
  return files.map((f) => JSON.parse(f));
}

export async function deleteUserFile(userId, fileId) {
  // Remove file metadata from user's list
  const files = await getUserFiles(userId);
  const updatedFiles = files.filter((f) => f.id !== fileId);
  await redis.del(`user:${userId}:files`);
  for (const f of updatedFiles) {
    await redis.rpush(`user:${userId}:files`, JSON.stringify(f));
  }
}

export async function saveUserChat(userId, chat) {
  // Save chat without expiry
  const chatKey = `user:${userId}:chat:${Date.now()}`;
  await redis.set(chatKey, JSON.stringify(chat));
  await redis.rpush(`user:${userId}:chats`, chatKey);
}

export async function getUserChats(userId) {
  const chatKeys = await redis.lrange(`user:${userId}:chats`, 0, -1);
  const chats = [];
  for (const key of chatKeys) {
    const chat = await redis.get(key);
    if (chat) chats.push(JSON.parse(chat));
  }
  return chats;
}

export async function deleteAllUserChats(userId) {
  const chatKeys = await redis.lrange(`user:${userId}:chats`, 0, -1);
  for (const key of chatKeys) {
    await redis.del(key);
  }
  await redis.del(`user:${userId}:chats`);
}
