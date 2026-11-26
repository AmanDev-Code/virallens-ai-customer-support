# Submission Email: Full-Stack AI Customer Support Agent Challenge (Virallens)

**To:** Virallens Hiring / Engineering Team  
**Subject:** Submission: Full-Stack AI Customer Support Agent Challenge — Aman Ahuja  
**Live Application URL:** [https://rdnrooedffhtwlusljo2tfif.100.51.245.110.sslip.io/](https://rdnrooedffhtwlusljo2tfif.100.51.245.110.sslip.io/)  
**GitHub Repository:** [https://github.com/amandev-code/virallens-ai-customer-support](https://github.com/amandev-code/virallens-ai-customer-support)

---

Dear Virallens Team,

I am excited to submit my complete, production-ready solution for the **Minimal AI Customer Support Agent** full-stack challenge. 

The application has been fully architected, engineered, and successfully deployed live using **Coolify** and **MongoDB Atlas**, meeting and exceeding all functional, security, and performance requirements.

### 🚀 Live Deployment & Source Code
- **Live Application**: [https://rdnrooedffhtwlusljo2tfif.100.51.245.110.sslip.io/](https://rdnrooedffhtwlusljo2tfif.100.51.245.110.sslip.io/)
- **GitHub Repository**: [https://github.com/amandev-code/virallens-ai-customer-support](https://github.com/amandev-code/virallens-ai-customer-support)

---

### 📋 Summary of Implemented Features

1. **Secure Authentication (JWT & Bcrypt)**:
   - Full Signup, Login, and Logout flow with JSON Web Tokens (JWT).
   - Passwords securely salted and hashed using `bcryptjs` (12 rounds).
   - Protected API endpoints with bearer token verification middleware.

2. **Intelligent Chat System & History**:
   - Clean, highly responsive React chat interface styled with an executive growth emerald/teal palette.
   - Real-time conversation persistence in MongoDB Atlas, strictly scoped and isolated by user identity (`userId`).
   - Sidebar with multi-session history, allowing users to seamlessly switch between past support chats or start new sessions.

3. **Hybrid RAG (Retrieval-Augmented Generation) & Document Memory**:
   - Integrated with **OpenRouter.ai** (`nvidia/nemotron-3.5-super-vl:free`).
   - **Hybrid Search Engine**: Combines **Vector Cosine Similarity Search** with **MongoDB Full-Text Keyword Search**, fused via **Reciprocal Rank Fusion (RRF)**.
   - **10MB User Memory & File Attachments**: Users can attach documents (`.md`, `.txt`, `.pdf`, `.json`, and images) directly inside the chat bar or via the Memory modal. The backend parses PDFs (using `pdf-parse`), extracts text, generates vector embeddings, and indexes them into vector memory with strict 10MB per-user quota enforcement and deletion capabilities.

4. **Production Security, Resilience & Guardrails**:
   - **Circuit Breaker & Exponential Backoff**: Prevents cascading failures when external LLM APIs experience latency or throttling, with strict maximum retry limits (max 2 retries).
   - **Multi-Layered Rate Limiting**: IP and user-scoped rate limiting (`express-rate-limit`) on authentication and messaging endpoints to thwart abuse.
   - **Data Minimization**: Strips password hashes from all API responses and isolates data per user.

5. **Cloud Deployment**:
   - Containerized with a unified production Dockerfile bundling the React frontend (`client/dist`) and Express backend.
   - Deployed live on Coolify connected to a MongoDB Atlas cluster.

---

Thank you for the opportunity to work on this challenge! I look forward to your feedback.

Best regards,  
**Aman Ahuja**  
[aman@virallens.com](mailto:aman@virallens.com)
