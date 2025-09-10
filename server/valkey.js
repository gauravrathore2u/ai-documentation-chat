import Redis from "ioredis";
const redis = new Redis({ host: "localhost", port: 6379 });

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
