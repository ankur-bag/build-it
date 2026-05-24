import admin from "firebase-admin";

if (!admin.apps.length) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
}

export const db = admin.firestore()

const projectId = process.env.FIREBASE_PROJECT_ID
const bucketName = process.env.FIREBASE_STORAGE_BUCKET || `${projectId}.appspot.com`
export const bucket = admin.storage().bucket(bucketName);
