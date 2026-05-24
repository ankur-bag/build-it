// lib/firebase/messageService.ts
import { db } from './client'
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  orderBy, 
  addDoc,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  deleteDoc
} from 'firebase/firestore'

export interface FirebaseMessage {
  id: string
  campaignId: string
  contactId: string
  sender: 'user' | 'ai'
  type: 'text' | 'audio'
  content: string
  timestamp: Timestamp | Date
  audioUrl?: string
  assets?: any[]
}

// Get messages for a specific contact in a campaign
export const getMessages = async (campaignId: string, contactId: string): Promise<FirebaseMessage[]> => {
  try {
    const messagesRef = collection(db, 'campaigns', campaignId, 'contacts', contactId, 'messages')
    const q = query(messagesRef, orderBy('timestamp', 'asc'))
    const snapshot = await getDocs(q)
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as FirebaseMessage[]
  } catch (error) {
    console.error('Error getting messages:', error)
    return []
  }
}

// Real-time listener for messages
export const subscribeToMessages = (
  campaignId: string, 
  contactId: string, 
  callback: (messages: FirebaseMessage[]) => void
) => {
  const messagesRef = collection(db, 'campaigns', campaignId, 'contacts', contactId, 'messages')
  const q = query(messagesRef, orderBy('timestamp', 'asc'))
  
  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as FirebaseMessage[]
    callback(messages)
  })
}

// Send a message
export const sendMessage = async (
  campaignId: string,
  contactId: string,
  message: Omit<FirebaseMessage, 'id' | 'timestamp'>
): Promise<string> => {
  try {
    const messagesRef = collection(db, 'campaigns', campaignId, 'contacts', contactId, 'messages')
    const docRef = await addDoc(messagesRef, {
      ...message,
      timestamp: serverTimestamp()
    })
    return docRef.id
  } catch (error) {
    console.error('Error sending message:', error)
    throw error
  }
}

// Initialize campaign messages for a contact (run once per contact)
export const initializeCampaignMessages = async (
  campaignId: string,
  contactId: string,
  campaignDetails: {
    title?: string
    previewText?: string
    audioUrls?: { voice?: string }
    assets?: any[]
  }
): Promise<void> => {
  try {
    // Check if already initialized
    const messagesRef = collection(db, 'campaigns', campaignId, 'contacts', contactId, 'messages')
    const snapshot = await getDocs(messagesRef)
    
    if (snapshot.size > 0) {
      console.log('Messages already initialized for this contact')
      return
    }

    // Add campaign messages
    const now = Date.now()
    
    if (campaignDetails.title) {
      await addDoc(messagesRef, {
        campaignId,
        contactId,
        sender: 'ai',
        type: 'text',
        content: campaignDetails.title,
        timestamp: new Date(now - 5000)
      })
    }

    if (campaignDetails.previewText) {
      await addDoc(messagesRef, {
        campaignId,
        contactId,
        sender: 'ai',
        type: 'text',
        content: campaignDetails.previewText,
        timestamp: new Date(now - 4000)
      })
    }

    if (campaignDetails.audioUrls?.voice) {
      await addDoc(messagesRef, {
        campaignId,
        contactId,
        sender: 'ai',
        type: 'audio',
        content: 'Voice message',
        audioUrl: campaignDetails.audioUrls.voice,
        timestamp: new Date(now - 3000)
      })
    }

    if (campaignDetails.assets?.length) {
      await addDoc(messagesRef, {
        campaignId,
        contactId,
        sender: 'ai',
        type: 'text',
        content: `📎 ${campaignDetails.assets.length} file(s)`,
        assets: campaignDetails.assets,
        timestamp: new Date(now - 2000)
      })
    }

    console.log('✅ Campaign messages initialized for contact:', contactId)
  } catch (error) {
    console.error('Error initializing campaign messages:', error)
    throw error
  }
}

// Delete a message
export const deleteMessage = async (
  campaignId: string,
  contactId: string,
  messageId: string
): Promise<void> => {
  try {
    const messageRef = doc(db, 'campaigns', campaignId, 'contacts', contactId, 'messages', messageId)
    await deleteDoc(messageRef)
    console.log('✅ Message deleted:', messageId)
  } catch (error) {
    console.error('Error deleting message:', error)
    throw error
  }
}