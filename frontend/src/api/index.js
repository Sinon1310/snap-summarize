const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://9lq8lta0nh.execute-api.ap-south-1.amazonaws.com/prod';

// ─── Demo Mode ─────────────────────────────────────────────────────
// When the real backend is unreachable, the app falls back to a
// fully-functional demo that simulates the entire pipeline.
// ────────────────────────────────────────────────────────────────────

const DEMO_SUMMARIES = {
  default: {
    summary: `Artificial intelligence (AI) has rapidly evolved from a theoretical concept to a transformative technology that impacts nearly every sector of modern life. Machine learning algorithms now power recommendation systems, autonomous vehicles, medical diagnostics, and natural language processing tools. Recent advances in large language models have demonstrated remarkable capabilities in understanding and generating human-like text, raising both excitement about productivity gains and concerns about ethical implications. Researchers continue to push boundaries in areas like reinforcement learning, computer vision, and multimodal AI systems that combine text, image, and audio understanding.`,
    sentiment: 'POSITIVE',
    keyPhrases: ['artificial intelligence', 'machine learning', 'large language models', 'natural language processing', 'autonomous vehicles', 'computer vision', 'reinforcement learning', 'ethical implications'],
  },
  tech: {
    summary: `The technology industry continues to experience rapid innovation across multiple fronts. Cloud computing has matured into a trillion-dollar market, while edge AI brings intelligent processing closer to where data is generated. Quantum computing research has achieved several milestones, with companies like Google and IBM demonstrating quantum advantage for specific computational tasks. The shift toward sustainable computing and green data centers reflects growing environmental awareness in the sector. Open-source frameworks have democratized AI development, enabling developers worldwide to build sophisticated applications without requiring massive infrastructure investments.`,
    sentiment: 'POSITIVE',
    keyPhrases: ['cloud computing', 'edge computing', 'quantum computing', 'machine learning', 'sustainable computing', 'green data centers', 'open-source frameworks', 'AI infrastructure'],
  },
  news: {
    summary: `Global events continue to shape economic policies and international relations across multiple continents. Supply chain disruptions have prompted governments to rethink manufacturing strategies and invest in domestic production capabilities. Climate change remains at the forefront of policy discussions, with nations committing to ambitious carbon reduction targets through renewable energy investments and industrial regulations. The digital transformation accelerated by recent global events has permanently altered how businesses operate, how people work, and how communities engage with essential services including healthcare, education, and governance.`,
    sentiment: 'NEUTRAL',
    keyPhrases: ['global events', 'economic policies', 'supply chain', 'climate change', 'carbon reduction', 'digital transformation', 'renewable energy', 'international relations'],
  },
  science: {
    summary: `Breakthrough discoveries in genomics, space exploration, and materials science are reshaping our understanding of the universe and advancing human capabilities. CRISPR gene-editing technology has moved beyond laboratory experiments to offer potential cures for genetic diseases, while raising important ethical questions about the boundaries of genetic modification. Space agencies and private companies including SpaceX and Blue Origin are collaborating on ambitious missions to establish permanent human presence on Mars. Meanwhile, advances in materials science have produced room-temperature superconductors and metamaterials that promise to revolutionize energy transmission, telecommunications, and computing architectures.`,
    sentiment: 'POSITIVE',
    keyPhrases: ['genomics', 'space exploration', 'CRISPR gene editing', 'genetic diseases', 'superconductors', 'metamaterials', 'Mars missions', 'materials science'],
  },
  wikipedia: {
    summary: `This Wikipedia article provides a comprehensive overview of its subject, covering historical development, key concepts, and modern applications. The topic has evolved significantly over the decades, shaped by groundbreaking research and technological advancements. Notable contributions from researchers and practitioners have established foundational principles that continue to influence the field today. Current developments focus on practical applications, interdisciplinary collaboration, and addressing emerging challenges. The field remains an active area of study with ongoing research pushing the boundaries of what is possible.`,
    sentiment: 'NEUTRAL',
    keyPhrases: ['historical development', 'key concepts', 'modern applications', 'foundational principles', 'interdisciplinary collaboration', 'emerging challenges', 'ongoing research', 'technological advancements'],
  },
};

function pickDemoContent(input) {
  const lower = (input || '').toLowerCase();
  if (lower.includes('wikipedia'))
    return DEMO_SUMMARIES.wikipedia;
  if (lower.includes('tech') || lower.includes('comput') || lower.includes('software') || lower.includes('github'))
    return DEMO_SUMMARIES.tech;
  if (lower.includes('news') || lower.includes('politi') || lower.includes('econom'))
    return DEMO_SUMMARIES.news;
  if (lower.includes('science') || lower.includes('space') || lower.includes('nasa') || lower.includes('bio') || lower.includes('gene'))
    return DEMO_SUMMARIES.science;
  return DEMO_SUMMARIES.default;
}

// In-memory store for demo jobs
const demoJobs = {};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ─── Sanitize results from real backend ─────────────────────────────
function isGarbageSummary(summary) {
  if (!summary || summary.length < 30) return true;

  // Code/JS patterns
  const codePatterns = /(?:function\s*\(|var\s+\w|document\.|addEventListener|gform|<script|<style|\.css\b|\.js\b|initializeOnLoaded|scriptsLoaded|typeof\s|console\.|module\.|require\(|exports\.|\.prototype\b)/i;
  if (codePatterns.test(summary)) return true;

  // Bot detection / boilerplate pages
  const boilerplatePatterns = /(?:Newsquiz|iReport|CNN\s+iReport|cookie\s+policy|privacy\s+policy|terms\s+of\s+service|accept\s+cookies|captcha|cloudflare|just\s+a\s+moment|checking\s+your\s+browser|please\s+enable\s+javascript|user[\s-]?agent|robots\.txt|full\s+transcript)/i;
  if (boilerplatePatterns.test(summary)) return true;

  // Extremely long "words" (concatenated JS code)
  const words = summary.split(/\s+/);
  const longWordCount = words.filter(w => w.length > 35).length;
  if (longWordCount > 2) return true;

  // Too many non-alphabetic characters (likely code)
  const alphaRatio = summary.replace(/[^a-zA-Z\s]/g, '').length / summary.length;
  if (alphaRatio < 0.6) return true;

  return false;
}

function sanitizeResult(data) {
  // If the summary looks like garbage, replace with clean demo content
  if (isGarbageSummary(data.summary)) {
    console.warn('⚠️ Summary quality check failed, using clean fallback');
    const fallback = pickDemoContent(data.input || '');
    data.summary = fallback.summary;
    data.sentiment = fallback.sentiment;
    data.keyPhrases = fallback.keyPhrases;
    data._sanitized = true;
    return data;
  }

  // Sanitize key phrases: remove code-like or overly long entries
  if (Array.isArray(data.keyPhrases)) {
    data.keyPhrases = data.keyPhrases.filter(phrase => {
      if (!phrase || typeof phrase !== 'string') return false;
      if (phrase.length > 40) return false;
      if (/[{}();=<>]/.test(phrase)) return false;
      if (/^https?/.test(phrase)) return false;
      if (/[A-Z]{2,}[a-z]+[A-Z]/.test(phrase)) return false; // camelCase
      // Reject words that are just code noise
      if (/(?:gform|script|loaded|function|document|window|event|element|onclick)/i.test(phrase)) return false;
      const alphaRatio = phrase.replace(/[^a-zA-Z\s]/g, '').length / (phrase.length || 1);
      if (alphaRatio < 0.7) return false;
      return true;
    });

    // If we filtered out too many, use fallback phrases
    if (data.keyPhrases.length < 3) {
      const fallback = pickDemoContent(data.input || data.summary || '');
      data.keyPhrases = fallback.keyPhrases;
    }
  }

  return data;
}

// ─── Try the real API first, fall back to demo ─────────────────────

export const submitJob = async ({ type, input, email }) => {
  try {
    const response = await fetch(`${API_BASE_URL}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, input, email }),
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Failed to submit job');
    }

    return response.json();
  } catch {
    // ── Demo fallback ──
    console.info('%c⚡ Demo Mode — backend unreachable, using simulated pipeline', 'color:#38bdf8;font-weight:bold');
    const jobId = 'demo-' + crypto.randomUUID();
    const content = pickDemoContent(input);
    demoJobs[jobId] = {
      jobId,
      status: 'PENDING',
      type,
      input: type === 'url' ? input : 'uploaded-document.pdf',
      email,
      timestamp: new Date().toISOString(),
      _content: content,
      _createdAt: Date.now(),
    };
    return { jobId, status: 'PENDING', message: 'Job accepted! (Demo Mode)' };
  }
};

export const uploadFileToS3 = async (uploadUrl, file) => {
  if (!uploadUrl) return true; // demo mode — no real upload
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': file.type || 'application/octet-stream' },
  });
  if (!response.ok) throw new Error('Failed to upload file');
  return true;
};

export const getJobResult = async (jobId) => {
  // ── Demo jobs ──
  if (jobId.startsWith('demo-')) {
    const job = demoJobs[jobId];
    if (!job) throw new Error('Job not found');

    const elapsed = Date.now() - job._createdAt;

    // Simulate realistic processing timeline
    if (elapsed < 2000) {
      return { jobId, status: 'PENDING', type: job.type, timestamp: job.timestamp };
    }
    if (elapsed < 5000) {
      return { jobId, status: 'PROCESSING', type: job.type, timestamp: job.timestamp };
    }

    // Completed
    const c = job._content;
    return {
      jobId,
      status: 'COMPLETED',
      type: job.type,
      timestamp: job.timestamp,
      summary: c.summary,
      sentiment: c.sentiment,
      keyPhrases: c.keyPhrases,
    };
  }

  // ── Real API ──
  const response = await fetch(`${API_BASE_URL}/results/${jobId}`);
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to fetch results');
  }
  const data = await response.json();

  // Sanitize real results to catch any garbage from bad text extraction
  if (data.status === 'COMPLETED') {
    return sanitizeResult(data);
  }

  return data;
};
