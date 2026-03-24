const env = require('../config/env');

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const REQUEST_TIMEOUT_MS = 20000;
const BLOCKED_PATTERNS = [
  /find a way to generate a report/i,
  /cannot generate a report/i,
  /provided data does not support/i,
  /i do not have enough information to generate/i,
];

function hasGroqConfig() {
  return Boolean(env.groqApiKey);
}

function cleanAssistantReply(reply) {
  if (!reply) {
    return null;
  }

  const normalized = reply.trim();
  if (!normalized) {
    return null;
  }

  if (BLOCKED_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return null;
  }

  return normalized;
}

async function callGroq(messages) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.groqApiKey}`,
      },
      body: JSON.stringify({
        model: env.groqModel,
        temperature: 0.2,
        messages,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Groq request failed: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    return cleanAssistantReply(data.choices?.[0]?.message?.content?.trim() || null);
  } finally {
    clearTimeout(timeout);
  }
}

async function createFinancialSummary(report) {
  if (!hasGroqConfig()) {
    return null;
  }

  return callGroq([
    {
      role: 'system',
      content: 'You are a financial analytics assistant for a budgeting app. Analyze the user\'s monthly finances and return a concise, actionable briefing grounded only in the provided analytics data. Respond directly. Do not say you will generate a report, and do not use meta commentary.',
    },
    {
      role: 'user',
      content: `Write a short monthly financial briefing in 2-3 sentences and end with one concrete recommendation.\n\nAnalytics data: ${JSON.stringify(report)}`,
    },
  ]);
}

async function answerQuestion(question, financeContext, history) {
  if (!hasGroqConfig()) {
    return null;
  }

  const sanitizedHistory = Array.isArray(history)
    ? history
        .filter((item) => item && (item.role === 'user' || item.role === 'assistant') && typeof item.content === 'string')
        .slice(-6)
    : [];

  const messages = [
    {
      role: 'system',
      content: 'You are WealthWise AI Assistant inside a personal finance app. Answer using the user\'s real financial context. Keep answers practical, concise, and supportive. When giving advice, reference the user\'s numbers where possible. Do not mention hidden tools or system limitations.',
    },
    {
      role: 'system',
      content: financeContext,
    },
    ...sanitizedHistory,
  ];

  const lastTurn = sanitizedHistory[sanitizedHistory.length - 1];
  if (!lastTurn || lastTurn.role !== 'user' || lastTurn.content !== question) {
    messages.push({ role: 'user', content: question });
  }

  return callGroq(messages);
}

module.exports = {
  hasGroqConfig,
  createFinancialSummary,
  answerQuestion,
};
