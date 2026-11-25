const KnowledgeBase = require('../models/KnowledgeBase');

async function generateEmbedding(text) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  try {
    const res = await fetch('https://openrouter.ai/api/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'openai/text-embedding-3-small',
        input: text.substring(0, 8000)
      })
    });

    if (res.ok) {
      const data = await res.json();
      if (data.data && data.data[0] && data.data[0].embedding) {
        return data.data[0].embedding;
      }
    }
  } catch (err) {
    console.warn('Embedding API unavailable, falling back to local keyword vectors.');
  }

  return generateLocalEmbedding(text);
}

function generateLocalEmbedding(text, dims = 128) {
  const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/);
  const vec = new Array(dims).fill(0);
  for (const word of words) {
    let hash = 0;
    for (let i = 0; i < word.length; i++) {
      hash = ((hash << 5) - hash + word.charCodeAt(i)) | 0;
    }
    const idx = Math.abs(hash) % dims;
    vec[idx] += 1;
  }
  const mag = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
  return vec.map(v => v / mag);
}

function cosineSimilarity(a, b) {
  if (a.length !== b.length) return 0;
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  return dot / (Math.sqrt(magA) * Math.sqrt(magB) || 1);
}

async function hybridSearch(query, topK = 5) {
  const queryEmbedding = await generateEmbedding(query);

  const allDocs = await KnowledgeBase.find({ embedding: { $exists: true, $ne: [] } });
  const vectorResults = allDocs
    .map(doc => ({
      doc,
      score: cosineSimilarity(queryEmbedding, doc.embedding)
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK * 2);

  let keywordResults = [];
  try {
    keywordResults = await KnowledgeBase.find(
      { $text: { $search: query } },
      { score: { $meta: 'textScore' } }
    ).sort({ score: { $meta: 'textScore' } }).limit(topK * 2);
  } catch (err) {
    console.warn('Text search unavailable:', err.message);
  }

  const RRF_K = 60;
  const fusedScores = new Map();

  vectorResults.forEach((item, rank) => {
    const id = item.doc._id.toString();
    const rrf = 1 / (RRF_K + rank + 1);
    fusedScores.set(id, (fusedScores.get(id) || 0) + rrf);
    if (!fusedScores.has(id + '_doc')) {
      fusedScores.set(id + '_doc', item.doc);
    }
  });

  keywordResults.forEach((doc, rank) => {
    const id = doc._id.toString();
    const rrf = 1 / (RRF_K + rank + 1);
    fusedScores.set(id, (fusedScores.get(id) || 0) + rrf);
    if (!fusedScores.has(id + '_doc')) {
      fusedScores.set(id + '_doc', doc);
    }
  });

  const results = [];
  for (const [key] of fusedScores) {
    if (!key.endsWith('_doc') && fusedScores.has(key + '_doc')) {
      results.push({
        doc: fusedScores.get(key + '_doc'),
        score: fusedScores.get(key)
      });
    }
  }
  results.sort((a, b) => b.score - a.score);

  return results.slice(0, topK);
}

async function seedKnowledgeBase() {
  const count = await KnowledgeBase.countDocuments();
  if (count > 0) return;

  const articles = [
    {
      title: 'Virallens Platform Overview',
      content: 'Virallens is an AI-Native Autonomous Growth Operating System designed specifically for LinkedIn-first creators, startups, and growth teams. It combines automated pipeline scheduling, lead intelligence, AI-driven content generation, and autonomous support workflows.',
      category: 'overview',
      keywords: ['virallens', 'overview', 'ai-native', 'growth', 'linkedin', 'autonomous']
    },
    {
      title: 'Pricing & Subscription Tiers',
      content: 'Virallens offers three transparent tiers: 1) Starter ($29/mo) for solo creators with core scheduling and AI caption generation. 2) Growth ($79/mo) for teams up to 5 members with advanced analytics, lead enrichment, and CRM integrations. 3) Enterprise (Custom) with dedicated account management, custom LLM fine-tuning, and SLA guarantees.',
      category: 'billing',
      keywords: ['pricing', 'cost', 'starter', 'growth', 'enterprise', 'subscription', 'plans']
    },
    {
      title: 'Password Reset & Account Security',
      content: 'To reset your password securely, navigate to the login portal, click "Forgot Password", and enter your registered email. A cryptographic reset token valid for 30 minutes will be emailed to you. Passwords must be at least 8 characters with a mix of numbers and symbols.',
      category: 'security',
      keywords: ['password', 'reset', 'security', 'login', 'account', 'auth']
    },
    {
      title: 'AI Content Generation & Custom Prompts',
      content: 'Virallens uses state-of-the-art LLMs (including Nvidia Nemotron and GPT-4o-mini) to generate high-performing LinkedIn posts, threads, and newsletters. You can define custom brand voice guidelines, tone sliders (professional, witty, authoritative), and reusable prompt templates.',
      category: 'features',
      keywords: ['ai', 'content', 'generation', 'prompts', 'brand voice', 'linkedin', 'threads']
    },
    {
      title: 'Bug Reporting & Engineering Support',
      content: 'Encountering a bug or unexpected error? Report it directly through this support chat or email support@virallens.com with steps to reproduce and browser details. Our engineering triage team investigates all bug reports within 2 hours during business days.',
      category: 'support',
      keywords: ['bug', 'error', 'issue', 'report', 'support', 'engineering', 'triage']
    },
    {
      title: 'REST API, Webhooks & Developer Access',
      content: 'Developers can access Virallens programmatically via our REST API. Generate API keys under Settings > Developer. Configure webhooks for real-time event subscriptions including content published, lead converted, and campaign completed. Rate limits are set to 1000 req/hour for Growth tiers.',
      category: 'developer',
      keywords: ['api', 'webhook', 'developer', 'rest', 'keys', 'rate limit', 'integration']
    },
    {
      title: 'GDPR, CCPA & Data Privacy Compliance',
      content: 'Virallens adheres strictly to GDPR and CCPA privacy regulations. All data is encrypted at rest using AES-256 and in transit via TLS 1.3. Users retain full ownership of their data and can export or permanently purge their account data at any time from Settings > Privacy.',
      category: 'security',
      keywords: ['gdpr', 'ccpa', 'privacy', 'compliance', 'encryption', 'aes-256', 'data purge']
    },
    {
      title: 'Team Collaboration, Roles & Permissions',
      content: 'Collaborate seamlessly with role-based access control (RBAC). Roles include Owner, Admin, Editor, and Viewer. Invite teammates via Settings > Team by entering their email address and assigning their role.',
      category: 'team',
      keywords: ['team', 'collaboration', 'roles', 'permissions', 'rbac', 'invite', 'admin']
    }
  ];

  for (const article of articles) {
    article.embedding = await generateEmbedding(article.content);
  }

  await KnowledgeBase.insertMany(articles);
  console.log(`Seeded ${articles.length} rich Virallens knowledge base articles.`);
}

module.exports = { hybridSearch, generateEmbedding, seedKnowledgeBase };
