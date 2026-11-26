# Virallens AI Customer Support & Autonomous Growth Agent

> A production-ready, enterprise-grade full-stack AI Customer Support and Autonomous Growth Agent built for **Virallens**.

![Live Demo](https://img.shields.io/badge/Live-Deployment-emerald?style=flat-square&logo=render)
![Node.js](https://img.shields.io/badge/Backend-Node.js_%2F_Express-green?style=flat-square&logo=node.js)
![React](https://img.shields.io/badge/Frontend-React_%2F_Tailwind-blue?style=flat-square&logo=react)
![MongoDB](https://img.shields.io/badge/Database-MongoDB_Atlas-brightgreen?style=flat-square&logo=mongodb)

---

## 🚀 Live Demo & Repository
- **Live Application**: [https://rdnrooedffhtwlusljo2tfif.100.51.245.110.sslip.io/](https://rdnrooedffhtwlusljo2tfif.100.51.245.110.sslip.io/)
- **GitHub Repository**: [https://github.com/amandev-code/virallens-ai-customer-support](https://github.com/amandev-code/virallens-ai-customer-support)

---

## 💡 Architecture & System Overview

This application delivers a secure, highly resilient AI customer support assistant backed by a **Hybrid Retrieval-Augmented Generation (RAG)** engine, robust authentication, and secure per-user document memory management.

```
┌────────────────────────────────────────────────────────────────────────┐
│                              React Frontend                            │
│           (Tailwind CSS, File Attachments, Memory Modal)               │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTPS / REST / FormData
┌───────────────────────────────────▼────────────────────────────────────┐
│                           Express.js Backend                           │
│   ┌────────────────────────┬────────────────────────┬──────────────┐   │
│   │ JWT Auth & Rate Limit  │   Hybrid RAG Engine    │ Multer & PDF │   │
│   │ (Bcrypt 12 rounds)     │ (Vector + Text + RRF)  │ Parser (10MB)│   │
│   └────────────────────────┴────────────────────────┴──────────────┘   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Mongoose ODM
┌───────────────────────────────────▼────────────────────────────────────┐
│                         MongoDB Atlas Database                         │
│     (Users, Conversations, KnowledgeBase Articles, UserDocuments)      │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, Vite, Tailwind CSS, Lucide Icons |
| **Backend** | Node.js, Express.js, Multer, `pdf-parse` |
| **Database** | MongoDB Atlas (M0 Free Tier compatible) |
| **Authentication** | JSON Web Tokens (JWT), Bcrypt.js (12 salt rounds) |
| **AI Provider** | OpenRouter (`nvidia/nemotron-3.5-super-vl:free`) |
| **Deployment** | Coolify, Docker (Unified Single-Container Build) |

---

## ✨ Core Features

### 1. 👤 Secure Authentication & Authorization
- Signup, Login, and Logout flows with JSON Web Tokens (JWT).
- Passwords salted and hashed with `bcryptjs` (12 rounds).
- Protected API endpoints with bearer token verification middleware.
- Data isolation ensuring queries are strictly filtered by authenticated `userId`.

### 2. 🧠 Hybrid RAG & 10MB User Document Memory
- **Hybrid Search**: Combines **Vector Cosine Similarity Search** with **MongoDB Full-Text Keyword Search**, fused via **Reciprocal Rank Fusion (RRF)**.
- **Real PDF & Document Parsing**: Uses `pdf-parse` to extract readable text from uploaded `.pdf`, `.md`, `.txt`, `.json`, and image attachments.
- **10MB Quota & Management**: Users can upload files directly in the chat bar or via the Memory modal, monitor their storage meter, and delete documents to instantly free up memory.

### 3. 🛡️ Production Resilience & Guardrails
- **Circuit Breaker**: Automatically trips after 3 consecutive external API failures with a 30-second recovery timeout.
- **Exponential Backoff**: Retries failed LLM calls up to 2 times with jitter.
- **Multi-Layered Rate Limiting**: IP and user-scoped rate limiting (`express-rate-limit`) on auth and chat endpoints.

---

## 📦 Project Structure

```text
├── client/                  # React Vite frontend application
│   ├── src/
│   │   ├── components/      # AuthModal, ChatInterface, MemoryModal
│   │   ├── utils/           # API wrapper with safe JSON parsing
│   │   └── index.css        # Tailwind styles (Emerald/Teal Growth theme)
│   └── package.json
├── server/                  # Express.js backend API
│   ├── controllers/         # authController, chatController
│   ├── middleware/          # auth.js, rateLimiter.js
│   ├── models/              # User.js, Chat.js, KnowledgeBase.js, UserDocument.js
│   ├── routes/              # authRoutes.js, chatRoutes.js, documentRoutes.js
│   ├── services/            # ragService.js (Embeddings, RRF search, KB seeding)
│   ├── uploads/             # Temporary local binary file storage
│   ├── server.js            # Express app & static client serving
│   └── package.json
├── Dockerfile               # Unified multi-stage production Dockerfile
├── docker-compose.yml       # Coolify deployment orchestration
└── README.md
```

---

## 🚀 Local Development Setup

### Prerequisites
- Node.js (v18+)
- MongoDB Atlas connection URI

### 1. Backend Setup
```bash
cd server
cp .env.example .env
npm install
npm run dev
```

### 2. Frontend Setup
```bash
cd client
npm install
npm run dev
```
Open `http://localhost:3000` in your browser.

---

## 🚢 Deployment on Coolify

This repository uses a **unified production build** where a single container compiles the React frontend and serves it via the Express backend:

1. Create a **New Resource** in Coolify pointing to `https://github.com/amandev-code/virallens-ai-customer-support`.
2. Choose **Docker Compose**.
3. Set Environment Variables:
   - `PORT`: `5000`
   - `MONGODB_URI`: `mongodb://trndinnhq_db_user:<password>@...`
   - `JWT_SECRET`: Your secure hex secret
   - `OPENROUTER_API_KEY`: Your OpenRouter API key
   - `AI_MODEL`: `nvidia/nemotron-3.5-super-vl:free`
   - `NODE_ENV`: `production`
4. Set your FQDN domain and click **Deploy**.
