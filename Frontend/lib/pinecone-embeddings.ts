import "server-only";

import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const embeddingModel = genAI.getGenerativeModel({ model: "gemini-embedding-2" });

export async function embedText(text: string) {
  const result = await embeddingModel.embedContent(text);
  return result.embedding.values;
}

export async function embedTexts(texts: string[]) {
  const embeddings: number[][] = [];
  for (const text of texts) {
    embeddings.push(await embedText(text));
  }

  return embeddings;
}
