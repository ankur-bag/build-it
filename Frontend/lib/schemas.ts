import { Timestamp as ClientTimestamp } from "firebase/firestore";
import { Timestamp as AdminTimestamp } from "firebase-admin/firestore";

type TimestampType = ClientTimestamp | AdminTimestamp | any;

// Users Collection
export interface User {
  id: string;
  clerkId: string;
  email: string;
  name: string;
  avatar?: string;
  createdAt: TimestampType;
  updatedAt: TimestampType;
  onboardingCompleted: boolean;
  subscription?: {
    plan: "free" | "pro" | "enterprise";
    status: "active" | "inactive" | "cancelled";
    startDate: TimestampType;
    endDate?: TimestampType;
  };
}

// Onboarding Data
export interface OnboardingProfile {
  userId: string;
  businessType: "ecommerce" | "saas" | "local-service" | "creator" | "education" | "other";
  targetAudience: "b2c" | "b2b" | "both";
  brandStyle: ("professional" | "friendly" | "casual" | "energetic" | "premium")[];
  responsePreference: "short" | "balanced" | "detailed";
  language: "english" | "hindi";
  region: "india" | "global";
  complianceNotes: string;
  termsAccepted: boolean;
  createdAt: TimestampType;
  updatedAt: TimestampType;
}

// Campaigns Collection
export interface Campaign {
  id: string;
  userId: string;
  title: string;
  description: string;
  channels: ("Text" | "Voice" | "Calls")[];
  toneOfVoice?: "friendly" | "professional" | "energetic" | "formal" | "casual";
  wordLimit?: number;
  voiceDuration?: number;
  status: "draft" | "active" | "paused" | "completed" | "archived";
  contactCount: number;
  createdAt: TimestampType;
  updatedAt: TimestampType;
  scheduledAt?: TimestampType;
  completedAt?: TimestampType;
  metadata?: {
    aiApproved: boolean;
    complianceChecked: boolean;
  };
}

// Contacts Collection (nested under campaigns)
export interface Contact {
  id: string;
  campaignId: string;
  userId: string;
  name: string;
  phone?: string;
  email?: string;
  customFields?: Record<string, string>;
  status: "pending" | "sent" | "delivered" | "failed" | "bounced";
  messageCount?: number;
  createdAt: TimestampType;
  updatedAt: TimestampType;
}

// Conversations Collection
export interface Conversation {
  id: string;
  userId: string;
  campaignId?: string;
  participantPhone: string;
  participantName?: string;
  channel: "whatsapp" | "sms" | "voice" | "call";
  status: "active" | "closed" | "archived";
  lastMessage?: string;
  lastMessageAt?: TimestampType;
  messageCount: number;
  createdAt: TimestampType;
  updatedAt: TimestampType;
  metadata?: {
    source?: "inbound" | "outbound";
    tags?: string[];
  };
}

// Messages Collection (nested under conversations)
export interface Message {
  id: string;
  conversationId: string;
  campaignId?: string;
  userId: string;
  sender: "user" | "contact" | "ai";
  content: string;
  messageType: "text" | "image" | "audio" | "video" | "document";
  mediaUrl?: string;
  mediaMetadata?: {
    type: string;
    size: number;
    duration?: number;
  };
  status: "sent" | "delivered" | "read" | "failed";
  aiGenerated?: boolean;
  aiRunId?: string;
  createdAt: TimestampType;
  readAt?: TimestampType;
}

// AI Runs Collection
export interface AIRun {
  id: string;
  userId: string;
  campaignId?: string;
  conversationId?: string;
  type: "message_generation" | "intent_detection" | "sentiment_analysis" | "compliance_check";
  model: "gemini-2.5-flash" | "gemini-3-flash-preview" | string;
  input: {
    prompt?: string;
    context?: Record<string, any>;
    messageHistory?: Array<{ role: string; content: string }>;
  };
  output?: {
    text?: string;
    data?: Record<string, any>;
    tokens?: {
      input: number;
      output: number;
    };
  };
  status: "pending" | "completed" | "failed";
  error?: string;
  duration?: number;
  createdAt: TimestampType;
  completedAt?: TimestampType;
  costEstimate?: number;
}

// Media Collection
export interface Media {
  id: string;
  userId: string;
  campaignId?: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  storageUrl: string;
  storagePath: string;
  mediaType: "image" | "video" | "audio" | "document" | "csv";
  metadata?: {
    duration?: number;
    width?: number;
    height?: number;
    pages?: number;
  };
  usage?: {
    campaignCount: number;
    lastUsedAt?: TimestampType;
  };
  createdAt: TimestampType;
  updatedAt: TimestampType;
}

// Webhooks Collection
export interface Webhook {
  id: string;
  userId: string;
  event: "message.sent" | "message.delivered" | "campaign.completed" | "contact.status_changed";
  url: string;
  isActive: boolean;
  secret?: string;
  headers?: Record<string, string>;
  retryPolicy?: {
    maxRetries: number;
    retryInterval: number;
  };
  lastTriggeredAt?: TimestampType;
  failureCount?: number;
  createdAt: TimestampType;
  updatedAt: TimestampType;
}

// Constants for Firestore collections
export const COLLECTIONS = {
  USERS: "users",
  ONBOARDING: "onboarding",
  CAMPAIGNS: "campaigns",
  CONTACTS: "contacts",
  CONVERSATIONS: "conversations",
  MESSAGES: "messages",
  AI_RUNS: "ai_runs",
  MEDIA: "media",
  WEBHOOKS: "webhooks",
} as const;

// Type for all schema types
export type Schema =
  | User
  | OnboardingProfile
  | Campaign
  | Contact
  | Conversation
  | Message
  | AIRun
  | Media
  | Webhook;
