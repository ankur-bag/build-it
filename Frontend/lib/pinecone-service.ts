import "server-only";

import type { RecordMetadata } from "@pinecone-database/pinecone";

import { pineconeIndex } from "@/lib/pinecone";

export async function upsertVectors(
  namespace: string,
  vectors: Array<{ id: string; values: number[]; metadata: RecordMetadata }>
) {
  if (vectors.length === 0) {
    return;
  }

  const index = pineconeIndex();
  await index.namespace(namespace).upsert(vectors);
}

export async function deleteVectors(namespace: string, vectorIds: string[]) {
  if (vectorIds.length === 0) {
    return;
  }

  const index = pineconeIndex();
  await index.namespace(namespace).deleteMany(vectorIds);
}

export async function deleteNamespaceVectors(namespace: string) {
  const index = pineconeIndex();
  await index.namespace(namespace).deleteAll();
}
