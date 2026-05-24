import { OpenAI } from "openai";
import { db } from "./firebase/admin";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || process.env.OPEN_AI_CALLING,
});

/**
 * Split text into overlapping chunks.
 */
export function chunkText(text: string, size = 1000, overlap = 200): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + size, text.length);
    chunks.push(text.slice(start, end));
    start += size - overlap;
  }
  return chunks;
}

/**
 * Get embedding for a text chunk using OpenAI.
 */
export async function getEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });
  return response.data[0].embedding;
}

/**
 * Store document chunks and their embeddings in Firestore.
 */
export async function upsertDocumentChunks(
  campaignId: string,
  userId: string,
  docName: string,
  text: string
) {
  console.log(`📦 Chunking and embedding document: ${docName}`);
  
  const campaignRef = db.collection("users").doc(userId).collection("campaigns").doc(campaignId);
  const chunksCol = campaignRef.collection("chunks");

  // Step 1: Clear old chunks for this document to prevent duplicates/stale data
  const oldChunks = await chunksCol.where('docName', '==', docName).get();
  if (!oldChunks.empty) {
    const deleteBatch = db.batch();
    oldChunks.docs.forEach(doc => deleteBatch.delete(doc.ref));
    await deleteBatch.commit();
    console.log(`🗑️ Cleared ${oldChunks.size} stale chunks for ${docName}`);
  }

  // Step 2: Create new chunks
  const chunks = chunkText(text);
  const chunksBatch = db.batch();
  
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const embedding = await getEmbedding(chunk);
    const chunkRef = chunksCol.doc();
    chunksBatch.set(chunkRef, {
      docName,
      chunkText: chunk,
      embedding,
      index: i,
      createdAt: new Date(),
    });

    // Firestore batch limit is 500
    if ((i + 1) % 400 === 0) {
      await chunksBatch.commit();
    }
  }
  
  await chunksBatch.commit();
  console.log(`✅ Successfully stored ${chunks.length} chunks for ${docName}`);
}


/**
 * Calculate cosine similarity between two vectors.
 */
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  let dotProduct = 0;
  let mA = 0;
  let mB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    mA += vecA[i] * vecA[i];
    mB += vecB[i] * vecB[i];
  }
  mA = Math.sqrt(mA);
  mB = Math.sqrt(mB);
  return dotProduct / (mA * mB);
}

/**
 * Search for the most relevant chunks in Firestore using semantic similarity.
 */
export async function searchChunks(
  campaignId: string,
  userId: string,
  query: string,
  limit = 3
): Promise<string[]> {
  const queryEmbedding = await getEmbedding(query);
  
  const chunksCol = db
    .collection("users")
    .doc(userId)
    .collection("campaigns")
    .doc(campaignId)
    .collection("chunks");

  const snapshot = await chunksCol.get();
  const chunks = snapshot.docs.map(doc => doc.data());

  // Brute-force similarity (Optimized for small-medium campaign docs)
  const scoredChunks = chunks.map(chunk => ({
    text: chunk.chunkText,
    similarity: cosineSimilarity(queryEmbedding, chunk.embedding),
  }));

  scoredChunks.sort((a, b) => b.similarity - a.similarity);
  return scoredChunks.slice(0, limit).map(c => c.text);
}
