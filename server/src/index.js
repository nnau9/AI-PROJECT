// HTTP-сервер чата-помощника NNATO.
//   POST /api/chat  { question, history?: [{ role, text }] } → { answer, links, handoff }
//   GET  /health    → { ok: true }
// Настройки — переменные окружения (см. server/.env.example). Ключ API только здесь, не в коде сайта.
// Модель: Google Gemini (GEMINI_API_KEY, бесплатный ключ) или Anthropic Claude (ANTHROPIC_API_KEY).

import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';

import { createChat, loadSiteContent, DEFAULT_SEARCH_DOMAINS } from './chat.js';

try {
  process.loadEnvFile(fileURLToPath(new URL('../.env', import.meta.url)));
} catch {
  /* .env необязателен: переменные можно задать в окружении хостинга */
}

const env = process.env;
const list = (value) => (value ? value.split(',').map((s) => s.trim()).filter(Boolean) : null);

// Какую модель использовать: LLM_PROVIDER, а если не задан — ту, для которой есть ключ (Gemini первым).
const providerName = (env.LLM_PROVIDER || (env.GEMINI_API_KEY ? 'gemini' : env.ANTHROPIC_API_KEY ? 'anthropic' : '')).toLowerCase();

async function createProvider() {
  if (providerName === 'gemini') {
    if (!env.GEMINI_API_KEY) throw new Error('Не задан GEMINI_API_KEY');
    const { GoogleGenAI } = await import('@google/genai');
    const { createGeminiProvider, DEFAULT_GEMINI_MODELS } = await import('./providers/gemini.js');
    return createGeminiProvider({
      client: new GoogleGenAI({ apiKey: env.GEMINI_API_KEY, httpOptions: { timeout: 55_000 } }),
      models: list(env.GEMINI_MODEL) ?? DEFAULT_GEMINI_MODELS,
      search: env.GEMINI_SEARCH || 'auto',
    });
  }
  if (providerName === 'anthropic') {
    if (!env.ANTHROPIC_API_KEY) throw new Error('Не задан ANTHROPIC_API_KEY');
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    const { createAnthropicProvider } = await import('./providers/anthropic.js');
    return createAnthropicProvider({
      client: new Anthropic({ timeout: 55_000, maxRetries: 1 }),
      model: env.CHAT_MODEL || 'claude-opus-5-5',
      effort: env.CHAT_EFFORT || 'low',
      searchDomains: list(env.SEARCH_DOMAINS) ?? DEFAULT_SEARCH_DOMAINS,
    });
  }
  throw new Error('Не задан ключ модели: впишите GEMINI_API_KEY (или ANTHROPIC_API_KEY) в server/.env');
}

let provider;
try {
  provider = await createProvider();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

const PORT = Number(env.PORT) || 8787;
const ALLOWED_ORIGINS = list(env.ALLOWED_ORIGINS) ?? ['*'];
const RATE_LIMIT = Number(env.RATE_LIMIT_PER_10_MIN) || 20;
const MAX_BODY = 32 * 1024;

const chat = createChat({
  provider,
  content: loadSiteContent(fileURLToPath(new URL('../../shared/data', import.meta.url))),
});

// Простое ограничение частоты по IP — чтобы чужие скрипты не тратили ключ.
const hits = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 10 * 60 * 1000);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > RATE_LIMIT;
}

function corsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes('*') ? '*' : ALLOWED_ORIGINS.includes(origin) ? origin : null;
  return allowed
    ? { 'Access-Control-Allow-Origin': allowed, 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', Vary: 'Origin' }
    : {};
}

function send(res, status, body, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', ...headers });
  res.end(JSON.stringify(body));
}

async function readJson(req) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY) throw Object.assign(new Error('Слишком большой запрос'), { status: 413 });
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

const server = createServer(async (req, res) => {
  const cors = corsHeaders(req.headers.origin ?? '');
  const path = new URL(req.url, 'http://localhost').pathname;

  if (req.method === 'OPTIONS') {
    res.writeHead(204, cors);
    return res.end();
  }
  if (req.method === 'GET' && path === '/health') return send(res, 200, { ok: true }, cors);
  if (req.method !== 'POST' || path !== '/api/chat') return send(res, 404, { error: 'Not found' }, cors);

  const ip = String(req.headers['x-forwarded-for'] ?? '').split(',')[0].trim() || req.socket.remoteAddress;
  if (rateLimited(ip)) return send(res, 429, { error: 'Слишком много вопросов подряд, попробуйте через несколько минут' }, cors);

  let body;
  try {
    body = await readJson(req);
  } catch (error) {
    return send(res, error.status ?? 400, { error: 'Некорректный запрос' }, cors);
  }
  const question = typeof body?.question === 'string' ? body.question.trim() : '';
  if (!question || question.length > 1000) return send(res, 400, { error: 'Нужен вопрос до 1000 символов' }, cors);
  const history = Array.isArray(body.history) ? body.history : [];

  try {
    // context из браузера не используется: сервер сам берёт материалы сайта из shared/data.
    return send(res, 200, await chat.answer({ question, history }), cors);
  } catch (error) {
    // 401/403 — неверный ключ, 429 — исчерпан лимит (на бесплатном тарифе Gemini — дневной).
    console.error(`Ошибка модели ${chat.provider}${error.status ? ` (HTTP ${error.status})` : ''}:`, error.message);
    // Браузер в этом случае ответит локально по материалам сайта.
    return send(res, 502, { error: 'Помощник временно недоступен' }, cors);
  }
});

server.listen(PORT, () => console.log(`Чат-помощник NNATO (${chat.provider}): http://localhost:${PORT}/api/chat`));
