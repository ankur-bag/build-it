import "server-only";

import { Pinecone } from "@pinecone-database/pinecone";

const apiKey = process.env.PINECONE_API_KEY || "";
const indexName = process.env.PINECONE_INDEX_NAME || "";

const client = new Pinecone({ apiKey });

export function pineconeIndex() {
  if (!indexName) {
    throw new Error("PINECONE_INDEX_NAME is not set.");
  }

  return client.Index(indexName);
}
