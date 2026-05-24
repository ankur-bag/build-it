<div align="center">
  
# OutreachX

**AI-powered multi-channel campaign automation platform**

Launch, manage, and analyze outreach campaigns across WhatsApp, Voice, and AI Phone Calls — all from a single interface.

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org)
[![Firebase](https://img.shields.io/badge/Firebase-Firestore-orange?logo=firebase)](https://firebase.google.com)
[![Clerk](https://img.shields.io/badge/Auth-Clerk-purple?logo=clerk)](https://clerk.com)
[![Gemini](https://img.shields.io/badge/AI-Gemini_2.5_Flash-4285F4?logo=google)](https://deepmind.google/technologies/gemini)

</div>

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Campaign Creation Flow](#campaign-creation-flow)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Environment Variables](#environment-variables)
  - [Running Locally](#running-locally)
- [API Reference](#api-reference)
- [Key Workflows](#key-workflows)

---

## What is RevAgent?

**RevAgent** is your all-in-one AI partner for automated customer outreach. It simplifies how businesses connect with their audience by combining the power of advanced AI with popular communication channels like **WhatsApp**, **Voice Notes**, and **AI Phone Calls**.

Think of RevAgent as a tireless digital employee that can launch hundreds of personalized conversations at once, answer customer questions accurately using your own documents, and provide you with instant insights—all without you lifting a finger after the initial setup.

### How it helps you:
- **Reach more people, faster**: Launch campaigns across multiple channels with just a few clicks.
- **AI that actually talks**: Our AI doesn't just send static texts; it holds natural conversations and voice calls that feel human.
- **Knowledge at its fingertips**: Upload your product PDFs or guides, and RevAgent will use that information to answer customer queries perfectly.
- **Smart Inbox**: Manage all your WhatsApp replies in one place, with AI helping you respond to every message automatically.
- **Real Results**: Watch your engagement grow with easy-to-read charts that show exactly how many people answered or replied.

---

## Features

### Campaign Builder
- 6-step wizard: Title → Channels → Assets → Description → Contacts → Preview & Launch
- Multi-channel selection: Text (WhatsApp/SMS), Voice Message, AI Phone Calls
- Per-channel configuration (word limits, duration, tone of voice)
- Live preview before launch

### AI Content Generation
- **Description enhancement** — Gemini refines your campaign copy in your chosen tone
- **Text-to-Speech** — Gemini TTS converts descriptions to voice notes (OGG/Opus for WhatsApp)
- **Image generation** — Prompt-based image creation via Pixazo API
- **RAG (Retrieval-Augmented Generation)** — Upload PDFs; AI references them when responding to contacts

### WhatsApp Integration
- Bulk WhatsApp campaign sending (title + description + assets + voice note)
- Inbound message webhook handling
- AI auto-replies using campaign context + PDF knowledge base + chat history
- Conversation inbox with per-contact thread view

### AI Phone Calls (VAPI)
- Outbound AI calls to all campaign contacts
- Natural multi-turn conversations with campaign-aware AI agent
- Call status tracking (answered / missed)
- Real-time transcription and recording

### Analytics Dashboard
- Voice call metrics: total, answered, missed, answer rate
- WhatsApp metrics: messages sent, users interacted, engagement score
- Donut & bar charts via Recharts
- Per-conversation breakdown

### Onboarding
- Business context profile (type, audience, brand style, language, compliance notes)
- Persisted to Firestore; used by AI across all campaigns

---

## Tech Stack

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| Next.js | 16.1 | React framework, App Router, SSR |
| React | 19.2 | UI library |
| TypeScript | 5.0 | Type safety |
| Tailwind CSS | 4.0 | Utility-first styling |
| Framer Motion | 12.0 | High-fidelity animations |
| Recharts | 3.6 | Analytics charts |
| SWR | 2.3 | Data fetching & caching |
| Clerk | 6.0 | Authentication & user management |

### Backend
| Technology | Version | Purpose |
|---|---|---|
| Node.js | 18+ | Runtime |
| Express | 4.18 | HTTP server |
| Firebase Admin | 12.7 | Backend database access |
| nodemon | 3.1 | Dev auto-reload |

### AI & ML
| Service | Purpose |
|---|---|
| Google Gemini 2.5 Flash | Primary LLM for text generation, AI responses, and TTS |
| OpenAI GPT-4o-mini | Agent orchestration and complex decision making in LangGraph |
| LangChain + LangGraph | Agentic workflow orchestration and RAG pipelines |
| Sarvam AI | Specialized Indian language Text-to-Speech (TTS) |
| Stability AI / Pixazo | AI image generation for campaign assets |
| VAPI.ai | AI phone call orchestration and voice synthesis |
| Bolna AI | Voice agent orchestration |

### Infrastructure & Services
| Service | Purpose |
|---|---|
| Firebase / Firestore | Primary database, real-time sync, and analytics persistence |
| Clerk | Authentication & user management |
| Cloudinary | Asset storage (Images, Videos) and Raw file storage (Contacts CSV/Excel) |
| Twilio | SMS, SIP voice infrastructure, and phone number provisioning |
| WhatsApp Business API | Enterprise-grade WhatsApp messaging |
| LiveKit | Real-time voice streaming and WebRTC infrastructure |
| FFmpeg | Audio conversion (WAV/MP3 → OGG/Opus for WhatsApp) |

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js)                    │
│                                                         │
│  App Routes          API Routes          Lib            │
│  /campaign/*    ←→  /api/campaigns/*  ←→  ai-service   │
│  /yourcampaigns     /api/inbox/*          langchain     │
│  /analytics/*       /api/voice/*          vapi-caller  │
│  /inbox/*           /api/onboarding       agent-graph   │
│  /onboarding        /api/parse (CSV)      vector-store  │
│  /contacts          /api/sarvam (TTS)     firestore-ops │
└───────────────────────────┬─────────────────────────────┘
                            │ HTTP
┌───────────────────────────▼─────────────────────────────┐
│                  BACKEND (Express)                       │
│                                                         │
│  /api/whatsapp/send-campaign  → WhatsApp Cloud API      │
│  /api/whatsapp/send-reply     → Gemini AI → WhatsApp    │
│  conversation-service.js      → LangChain + Gemini      │
│  webhook-diagnostic.js        → Request logging         │
└───────────────────────────┬─────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────┐
│                  EXTERNAL SERVICES                       │
│                                                         │
│  Firestore  │  Clerk  │  Gemini  │  VAPI  │  Bolna       │
│  Cloudinary │  Twilio │  OpenAI  │  Sarvam │  Stability   │
│  LiveKit    │  FFmpeg │  Recharts│  WhatsApp API         │
└─────────────────────────────────────────────────────────┘
```

---

## Campaign Creation Flow

```
Step 1 — Title
  Enter campaign name → auto-save draft to Firestore

Step 2 — Channels
  Select: ☑ Text  ☑ Voice  ☑ AI Calls
  Configure word limits, duration, tone

Step 3 — Assets
  Upload images/videos  OR  generate via AI (Pixazo)
  → stored in Cloudinary

Step 4 — Description
  Write copy → AI enhances it (Gemini) based on tone

Step 5 — Contacts
  Upload CSV / Excel → auto-parse name + phone
  Phone numbers normalized to international format

Step 6 — Preview & Launch
  ├─ Voice channel  → Gemini TTS → FFmpeg (OGG) → Cloudinary
  ├─ Text channel   → Backend sends WhatsApp messages to all contacts
  └─ Calls channel  → VAPI initiates outbound AI calls to all contacts
```

---

## Project Structure

```
Solution Challenge/
├── Frontend/                    # Next.js application
│   ├── app/
│   │   ├── page.tsx             # Landing page
│   │   ├── campaign/            # 6-step campaign wizard
│   │   ├── yourcampaigns/       # Campaign management dashboard
│   │   │   └── [campaignId]/
│   │   │       └── analytics/   # Campaign analytics dashboard
│   │   ├── inbox/               # WhatsApp conversation inbox
│   │   ├── onboarding/          # Business context setup
│   │   └── api/                 # Next.js API routes
│   │       ├── campaigns/       # Campaign CRUD, TTS, contacts, docs
│   │       ├── inbox/           # Inbox & message tracking
│   │       ├── voice/           # LiveKit token, call status
│   │       ├── vapi/            # VAPI webhook
│   │       ├── sarvam/          # Sarvam AI TTS integration
│   │       ├── parse/           # CSV/Excel contact parsing
│   │       ├── upload/          # Cloudinary raw file upload
│   │       ├── messages/        # Message history & sending
│   │       ├── onboarding/      # Onboarding data
│   │       └── yourcampaigns/   # List user campaigns
│   ├── components/
│   │   ├── Navbar.tsx
│   │   ├── Footer.tsx
│   │   ├── Features.tsx
│   │   ├── HeroVideo.tsx
│   │   ├── Cards.tsx
│   │   ├── Onboarding/          # Onboarding multi-step form
│   │   └── ui/                  # Shared UI components
│   └── lib/
│       ├── ai-service.ts        # AI text generation & refinement
│       ├── whatsapp-ai-service.ts # WhatsApp-specific AI responses
│       ├── campaign-langchain.ts # LangChain campaign context
│       ├── agent-graph.ts       # LangGraph agent orchestration (GPT-4o-mini)
│       ├── vapi-caller.ts       # VAPI API wrapper
│       ├── call-agent.ts        # VAPI call orchestration
│       ├── sarvam-tts.ts        # Sarvam AI TTS client
│       ├── twilio-client.ts     # Twilio SDK
│       ├── cloudinary.ts        # Cloudinary client
│       ├── vector-store.ts      # Document embeddings & search
│       ├── pdf-extraction.ts    # PDF text extraction
│       ├── firestore-ops.ts     # Generic Firestore CRUD
│       ├── analysis-ops.ts      # Analytics data operations
│       ├── inbox-operations.ts  # Inbox CRUD
│       └── types.ts             # Shared TypeScript types
│
└── Backend/                     # Node.js / Express server
    └── src/
        ├── index.js             # Express entry point (port 3001)
        ├── routes/
        │   └── whatsapp.js      # WhatsApp send & webhook routes
        ├── conversation-service.js # Incoming message AI handler
        ├── analysis-service.js  # Analytics persistence
        ├── webhook-diagnostic.js # Request & payload logging
        └── campaign-selector.js # Map contact phone → campaign
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Firebase project (Firestore enabled)
- Clerk account
- Google AI Studio API key (Gemini)
- WhatsApp Business Cloud API credentials
- Cloudinary account
- VAPI account (for AI calls)
- Twilio account (for SMS/SIP voice)

### Environment Variables

#### `Frontend/.env`

```env
# ── Firebase (Admin SDK) ──────────────────────────────────────
FIREBASE_PROJECT_ID=
FIREBASE_PRIVATE_KEY_ID=
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
FIREBASE_CLIENT_EMAIL=
FIREBASE_STORAGE_BUCKET=

# ── Firebase (Client SDK) ─────────────────────────────────────
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=

# ── Clerk ─────────────────────────────────────────────────────
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

# ── AI (Gemini & Others) ──────────────────────────────────────
GEMINI_API_KEY=
GEMINI_TTS_API_KEY=
GEMINI_WHATSAPP_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
STABILITY_AI_KEY=
SARVAM_API_KEY=
BOLNA_API_KEY=

# ── AI (OpenAI) ───────────────────────────────────────────────
OPENAI_API_KEY=
OPEN_AI_CALLING=

# ── Cloudinary ────────────────────────────────────────────────
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# ── Twilio ────────────────────────────────────────────────────
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
LIVEKIT_SIP_TRUNK_ID=

# ── VAPI (AI Calls) ───────────────────────────────────────────
VAPI_API_KEY=
VAPI_NUMBER_ID=
VAPI_ASSISTANT_ID=

# ── LiveKit ───────────────────────────────────────────────────
LIVEKIT_URL=
LIVEKIT_API_KEY=
LIVEKIT_API_SECRET=

# ── WhatsApp Business API ─────────────────────────────────────
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_ACCESS_TOKEN=

# ── URLs ──────────────────────────────────────────────────────
NEXT_PUBLIC_APP_URL=http://localhost:3000
BACKEND_URL=https://double-slash-backend.onrender.com
```

#### `Backend/.env`

```env
FIREBASE_PROJECT_ID=
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
FIREBASE_CLIENT_EMAIL=

WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_ACCESS_TOKEN=
GEMINI_WHATSAPP_API_KEY=

PORT=3001
FRONTEND_URL=http://localhost:3000
```

### Running Locally

**1. Clone the repository**
```bash
git clone <repo-url>
cd Solution Challenge-4.0
```

**2. Start the Frontend**
```bash
cd Frontend
npm install
npm run dev
# Runs on http://localhost:3000
```

**3. Start the Backend**
```bash
cd Backend
npm install
npm run dev
# Runs on http://localhost:3001
```

---

## API Reference

### Campaign Routes

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/campaigns` | Create a new campaign |
| `POST` | `/api/campaigns/draft` | Create or update a draft |
| `GET` | `/api/campaigns/[id]` | Get campaign details |
| `DELETE` | `/api/campaigns/[id]/delete` | Delete a campaign |
| `GET` | `/api/yourcampaigns` | List all user campaigns |

### Content & Assets

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/campaigns/[id]/description` | AI-enhance campaign description |
| `POST` | `/api/campaigns/[id]/tts` | Generate voice note (Gemini TTS → OGG) |
| `POST` | `/api/campaigns/[id]/files` | Upload images/videos to Cloudinary |
| `POST` | `/api/campaigns/[id]/generate-image` | AI image generation (Pixazo) |
| `POST` | `/api/campaigns/[id]/contacts` | Upload & parse contacts CSV/Excel |
| `POST` | `/api/campaigns/[id]/docs` | Upload PDF knowledge base |
| `GET` | `/api/campaigns/[id]/docs` | List campaign documents |

### Communication

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/campaigns/[id]/make-calls` | Launch outbound AI calls via VAPI |
| `GET` | `/api/voice/token` | Generate LiveKit voice token |
| `POST` | `/api/voice/status` | Update voice call status |

### Analytics & Inbox

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/campaigns/[id]/analytics` | Fetch campaign analytics |
| `POST` | `/api/campaigns/[id]/analysis/whatsapp` | Track a WhatsApp message |
| `GET` | `/api/inbox` | List all launched campaigns (inbox) |
| `GET` | `/api/inbox/message` | Fetch messages for a contact |
| `POST` | `/api/inbox/message` | Send or receive a message |

### Onboarding

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/onboarding` | Save onboarding profile |
| `GET` | `/api/onboarding` | Get user's onboarding profile |

---

## Key Workflows

### WhatsApp Campaign Send
1. User clicks **Launch** on the preview page
2. Frontend calls the Backend (`POST /api/whatsapp/send-campaign`)
3. Backend iterates over all contacts and sends sequentially:
   - Campaign title (text)
   - Campaign description (text)
   - Assets (images / PDFs)
   - Voice note (OGG audio) — if Voice channel enabled
4. Each sent message is tracked in Firestore analytics

### AI WhatsApp Reply (Inbox)
1. Contact replies to the business WhatsApp number
2. Backend webhook receives the message
3. `conversation-service.js` loads:
   - Campaign context (description, documents)
   - Chat history (last 20 messages)
   - RAG context from PDF embeddings
4. LangChain + Gemini 2.5 Flash generates a reply
5. Response is sent back via WhatsApp Cloud API
6. Message + reply logged to Firestore

### AI Phone Calls (VAPI)
1. User enables **Calls** channel and clicks Launch
2. `callAgent()` builds a campaign-aware system prompt
3. VAPI initiates outbound calls to each contact
4. AI agent handles natural multi-turn conversations
5. Webhooks update call status (answered / missed) in real time

### Voice Note Generation
1. Campaign description is sent to Gemini TTS API
2. Audio is returned as base64 (WAV/MP3)
3. FFmpeg converts it to **OGG/Opus** (required by WhatsApp)
4. Uploaded to Cloudinary; URL stored in campaign
5. Sent as a WhatsApp voice message on launch
---

## RAG (Retrieval-Augmented Generation) Implementation

RevAgent includes a **complete RAG pipeline** that enables AI to answer customer questions using your uploaded documents. This transforms your PDFs, guides, and knowledge bases into a searchable intelligence layer for all AI responses.

### How RAG Works in RevAgent

**RAG** combines information retrieval with generative AI:
1. **Retrieve** — Search uploaded documents for relevant context
2. **Augment** — Combine retrieved context with campaign info
3. **Generate** — Use LLM to answer with grounded, accurate responses

### Document Upload & Processing

**Endpoint:** `POST /api/campaigns/[campaignId]/docs`

When you upload a PDF to a campaign:

```
Upload PDF
    ↓
Extract Text (pdf-extraction.ts)
    ↓
Split into Chunks (vector-chunking.ts, 500 chars per chunk)
    ↓
Generate Embeddings (Gemini Embedding 2)
    ↓
Store in Pinecone Vector DB
    ↓
Save Metadata in Firestore
```

**Key Files:**
- [Frontend/app/api/campaigns/[campaignId]/docs/route.ts](Frontend/app/api/campaigns/[campaignId]/docs/route.ts) — Upload endpoint
- [Frontend/lib/pdf-extraction.ts](Frontend/lib/pdf-extraction.ts) — PDF text extraction
- [Frontend/lib/vector-chunking.ts](Frontend/lib/vector-chunking.ts) — Smart text chunking

### Vector Storage Architecture

RevAgent uses a **hybrid vector storage** approach:

#### Primary: Pinecone (Production-Ready)
```
Pinecone Index
├── Namespace: project_{campaignId}
│   ├── Vector IDs: {documentKey}_{chunkIndex}
│   ├── Embeddings: 768-dimensional (Gemini)
│   ├── Metadata: userId, campaignId, documentKey, fileName, chunkIndex
│   └── Count: Up to millions of chunks
└── Metadata stored in Firestore
```

**Files:**
- [Frontend/lib/pinecone.ts](Frontend/lib/pinecone.ts) — Pinecone client initialization
- [Frontend/lib/pinecone-service.ts](Frontend/lib/pinecone-service.ts) — Low-level vector operations (upsert, delete)
- [Frontend/lib/pinecone-vector-store.ts](Frontend/lib/pinecone-vector-store.ts) — High-level document management
- [Frontend/lib/pinecone-embeddings.ts](Frontend/lib/pinecone-embeddings.ts) — Gemini embedding generation

#### Secondary: Firestore (Metadata & Fallback)
```
Firestore Structure
users/{userId}
├── vectoruser (collection tracking)
└── projects/{campaignId}
    ├── documents (metadata: fileName, chunkCount, createdAt)
    └── chunks (fallback vectors + similarity search)
```

**Files:**
- [Frontend/lib/vectoruser-store.ts](Frontend/lib/vectoruser-store.ts) — Project & document metadata

### Embedding Generation

RevAgent uses **Google Gemini Embedding 2** for semantic understanding:

```typescript
// Each document chunk is converted to a 768-dimensional vector
const embedding = await embedText(chunkText);

// Example: "What is your pricing?" → 768 dimensions
// Example: "Tell me about pricing plans" → Similar direction in vector space
```

**Why Gemini?**
- ✅ Multilingual support (required for Indian languages)
- ✅ Semantic understanding aligned with Gemini 2.5 Flash LLM
- ✅ Low latency, production-ready
- ✅ Covers 2048 tokens per chunk (vs. OpenAI's 1536)

**File:** [Frontend/lib/pinecone-embeddings.ts](Frontend/lib/pinecone-embeddings.ts)

### Semantic Search & Retrieval

When a user asks a question, RevAgent searches for the most relevant document chunks:

```
User Query
    ↓
Convert to Embedding (Gemini)
    ↓
Search Pinecone (Top 3 matches)
    ↓
Calculate Cosine Similarity
    ↓
Return Ranked Chunks
```

**Search Function:**
```typescript
// Search implementation in agent-graph.ts
async function retrieveRAGContext(state) {
  const query = "What is your shipping policy?";
  const chunks = await searchChunks(campaignId, userId, query, 3);
  // Returns: ["Shipping within 2-3 business days...", "Free for orders over..."]
}
```

**Files:**
- [Frontend/lib/agent-graph.ts](Frontend/lib/agent-graph.ts#L17-L35) — RAG retrieval node
- [Frontend/lib/vector-store.ts](Frontend/lib/vector-store.ts#L100) — Firestore-based search

### LangGraph Agent Orchestration

RAG is integrated into a **LangGraph state machine** that orchestrates the entire AI response pipeline:

```
┌─────────────────────────────────────────┐
│  User Query (WhatsApp, Phone Call)      │
└────────────┬────────────────────────────┘
             │
             ▼
    ┌──────────────────┐
    │  Retrieve Node   │  ← RAG: Search PDFs for context
    │ retrieveRAGContext
    └────────┬─────────┘
             │
             ▼
    ┌──────────────────┐
    │  Response Node   │  ← LLM: Generate answer with context
    │   callModel      │     (Gemini 2.5 Flash or GPT-4o-mini)
    └────────┬─────────┘
             │
             ▼
    ┌──────────────────┐
    │  Final Response  │
    │ (Back to user)   │
    └──────────────────┘
```

**Agent Flow:**
1. **State:** Holds messages, campaignId, userId, campaignInfo, retrievedContext
2. **Retrieve Node:** Searches Pinecone for relevant chunks
3. **Respond Node:** LLM generates grounded response
4. **Output:** Rich, context-aware answer

**File:** [Frontend/lib/agent-graph.ts](Frontend/lib/agent-graph.ts) (45 lines)

### Integration: WhatsApp AI Replies

When a contact replies to your WhatsApp campaign:

```
Webhook: POST /api/whatsapp/webhook
    ↓
Backend loads:
├─ Campaign title & description
├─ Document knowledge base (RAG)
└─ Chat history (last 20 messages)
    ↓
Gemini generates reply using ALL context
    ↓
Response sent back to contact
```

**Example:**
- Contact: *"Do you offer bulk discounts?"*
- RAG retrieves: `"Volume discounts: 10-20% off for orders over $500"`
- Response: *"Yes! We offer 10-20% discounts for orders over $500. Would you like more details?"*

**Files:**
- Backend: [Backend/src/conversation-service.js](Backend/src/conversation-service.js#L387) — Generates AI replies with RAG context
- Frontend: [Frontend/lib/campaign-langchain.ts](Frontend/lib/campaign-langchain.ts) — Alternative pipeline

### Integration: AI Phone Calls (VAPI)

During an outbound AI call, the agent has access to your documents:

```
VAPI Initiates Call
    ↓
System Prompt includes:
├─ Campaign title & description
├─ Document excerpts (RAG pre-fetched)
└─ Ordered questions/conversation flow
    ↓
Agent answers naturally using all context
    ↓
Conversation recorded & analytics updated
```

**Example:**
- AI: *"Hello! I'm calling about our new product launch."*
- Caller: *"What's the pricing?"*
- AI searches RAG → *"Pricing starts at $99/month..."*

**File:** [Frontend/lib/call-agent.ts](Frontend/lib/call-agent.ts#L149-L155) — Integrates docs into VAPI calls

### Document Lifecycle

```
Upload (POST /docs)
    ↓
    ├─ Store in Cloudinary (original PDF)
    ├─ Extract text
    ├─ Chunk text (500 char chunks)
    ├─ Generate embeddings
    ├─ Upsert to Pinecone
    └─ Log metadata in Firestore
    ↓
Update (Replace document)
    ├─ Delete old vectors from Pinecone
    ├─ Delete old metadata from Firestore
    └─ Repeat upload flow
    ↓
Delete (DELETE /docs/{documentKey})
    ├─ Remove vectors from Pinecone
    └─ Remove metadata from Firestore
```

**Files:**
- Upload: [Frontend/app/api/campaigns/[campaignId]/docs/route.ts](Frontend/app/api/campaigns/[campaignId]/docs/route.ts) — POST handler
- List: [Frontend/app/api/campaigns/[campaignId]/docs/route.ts](Frontend/app/api/campaigns/[campaignId]/docs/route.ts) — GET handler
- Delete: [Frontend/app/api/campaigns/[campaignId]/docs/route.ts](Frontend/app/api/campaigns/[campaignId]/docs/route.ts) — DELETE handler

### Environment Variables Required

```env
# ── Vector Database (Pinecone) ────────────────────────────
PINECONE_API_KEY=your-pinecone-api-key
PINECONE_INDEX_NAME=revagent-embeddings

# ── Embeddings (Gemini) ───────────────────────────────────
GEMINI_API_KEY=your-gemini-api-key  # Also used for embeddings

# ── AI Responses (LLM) ────────────────────────────────────
GEMINI_WHATSAPP_API_KEY=your-gemini-key
OPENAI_API_KEY=your-openai-key  # For LangGraph orchestration
```

### RAG Performance Characteristics

| Metric | Value | Notes |
|--------|-------|-------|
| Chunk Size | 500 chars | Balanced for semantic coherence |
| Chunk Overlap | 100 chars | Prevents context loss at boundaries |
| Top Results | 3 chunks | Usually sufficient for Q&A |
| Embedding Model | Gemini 2 | 768 dimensions |
| Vector DB Latency | <100ms | Pinecone SLA |
| Search Cost | ~0.0001 USD | Per 10K queries |

### Limitations & Future Improvements

**Current Limitations:**
- Single-language embeddings (Gemini 2 is multilingual, but search is English-optimized)
- Max 20MB per PDF (Cloudinary limit)
- 1-3 second retrieval latency during peak
- No automatic re-chunking on document updates

**Future Roadmap:**
- [ ] Hybrid search (keyword + semantic)
- [ ] Multi-modal embeddings (images in PDFs)
- [ ] Real-time document indexing via webhooks
- [ ] Query expansion & reranking (cross-encoder)
- [ ] Document clustering for better relevance
- [ ] Caching of frequently retrieved chunks

---

## Conclusion: Problems Solved by RevAgent

RevAgent isn't just a communication tool; it's a solution to several critical bottlenecks in modern business outreach:

### 1. Breaking the Language Barrier (**Multilingual Support**)
Outreach often fails when businesses can't speak the local language of their customers. By integrating **Sarvam AI** and **Gemini**, RevAgent enables seamless communication in multiple regional languages (like Hindi, Bengali, etc.) through both text and voice, ensuring your message is understood by everyone.

### 2. Eliminating Manual Outreach (**WhatsApp Automation**)
Manually sending WhatsApp messages to hundreds of contacts is slow and prone to errors. RevAgent automates the entire process—from initial campaign launch to handling inbound replies—saving hours of manual labor while maintaining a personal touch through AI-driven responses.

### 3. Automated Data Intelligence (**Database Integration**)
One of the biggest challenges in outreach is keeping track of interactions. RevAgent automatically syncs every message, call status, and customer engagement directly into **Firestore**. This means your database is always up-to-date with real-time data, allowing for better lead tracking and analytics without any manual data entry.

### 4. Knowledge Accessibility
Customers often have specific questions that generic bots can't answer. RevAgent solves this by allowing businesses to upload their own PDFs. The AI instantly learns from these documents, providing accurate, business-specific answers to any customer query on the fly.

By solving these core issues, RevAgent empowers businesses to scale their outreach effortlessly while building stronger, more localized connections with their customers.
---

---


