const KnowledgeBase = require('../models/KnowledgeBase');

// --- Embedding Generation ---
// Uses a free model via OpenRouter to generate text embeddings
// Falls back to simple TF-IDF-style keyword vectors if embedding API is unavailable

async function generateEmbedding(text) {
  const apiKey = process.env.OPENROUTER_API_KEY;

  // Try OpenRouter embedding endpoint first
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

  // Fallback: lightweight local keyword vector (bag-of-words style, 128 dims)
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
  // Normalize
  const mag = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
  return vec.map(v => v / mag);
}

// --- Cosine Similarity ---
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

// --- Hybrid Search (Vector + Keyword) with Reciprocal Rank Fusion ---

async function hybridSearch(query, topK = 5) {
  const queryEmbedding = await generateEmbedding(query);

  // 1. Vector Search: compute cosine similarity against all docs' stored embeddings
  const allDocs = await KnowledgeBase.find({ embedding: { $exists: true, $ne: [] } });
  const vectorResults = allDocs
    .map(doc => ({
      doc,
      score: cosineSimilarity(queryEmbedding, doc.embedding)
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK * 2);

  // 2. Keyword Search: MongoDB full-text $text search
  let keywordResults = [];
  try {
    keywordResults = await KnowledgeBase.find(
      { $text: { $search: query } },
      { score: { $meta: 'textScore' } }
    ).sort({ score: { $meta: 'textScore' } }).limit(topK * 2);
  } catch (err) {
    // Text index might not exist yet
    console.warn('Text search unavailable:', err.message);
  }

  // 3. Reciprocal Rank Fusion (RRF) to merge both rankings
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

  // Sort by fused RRF score
  const results = [];
  for (const [key, value] of fusedScores) {
    if (!key.endsWith('_doc') && fusedScores.has(key + '_doc')) {
      results.push({
        doc: fusedScores.get(key + '_doc'),
        score: value
      });
    }
  }
  results.sort((a, b) => b.score - a.score);

  return results.slice(0, topK);
}

// --- Seed Default Knowledge Base ---

async function seedKnowledgeBase() {
  const count = await KnowledgeBase.countDocuments();
  if (count > 0) return;

  const articles = [
    {
      title: 'Getting Started with Virallens',
      content: 'Virallens is an AI-Native Autonomous Growth & Support platform. To get started, create an account, connect your social profiles, and set up your first campaign. The dashboard provides real-time analytics and engagement tracking.',
      category: 'onboarding',
      keywords: ['getting started', 'setup', 'create account', 'dashboard', 'onboarding']
    },
    {
      title: 'Pricing Plans and Billing',
      content: 'Virallens offers three plans: Starter ($29/month for individual creators), Growth ($79/month for small teams up to 5 members), and Enterprise (custom pricing for large organizations). All plans include AI-powered support, analytics, and content scheduling. Billing is monthly or annual (20% discount for annual).',
      category: 'billing',
      keywords: ['pricing', 'cost', 'billing', 'plans', 'payment', 'subscription', 'enterprise']
    },
    {
      title: 'How to Reset Your Password',
      content: 'To reset your password: 1) Go to the login page. 2) Click "Forgot Password". 3) Enter your email address. 4) Check your inbox for a reset link. 5) Click the link and set a new password. The link expires after 30 minutes for security.',
      category: 'account',
      keywords: ['password', 'reset', 'forgot', 'login', 'security', 'account recovery']
    },
    {
      title: 'AI Content Generation Features',
      content: 'Virallens uses advanced AI models to generate social media captions, blog post drafts, ad copy, and email newsletters. Supported platforms include LinkedIn, Twitter/X, Instagram, and Facebook. You can customize tone, length, and target audience for each piece of content.',
      category: 'features',
      keywords: ['ai', 'content', 'generation', 'social media', 'captions', 'blog', 'linkedin']
    },
    {
      title: 'Reporting Bugs and Technical Issues',
      content: 'If you encounter a bug or technical issue: 1) Take a screenshot of the error. 2) Note the steps to reproduce the problem. 3) Contact support through this chat or email support@virallens.com. 4) Include your browser version and operating system. Our engineering team typically responds within 4 hours.',
      category: 'support',
      keywords: ['bug', 'error', 'issue', 'problem', 'technical', 'crash', 'fix', 'report']
    },
    {
      title: 'API Integration and Webhooks',
      content: 'Virallens provides a REST API for programmatic access. API keys can be generated from Settings > Developer > API Keys. Webhooks allow real-time event notifications for content publication, engagement milestones, and campaign completions. Rate limits are 1000 requests per hour for Growth plans and unlimited for Enterprise.',
      category: 'developer',
      keywords: ['api', 'integration', 'webhook', 'developer', 'rest', 'programmatic', 'rate limit']
    },
    {
      title: 'Data Privacy and Security',
      content: 'Virallens is fully GDPR and CCPA compliant. All data is encrypted at rest (AES-256) and in transit (TLS 1.3). We never sell user data. You can export or delete all your data at any time from Settings > Privacy > Data Management. Two-factor authentication (2FA) is available for all accounts.',
      category: 'security',
      keywords: ['privacy', 'security', 'gdpr', 'data', 'encryption', 'compliance', '2fa', 'delete data']
    },
    {
      title: 'Team Collaboration and Roles',
      content: 'Growth and Enterprise plans support team collaboration. Available roles are: Owner (full access), Admin (manage members, campaigns), Editor (create and edit content), and Viewer (read-only analytics). Invite team members from Settings > Team > Invite. Each member gets their own login credentials.',
      category: 'features',
      keywords: ['team', 'collaboration', 'roles', 'invite', 'members', 'admin', 'permissions']
    }
  ];

  for (const article of articles) {
    article.embedding = await generateEmbedding(article.content);
  }

  await KnowledgeBase.insertMany(articles);
  console.log(`Seeded ${articles.length} knowledge base articles with embeddings.`);
}

module.exports = { hybridSearch, generateEmbedding, seedKnowledgeBase };
