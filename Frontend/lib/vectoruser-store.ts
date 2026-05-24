import "server-only";

import { createHash } from "crypto";

import { db } from "@/lib/firebase/admin";

const VECTOR_USERS_COLLECTION = "vectoruser";
const PROJECTS_COLLECTION = "projects";
const DOCUMENTS_COLLECTION = "documents";

export type VectorProject = {
  projectId: string;
  pineconeNamespace: string;
  createdAt: Date;
  updatedAt: Date;
};

export type VectorDocumentMeta = {
  documentKey: string;
  fileName: string;
  vectorPrefix: string;
  chunkCount: number;
  chunkStart: number;
  chunkEnd: number;
  createdAt: Date;
  updatedAt: Date;
};

export function buildVectorPrefix(documentKey: string) {
  return createHash("sha1").update(documentKey).digest("hex");
}

export function buildVectorId(prefix: string, index: number) {
  return `${prefix}_${index}`;
}

export function buildVectorIds(prefix: string, count: number) {
  return Array.from({ length: count }, (_, index) => buildVectorId(prefix, index + 1));
}

function projectRef(userId: string, projectId: string) {
  return db
    .collection(VECTOR_USERS_COLLECTION)
    .doc(userId)
    .collection(PROJECTS_COLLECTION)
    .doc(projectId);
}

function documentRef(userId: string, projectId: string, vectorPrefix: string) {
  return projectRef(userId, projectId)
    .collection(DOCUMENTS_COLLECTION)
    .doc(vectorPrefix);
}

export async function ensureVectorProject(userId: string, projectId: string) {
  const userRef = db.collection(VECTOR_USERS_COLLECTION).doc(userId);
  const projectDoc = projectRef(userId, projectId);
  const now = new Date();

  await userRef.set({ updatedAt: now }, { merge: true });

  const snapshot = await projectDoc.get();
  if (snapshot.exists) {
    return snapshot.data() as VectorProject;
  }

  const pineconeNamespace = `project_${projectId}`;

  const payload: VectorProject = {
    projectId,
    pineconeNamespace,
    createdAt: now,
    updatedAt: now,
  };

  await projectDoc.set(payload, { merge: true });
  return payload;
}

export async function getVectorProject(userId: string, projectId: string) {
  const snapshot = await projectRef(userId, projectId).get();
  if (!snapshot.exists) {
    return null;
  }

  return snapshot.data() as VectorProject;
}

export async function getVectorDocumentMeta(
  userId: string,
  projectId: string,
  vectorPrefix: string
) {
  const snapshot = await documentRef(userId, projectId, vectorPrefix).get();
  if (!snapshot.exists) {
    return null;
  }

  return snapshot.data() as VectorDocumentMeta;
}

export async function upsertVectorDocumentMeta(
  userId: string,
  projectId: string,
  data: Omit<VectorDocumentMeta, "createdAt" | "updatedAt">,
  createdAt?: Date
) {
  const now = new Date();
  const payload: VectorDocumentMeta = {
    ...data,
    createdAt: createdAt || now,
    updatedAt: now,
  };

  await documentRef(userId, projectId, data.vectorPrefix).set(payload, { merge: true });
}

export async function deleteVectorDocumentMeta(
  userId: string,
  projectId: string,
  vectorPrefix: string
) {
  await documentRef(userId, projectId, vectorPrefix).delete();
}
