# Product Requirements Document & Architecture Specification: Minimal AI Customer Support Agent

## 1. Executive Summary
This project delivers a robust, enterprise-grade, secure full-stack AI Customer Support Agent application built precisely to the challenge requirements for Virallens. It features JWT authentication with bcrypt password hashing, a secure Node.js + Express backend interacting with MongoDB (with Mongoose models for users and chat histories), integration with OpenRouter / Hugging Face LLM APIs for intelligent support replies, rate limiting (`express-rate-limit`), security hardening (CORS, helmet, sanitization), and a stunning React frontend built with Tailwind CSS and advanced UI design.

## 2. System Architecture & Tech Stack
- **Frontend**: React (Vite / Next.js app structure), Tailwind CSS, Lucide icons, Axios with secure token interceptors.
- **Backend**: Node.js + Express.js REST API with modular controllers and service layers.
- **Database**: MongoDB Atlas (or local MongoDB / Mongoose ODM) with user-scoped schema partitioning.
- **Security & Middleware**:
  - JWT HttpOnly / Bearer token authentication middleware.
  - Bcrypt salt rounds (12) for secure password hashing.
  - Rate limiting (`express-rate-limit`) on auth and chat endpoints.
  - Strict input validation and sanitization.
  - Response filtering: ensuring only necessary data fields (e.g., omitting password hashes) are sent back to the client.
- **AI Engine**: OpenRouter API integration (`openai/gpt-4o-mini` or `anthropic/claude-3.5-sonnet`) with system prompts tuned for professional, empathetic customer support.
- **DevOps**: Dockerfile and `docker-compose.yml` for single-command deployment.

## 3. API Endpoints Specification
- `POST /api/auth/signup`: Registers a new user, hashes password with bcrypt, returns JWT.
- `POST /api/auth/login`: Authenticates user credentials, returns JWT.
- `GET /api/auth/me`: Verifies token and returns current user profile.
- `POST /api/chat/send`: Authenticated endpoint accepting `{ message, conversationId }`, queries LLM, saves user message and assistant reply to MongoDB, and returns the response.
- `GET /api/chat/history`: Authenticated endpoint returning all chat threads/messages scoped to the logged-in user.
- `GET /health`: Health check endpoint.

## 4. Security & Data Protection Guarantees
- No unauthenticated access to chat or user data.
- API keys and DB URIs stored strictly in environment variables (`.env`).
- Backend data isolation: queries are strictly filtered by `userId`.
- Rate limiting prevents brute force and API quota exhaustion.
