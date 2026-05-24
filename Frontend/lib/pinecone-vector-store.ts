import "server-only";

import type { RecordMetadata } from "@pinecone-database/pinecone";

import { chunkTextBySentence } from "@/lib/vector-chunking";
import { embedTexts } from "@/lib/pinecone-embeddings";
import { deleteVectors, upsertVectors } from "@/lib/pinecone-service";
import {
  buildVectorIds,
  buildVectorPrefix,
  getVectorDocumentMeta,
  getVectorProject,
  upsertVectorDocumentMeta,
  deleteVectorDocumentMeta,
} from "@/lib/vectoruser-store";

export type UpsertPineconeDocumentParams = {
  userId: string;
  campaignId: string;
  documentKey: string;
  fileName: string;
  text: string;
};

export async function upsertCampaignDocumentVectors(
  params: UpsertPineconeDocumentParams
) {
  const { userId, campaignId, documentKey, fileName, text } = params;

  const project = await getVectorProject(userId, campaignId);
  if (!project) {
    return { skipped: true, reason: "vector_project_missing" };
  }

  const chunks = chunkTextBySentence(text, 500);
  if (chunks.length === 0) {
    return { skipped: true, reason: "no_text" };
  }

  const vectorPrefix = buildVectorPrefix(documentKey);
  const existing = await getVectorDocumentMeta(userId, campaignId, vectorPrefix);

  if (existing?.chunkCount) {
    const oldVectorIds = buildVectorIds(vectorPrefix, existing.chunkCount);
    await deleteVectors(project.pineconeNamespace, oldVectorIds);
  }

  const embeddings = await embedTexts(chunks);

  const vectors = chunks.map((chunkText, index) => ({
    id: `${vectorPrefix}_${index + 1}`,
    values: embeddings[index],
    metadata: {
      userId,
      campaignId,
      documentKey,
      fileName,
      chunkIndex: index + 1,
    } as RecordMetadata,
  }));

  await upsertVectors(project.pineconeNamespace, vectors);

  await upsertVectorDocumentMeta(
    userId,
    campaignId,
    {
      documentKey,
      fileName,
      vectorPrefix,
      chunkCount: chunks.length,
      chunkStart: 1,
      chunkEnd: chunks.length,
    },
    existing?.createdAt
  );

  return { stored: true, chunkCount: chunks.length };
}

export async function deleteCampaignDocumentVectors(params: {
  userId: string;
  campaignId: string;
  documentKey: string;
}) {
  const { userId, campaignId, documentKey } = params;
  const project = await getVectorProject(userId, campaignId);
  if (!project) {
    return { skipped: true, reason: "vector_project_missing" };
  }

  const vectorPrefix = buildVectorPrefix(documentKey);
  const existing = await getVectorDocumentMeta(userId, campaignId, vectorPrefix);
  if (!existing?.chunkCount) {
    return { skipped: true, reason: "document_missing" };
  }

  const oldVectorIds = buildVectorIds(vectorPrefix, existing.chunkCount);
  await deleteVectors(project.pineconeNamespace, oldVectorIds);
  await deleteVectorDocumentMeta(userId, campaignId, vectorPrefix);

  return { deleted: true };
}
