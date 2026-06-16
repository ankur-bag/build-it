

<div align="center">
  
# OutreachX

**AI-powered multi-channel campaign automation platform**

Launch, manage, and analyze outreach campaigns across WhatsApp, Voice, and AI Phone Calls — all from a single interface.

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org)
[![Firebase](https://img.shields.io/badge/Firebase-Firestore-orange?logo=firebase)](https://firebase.google.com)
[![Clerk](https://img.shields.io/badge/Auth-Clerk-purple?logo=clerk)](https://clerk.com)
[![Gemini](https://img.shields.io/badge/AI-Gemini_2.5_Flash-4285F4?logo=google)](https://deepmind.google/technologies/gemini)
[![Pinecone](https://img.shields.io/badge/VectorDB-Pinecone-blue?logo=pinecone)](https://www.pinecone.io)
[![Razorpay](https://img.shields.io/badge/Payments-Razorpay-blue)](https://razorpay.com)

**Live Production URL:** [https://buildit-outreachx-1047516654251.europe-west1.run.app/](https://buildit-outreachx-1047516654251.europe-west1.run.app/)

[![OutreachX Demo Video](https://img.youtube.com/vi/qhHkM_AOVKc/0.jpg)](https://www.youtube.com/watch?v=qhHkM_AOVKc)

</div>

---

> [!WARNING]
> **Notice:** WhatsApp messaging and outbound phone calls will not work for external/unverified users, as this project is currently configured with a trial Twilio account and a free Meta Business API sandbox account.
> 
> For testing, only verified recipient numbers registered in our Meta/Twilio sandbox environments will receive messages or calls.

## Table of Contents

- [Overview](#overview)
- [Core Features](#core-features)
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
  - [Virtual Prepaid Wallet & Pay-As-You-Go Billing](#1-virtual-prepaid-wallet--pay-as-you-go-billing)
  - [RAG Feedback Loop & Smart Data Injection](#2-rag-feedback-loop--smart-data-injection-organizer-answers)
  - [Cross-Channel Voice-to-WhatsApp Dispatch](#3-cross-channel-voice-to-whatsapp-dispatch)
  - [Multilingual Voice Synthesis & Script Detection](#4-multilingual-voice-synthesis--script-detection)
- [RAG (Retrieval-Augmented Generation) Implementation](#rag-retrieval-augmented-generation-implementation)

---

## What is OutreachX?

**OutreachX** is your all-in-one AI partner for automated customer outreach. It simplifies how businesses connect with their audience by combining the power of advanced AI with popular communication channels like **WhatsApp**, **Voice Notes**, and **AI Phone Calls**.

Think of OutreachX as a tireless digital employee that can launch hundreds of personalized conversations at once, answer customer questions accurately using your own documents, and provide you with instant insights—all without you lifting a finger after the initial setup.

### How it helps you:
- **Reach more people, faster**: Launch campaigns across multiple channels with just a few clicks.
- **AI that actually talks**: Our AI doesn't just send static texts; it holds natural conversations and voice calls that feel human.
- **Knowledge at its fingertips**: Upload your product PDFs or guides, and OutreachX will use that information to answer customer queries perfectly.
- **Smart Inbox**: Manage all your WhatsApp replies in one place, with AI helping you respond to every message automatically.
- **Real Results**: Watch your engagement grow with easy-to-read charts that show exactly how many people answered or replied.

---

## Core Features

### Campaign Builder
- **7-step wizard**: Title → Description → Channels → Assets → Docs → Contacts → Preview & Launch
- Multi-channel selection: Text (WhatsApp/SMS), Voice Message, AI Phone Calls
- Per-channel configuration (word limits, duration, tone of voice)
- Live cost estimation and preview before launch

### Prepaid Wallet & Pay-As-You-Go Billing
- **Razorpay Integration**: Instantly fund a virtual campaign wallet.
- **Budget Guards**: `LaunchGuard` and `PaymentGuard` prevent campaign runs or automated phone calls if the user's prepaid balance is insufficient.
- **Granular Pricing Rules**: Charges calculated per contact (WhatsApp: ₹6, Voice Note: ₹9, AI Call: ₹15).

### AI Content Generation & Synthesis
- **Description enhancement** — Gemini refines your campaign copy in your chosen tone.
- **Multilingual Text-to-Speech (TTS)** — Sarvam AI integration supporting 10 Indian languages with human precision.
- **Image generation** — Prompt-based image creation via Pixazo API.
- **RAG (Retrieval-Augmented Generation)** — Upload PDFs; AI references them when responding to contacts.

### Smart Data Injection (RAG Feedback Loop)
- **Retriever Confidence Routing**: Questions the RAG system cannot confidently answer are automatically flagged and routed to the Analytics Dashboard.
- **Organizer Answers**: Campaign owners can answer these unanswered questions in the UI, which instantly vectorizes and injects the new answers back into Pinecone, closing knowledge gaps dynamically over time.

### WhatsApp Integration
- Bulk WhatsApp campaign sending (title + description + assets + voice note)
- Inbound message webhook handling
- AI auto-replies using campaign context + PDF knowledge base + chat history
- Conversation inbox with per-contact thread view and legacy migration utilities

### Agentic Phone Calls (VAPI)
- Outbound AI calls to all campaign contacts
- Natural multi-turn conversations with campaign-aware AI agent
- Call status tracking (answered / missed)
- Real-time transcription, recording, and cross-channel message dispatch triggers

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
| Sarvam AI | Specialized Indian language Text-to-Speech (TTS) (10 languages) & STT |
| Pinecone | High-performance production-ready vector store for RAG namespaces |
| Stability AI / Pixazo | AI image generation for campaign assets |
| VAPI.ai | AI phone call orchestration and voice synthesis |
| Bolna AI | Voice agent orchestration |

### Infrastructure & Services
| Service | Purpose |
|---|---|
| Firebase / Firestore | Primary database, real-time sync, and analytics persistence |
| Clerk | Authentication & user management |
| Cloudinary | Asset storage (Images, Videos) and Raw file storage (Contacts CSV/Excel) |
| Razorpay | Prepaid payment gateway and virtual wallet funding |
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
│  /wallet            /api/payment          payment-lib   │
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
│  LiveKit    │  FFmpeg │  Recharts│  Razorpay│  Pinecone    │
│  WhatsApp Cloud API                                     │
└─────────────────────────────────────────────────────────┘
```

---

## Campaign Creation Flow

```
Step 1 — Title
  Enter campaign name → auto-save draft to Firestore

Step 2 — Description
  Write copy → AI enhances it (Gemini) based on preferred brand tone

Step 3 — Channels
  Select: ☑ Text (WhatsApp)  ☑ Voice Note  ☑ AI Calls (VAPI)
  Configure word limits, call duration, target language, and voice styles

Step 4 — Assets
  Upload custom images/videos OR generate assets via AI (Pixazo) → stored in Cloudinary

Step 5 — Docs (Knowledge Base)
  Upload PDF manuals or guides → parsed, chunked, and embedded into Pinecone Vector DB

Step 6 — Contacts
  Upload CSV / Excel → auto-parse name + phone. Contacts normalized to international format

Step 7 — Preview & Launch
  ├─ Budget calculation based on selected channels & contact size
  ├─ LaunchGuard wallet verification (Razorpay prepaid balance check)
  ├─ Voice Note Synthesis: Gemini/Sarvam TTS → FFmpeg (OGG) → Cloudinary
  ├─ Text Launch: Backend dispatches WhatsApp templates & media to all contacts
  └─ Call Launch: VAPI initiates outbound custom-voice calls to contacts
```

---

## Project Structure

```
Solution Challenge/
├── Frontend/                    # Next.js application
│   ├── app/
│   │   ├── page.tsx             # Landing page
│   │   ├── campaign/            # 7-step campaign wizard
│   │   ├── yourcampaigns/       # Campaign management dashboard
│   │   │   └── [campaignId]/
│   │   │       └── analytics/   # Analytics dashboard (Organizer Answers & charts)
│   │   ├── inbox/               # WhatsApp conversation inbox
│   │   ├── onboarding/          # Business context setup
│   │   └── api/                 # Next.js API routes
│   │       ├── campaigns/       # Campaign CRUD, TTS, contacts, docs
│   │       ├── inbox/           # Inbox, message tracking, /migrate & /chat-summary
│   │       ├── voice/           # LiveKit token, call status
│   │       ├── vapi/            # VAPI webhook & dispatch triggers
│   │       ├── sarvam/          # Sarvam AI TTS integration
│   │       ├── parse/           # CSV/Excel contact parsing
│   │       ├── upload/          # Cloudinary raw file upload
│   │       ├── messages/        # Message history & sending
│   │       └── onboarding/      # Onboarding data
│   ├── components/
│   │   ├── Navbar.tsx
│   │   ├── Footer.tsx
│   │   ├── Features.tsx
│   │   ├── Cards.tsx
│   │   ├── Onboarding/          # Onboarding form steps
│   │   ├── payment/             # WalletModal, WalletButton, LaunchGuard, PaymentGuard
│   │   └── ui/                  # Shared UI components
│   └── lib/
│       ├── ai-service.ts        # AI text generation & refinement
│       ├── whatsapp-ai-service.ts # WhatsApp-specific AI responses
│       ├── campaign-langchain.ts # LangChain campaign context
│       ├── agent-graph.ts       # LangGraph agent orchestration (GPT-4o-mini)
│       ├── vapi-caller.ts       # VAPI API wrapper
│       ├── call-agent.ts        # VAPI call orchestration
│       ├── sarvam-tts.ts        # Sarvam AI TTS client
│       ├── sarvam-helper.ts     # Multilingual voice tuning & language detection
│       ├── twilio-client.ts     # Twilio SDK
│       ├── cloudinary.ts        # Cloudinary client
│       ├── vector-store.ts      # Document embeddings & search
│       ├── pinecone-service.ts  # Low-level vector operations
│       ├── pinecone-vector-store.ts # High-level Pinecone document management
│       ├── pdf-extraction.ts    # PDF text extraction
│       ├── firestore-ops.ts     # Generic Firestore CRUD
│       ├── payment/             # walletService, firestorePayment
│       └── types.ts             # Shared TypeScript types
│
└── Backend/                     # Node.js / Express server
    └── src/
        ├── index.js             # Express entry point (port 3001)
        ├── routes/
        │   └── whatsapp.js      # WhatsApp send, send-reply & webhook routes
        ├── conversation-service.js # Incoming WhatsApp message RAG handler
        ├── whatsapp-conversation.js # WhatsApp-specific conversation logic
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
- Pinecone DB account (with an active index)
- Razorpay account (in test/prod mode)
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
# Local Development:
# NEXT_PUBLIC_APP_URL=http://localhost:3000
# BACKEND_URL=http://localhost:3001
# Production GCP Cloud Run:
NEXT_PUBLIC_APP_URL=https://buildit-outreachx-1047516654251.europe-west1.run.app

# ── Pinecone ──────────────────────────────────────────────────
PINECONE_API_KEY=
PINECONE_INDEX_NAME=
```

#### `Backend/.env`

```env
FIREBASE_PROJECT_ID=
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
FIREBASE_CLIENT_EMAIL=

WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_ACCESS_TOKEN=
GEMINI_WHATSAPP_API_KEY=

# Local Development:
# PORT=3001
# FRONTEND_URL=http://localhost:3000
# Production GCP Cloud Run:
PORT=8080
FRONTEND_URL=https://buildit-outreachx-1047516654251.europe-west1.run.app
```

### Running Locally

**1. Clone the repository**
```bash
git clone <repo-url>
cd Solution Challenge
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

### Production Deployment on GCP (Google Cloud Run)

Both the Next.js Frontend and Express Backend are deployed on **Google Cloud Platform (GCP)** via **Google Cloud Run**.

#### 1. Deploy the Express Backend
The Backend is deployed to GCP Cloud Run directly from the source directory using Google Cloud Buildpacks:
```bash
cd Backend
gcloud run deploy outreachx-backend \
  --source . \
  --region europe-west1 \
  --allow-unauthenticated \
  --set-env-vars="PORT=8080,FRONTEND_URL=https://buildit-outreachx-1047516654251.europe-west1.run.app"
```
*(Ensure all other database and third-party integration API keys are also configured as environment variables in the Cloud Run configuration).*

#### 2. Deploy the Next.js Frontend
The Frontend is deployed to GCP Cloud Run using the multi-stage Dockerfile located at the root of the workspace:
```bash
# Deploys using the root Dockerfile for Next.js standalone builds
gcloud run deploy outreachx-frontend \
  --source . \
  --region europe-west1 \
  --allow-unauthenticated \
  --set-env-vars="NEXT_PUBLIC_APP_URL=https://buildit-outreachx-1047516654251.europe-west1.run.app,BACKEND_URL=https://buildit-outreachx-1047516654251.europe-west1.run.app"
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
| `POST` | `/api/campaigns/[id]/files` | Upload images/videos/PDFs to Cloudinary |
| `POST` | `/api/campaigns/[id]/generate-image` | AI image generation (Pixazo) |
| `POST` | `/api/campaigns/[id]/contacts` | Upload & parse contacts CSV/Excel |
| `POST` | `/api/campaigns/[id]/docs` | Upload PDF knowledge base to Pinecone |
| `GET` | `/api/campaigns/[id]/docs` | List campaign documents |

### Communication & Voice Call Triggers

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/campaigns/[id]/make-calls` | Launch outbound AI calls via VAPI |
| `GET` | `/api/voice/token` | Generate LiveKit voice token |
| `POST` | `/api/voice/status` | Update voice call status |
| `POST` | `/api/vapi/webhook` | Handles call completions & WhatsApp follow-up triggers |

### Analytics, Inbox, & Migration

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/campaigns/[id]/analytics` | Fetch campaign analytics |
| `POST` | `/api/campaigns/[id]/analysis/whatsapp` | Track a WhatsApp message status |
| `GET` | `/api/inbox` | List all launched campaigns (inbox view) |
| `GET` | `/api/inbox/message` | Fetch messages for a specific contact |
| `POST` | `/api/inbox/message` | Send or simulate a message reply |
| `GET` | `/api/inbox/chat-summary` | Extracts unanswered questions from user chats |
| `POST` | `/api/inbox/migrate` | Utility endpoint to upgrade to the new inbox structure |

---

## Key Workflows

### 1. Virtual Prepaid Wallet & Pay-As-You-Go Billing

OutreachX uses a pre-paid virtual wallet system integrated with Razorpay to automate billing. This protects businesses from surprise charges while giving them full scalability.

- **Wallet Top-up**: Campaign owners can fund their wallet at any time via a native Razorpay Modal.
- **Budget Guard Rails**:
  - `LaunchGuard`: Checks wallet balance prior to launching a campaign. If the computed campaign cost exceeds the current wallet balance, the launch is blocked.
  - `PaymentGuard`: Performs real-time checks and deductions during call execution or manual follow-ups.
- **Pricing Breakdown**:
  - **WhatsApp**: ₹6 / contact (deducted on initial launch or relaunch)
  - **Voice Message (WhatsApp)**: ₹9 / contact (deducted on initial launch or relaunch)
  - **AI Phone Call**: ₹15 / contact (The first run is included in the campaign launch cost; subsequent runs or custom retry calls are charged at ₹15 / contact)

---

### 2. RAG Feedback Loop & Smart Data Injection ("Organizer Answers")

Traditional chatbots break when they run into unknown user questions. OutreachX solves this with an active **feedback loop** that turns gaps in knowledge into dynamic training data.

```
Incoming WhatsApp Query
         │
         ▼
Query Vector Search (Pinecone)
         │
 ┌───────┴────────────────────────┐
 │ Confidence > Threshold         │ Confidence < Threshold
 ▼                                ▼
Answer using RAG Context       Route to Unanswered Dashboard
                                  │
                                  ▼
                        Organizer Types Answer
                                  │
                                  ▼
                        Injected back into Pinecone
                                  │
                                  ▼
                        AI can now answer next time!
```

- **Retriever Confidence Score**: When a customer asks a question, the vector store retrieval step evaluates the cosine similarity of the closest document chunks. If the similarity score falls below a threshold, the bot does not hallucinate. Instead, it logs the query.
- **Unanswered Dashboard**: The `/api/inbox/chat-summary` API parses conversation logs to isolate unanswered queries. They are displayed in the Analytics Dashboard.
- **Organizer Injection**: As soon as the campaign owner enters the correct answer in the dashboard, the answer is vectorized via Gemini and upserted back to Pinecone (`project_{campaignId}` namespace) as a new "Organizer Answer" document. The AI immediately begins using this knowledge for all subsequent messages.

---

### 3. Cross-Channel Voice-to-WhatsApp Dispatch

During an AI phone call, customers often ask for visual assets, pricing brochures, or written details. OutreachX provides direct cross-channel execution.

1. A customer conversing with the outbound VAPI agent says: *"Can you WhatsApp me your pricing list?"*
2. The VAPI agent calls a backend function hook, which updates the call state and triggers a POST request to `/api/vapi/webhook`.
3. The backend immediately dispatches the campaign's RAG-grounded WhatsApp template, complete with PDF documents and brochure links, to the user's phone number in real-time.
4. The transaction is fully logged in Firestore under the contact's inbox thread.

---

### 4. Multilingual Voice Synthesis & Script Detection

OutreachX is optimized for regional markets (particularly the Indian market) through its **Sarvam AI** voice integration.

- **10 Supported Languages**: `en-IN` (English), `hi-IN` (Hindi), `bn-IN` (Bengali), `ta-IN` (Tamil), `te-IN` (Telugu), `mr-IN` (Marathi), `gu-IN` (Gujarati), `kn-IN` (Kannada), `ml-IN` (Malayalam), `pa-IN` (Punjabi).
- **Fully-Tuned Indic Output**: The top 5 Indic languages are fully-tuned with natural-sounding conversational speakers (like `shubh`, `rehan`, `rohan`) using the advanced `bulbul:v3` model.
- **Automatic Unicode Script Detection**: If a customer replies in a regional script, the system automatically detects the Unicode range and matches it to the correct regional voice/synthesizer.
- **Romanized Script Detection**: The system has pre-trained heuristics to detect **romanized Indic text** (e.g., Hinglish, Benglish, Tamilish) such as *"haan main free hoon"* or *"ami bhalo achhi"*, routing them to the appropriate localized voice profile for responses with human-like precision.

---

## RAG (Retrieval-Augmented Generation) Implementation

OutreachX includes a complete RAG pipeline that enables AI to answer customer questions using your uploaded documents. This transforms your PDFs, guides, and knowledge bases into a searchable intelligence layer for all AI responses.

### How RAG Works in OutreachX

1. **Retrieve** — Search uploaded documents for relevant context.
2. **Augment** — Combine retrieved context with campaign info.
3. **Generate** — Use LLM to answer with grounded, accurate responses.

### Document Upload & Processing

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
Store in Pinecone Vector DB (namespace: project_{campaignId})
    ↓
Save Metadata in Firestore
```

### Vector Storage Architecture

#### Primary: Pinecone (Production-Ready)
- **Namespace**: `project_{campaignId}`
- **Vector IDs**: `{documentKey}_{chunkIndex}`
- **Embeddings**: 768-dimensional (Gemini)
- **Metadata**: `userId`, `campaignId`, `documentKey`, `fileName`, `chunkIndex`

#### Secondary: Firestore (Metadata & Fallback)
- User, campaign, and document status tracking.
- Fallback vector representation for offline/hybrid search.

### RAG Performance Characteristics

| Metric | Value | Notes |
|--------|-------|-------|
| Chunk Size | 500 chars | Balanced for semantic coherence |
| Chunk Overlap | 100 chars | Prevents context loss at boundaries |
| Top Results | 3 chunks | Best relevance-to-window ratio |
| Embedding Model | Gemini 2 | 768 dimensions, multilingual support |
| Vector DB Latency | <100ms | Pinecone vector search SLA |
