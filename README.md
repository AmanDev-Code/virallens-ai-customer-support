# Minimal AI Customer Support Agent – Full Stack Challenge

A full-stack, secure, production-ready AI Customer Support Agent application designed for **Virallens**.

## Features

- 👤 **Authentication (JWT & Bcrypt)**
  - Secure User Signup / Login / Logout with JWT token issuance and verification.
  - Salted password hashing using `bcryptjs` (12 rounds).
  - Protected backend routes with bearer authentication middleware.
- 💬 **Intelligent Chat System**
  - Interactive chat interface with real-time feedback.
  - Streaming typing indicator animation for AI responses.
  - Conversation persistence in MongoDB, scoped strictly by user identity.
  - Multi-session history sidebar allowing users to switch between or start new support chats.
- 🧠 **AI Integration**
  - Integrated with OpenRouter.ai API (supports models like `openai/gpt-4o-mini`, `anthropic/claude-3.5-sonnet`, and open-source models).
  - Robust offline support agent fallback for demonstration without live API keys.
- 🛡️ **Security & Optimization**
  - Express rate limiting (`express-rate-limit`) on authentication and chat endpoints to guard against abuse.
  - Data minimization: user passwords omitted from responses; all queries filtered by `userId`.
  - CORS configuration and sanitized inputs.
- 🐳 **DevOps & Containerization**
  - Full Docker setup with `Dockerfile` and `docker-compose.yml` for single-command orchestration (Node.js API + MongoDB).

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, Vite, Tailwind CSS, Lucide Icons |
| **Backend** | Node.js, Express.js |
| **Database** | MongoDB / Mongoose |
| **Auth** | JSON Web Tokens (JWT), Bcrypt.js |
| **AI Provider** | OpenRouter.ai / Hugging Face Inference API |
| **Containerization** | Docker, Docker Compose |

---

## Directory Structure

```text
├── client/                 # React Vite frontend application
│   ├── src/
│   │   ├── components/     # AuthModal, ChatInterface components
│   │   ├── utils/          # API fetch wrapper with token management
│   │   ├── App.jsx         # Root app with auth state routing
│   │   ├── main.jsx        # React entrypoint
│   │   └── index.css       # Tailwind CSS styles
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.js
├── server/                 # Express.js REST API
│   ├── controllers/        # authController, chatController
│   ├── middleware/         # auth.js JWT validation
│   ├── models/             # User.js, Chat.js Mongoose models
│   ├── routes/             # authRoutes.js, chatRoutes.js
│   ├── package.json
│   ├── server.js
│   └── .env.example
├── Dockerfile              # Backend container definition
├── docker-compose.yml      # Orchestrates MongoDB + Backend API
├── PRD.md                  # Comprehensive Product Requirements Document
└── README.md               # Documentation and setup guide
```

---

## Quick Start (Local Setup)

### 1. Prerequisites
- Node.js (v18+)
- MongoDB running locally or a MongoDB Atlas URI

### 2. Backend Setup
```bash
cd server
cp .env.example .env
npm install
npm run dev
```
The server will run at `http://localhost:5000`.

### 3. Frontend Setup
```bash
cd client
npm install
npm run dev
```
The client will run at `http://localhost:3000`.

---

## Running with Docker Compose

Run the entire application stack (API + MongoDB) with:

```bash
docker compose up --build
```

---

## Environment Variables

### Server (`server/.env`)
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/ai-customer-support
JWT_SECRET=your_jwt_secret_key_here
OPENROUTER_API_KEY=your_openrouter_api_key_here
AI_MODEL=openai/gpt-4o-mini
NODE_ENV=development
```
