import { db } from "@/lib/firebase/client";
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Query,
  DocumentData,
  Timestamp,
} from "firebase/firestore";
import { COLLECTIONS, Campaign, Contact, Message, Conversation } from "@/lib/schemas";

// Generic Firestore operations
export const firestoreOps = {
  // Create or update document
  async setDoc<T extends DocumentData>(
    collectionName: string,
    docId: string,
    data: T,
    merge = true
  ) {
    const docRef = doc(db, collectionName, docId);
    await setDoc(docRef, data, { merge });
    return docId;
  },

  // Get single document
  async getDoc<T extends DocumentData>(collectionName: string, docId: string): Promise<T | null> {
    const docRef = doc(db, collectionName, docId);
    const snapshot = await getDoc(docRef);
    return snapshot.exists() ? (snapshot.data() as T) : null;
  },

  // Get multiple documents
  async getDocs<T extends DocumentData>(collectionName: string): Promise<(T & { id: string })[]> {
    const collectionRef = collection(db, collectionName);
    const snapshot = await getDocs(collectionRef);
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as T & { id: string }));
  },

  // Update document
  async updateDoc(collectionName: string, docId: string, updates: Record<string, any>) {
    const docRef = doc(db, collectionName, docId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: Timestamp.now(),
    });
  },

  // Delete document
  async deleteDoc(collectionName: string, docId: string) {
    const docRef = doc(db, collectionName, docId);
    await deleteDoc(docRef);
  },

  // Query with filters
  async queryDocs<T extends DocumentData>(
    collectionName: string,
    constraints: Array<any>
  ): Promise<(T & { id: string })[]> {
    const collectionRef = collection(db, collectionName);
    const q = query(collectionRef, ...constraints);
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as T & { id: string }));
  },
};

// Campaign-specific operations
export const campaignOps = {
  async createCampaign(userId: string, campaignData: Omit<Campaign, "id" | "createdAt" | "updatedAt">): Promise<string> {
    const campaignRef = doc(collection(db, COLLECTIONS.USERS, userId, COLLECTIONS.CAMPAIGNS));
    const campaign: Campaign = {
      ...campaignData,
      id: campaignRef.id,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };
    await setDoc(campaignRef, campaign);
    return campaignRef.id;
  },

  async getCampaigns(userId: string): Promise<Campaign[]> {
    const campaignsRef = collection(db, COLLECTIONS.USERS, userId, COLLECTIONS.CAMPAIGNS);
    const q = query(campaignsRef, orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id } as Campaign));
  },

  async getCampaign(userId: string, campaignId: string): Promise<Campaign | null> {
    const campaignRef = doc(db, COLLECTIONS.USERS, userId, COLLECTIONS.CAMPAIGNS, campaignId);
    const snapshot = await getDoc(campaignRef);
    return snapshot.exists() ? ({ ...snapshot.data(), id: snapshot.id } as Campaign) : null;
  },

  async updateCampaign(userId: string, campaignId: string, updates: Partial<Campaign>) {
    const campaignRef = doc(db, COLLECTIONS.USERS, userId, COLLECTIONS.CAMPAIGNS, campaignId);
    await updateDoc(campaignRef, {
      ...updates,
      updatedAt: Timestamp.now(),
    });
  },

  async deleteCampaign(userId: string, campaignId: string) {
    const campaignRef = doc(db, COLLECTIONS.USERS, userId, COLLECTIONS.CAMPAIGNS, campaignId);
    await deleteDoc(campaignRef);
  },
};

// Contact-specific operations
export const contactOps = {
  async addContact(userId: string, campaignId: string, contactData: Omit<Contact, "id">): Promise<string> {
    const contactRef = doc(
      collection(db, COLLECTIONS.USERS, userId, COLLECTIONS.CAMPAIGNS, campaignId, COLLECTIONS.CONTACTS)
    );
    const contact: Contact = {
      ...contactData,
      id: contactRef.id,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };
    await setDoc(contactRef, contact);
    return contactRef.id;
  },

  async getContacts(userId: string, campaignId: string): Promise<Contact[]> {
    const contactsRef = collection(
      db,
      COLLECTIONS.USERS,
      userId,
      COLLECTIONS.CAMPAIGNS,
      campaignId,
      COLLECTIONS.CONTACTS
    );
    const snapshot = await getDocs(contactsRef);
    return snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id } as Contact));
  },

  async updateContact(userId: string, campaignId: string, contactId: string, updates: Partial<Contact>) {
    const contactRef = doc(
      db,
      COLLECTIONS.USERS,
      userId,
      COLLECTIONS.CAMPAIGNS,
      campaignId,
      COLLECTIONS.CONTACTS,
      contactId
    );
    await updateDoc(contactRef, {
      ...updates,
      updatedAt: Timestamp.now(),
    });
  },
};

// Conversation-specific operations
export const conversationOps = {
  async createConversation(
    userId: string,
    conversationData: Omit<Conversation, "id" | "createdAt" | "updatedAt">
  ): Promise<string> {
    const conversationRef = doc(collection(db, COLLECTIONS.USERS, userId, COLLECTIONS.CONVERSATIONS));
    const conversation: Conversation = {
      ...conversationData,
      id: conversationRef.id,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };
    await setDoc(conversationRef, conversation);
    return conversationRef.id;
  },

  async getConversations(userId: string): Promise<Conversation[]> {
    const conversationsRef = collection(db, COLLECTIONS.USERS, userId, COLLECTIONS.CONVERSATIONS);
    const q = query(conversationsRef, orderBy("lastMessageAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id } as Conversation));
  },

  async addMessage(userId: string, conversationId: string, messageData: Omit<Message, "id" | "createdAt">) {
    const messageRef = doc(
      collection(
        db,
        COLLECTIONS.USERS,
        userId,
        COLLECTIONS.CONVERSATIONS,
        conversationId,
        COLLECTIONS.MESSAGES
      )
    );
    const message: Message = {
      ...messageData,
      id: messageRef.id,
      createdAt: Timestamp.now(),
    };
    await setDoc(messageRef, message);
  },
};
