// HTTP-сервер чата-помощника NNATO.
//   POST /api/chat  { question, history?: [{ role, text }] } → { answer, links, handoff }
//   GET  /health    → { ok: true }
// Настройки — переменные окружения (см. server/.env.example). Ключ API только здесь, не в коде сайта.

import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import Anthropic from '@anthropic-ai/sdk';

import { createChat, loadSiteContent, DEFAULT_SEARCH_DOMAINS } from './chat.js';

try {
  process.loadEnvFile(fileURLToPath(new URL('../.env', import.meta.url)));
} catch {
  /* .env необязателен: переменные можно задать в окружении хостинга */
}

const env = process.env;
if (!env.ANTHROPIC_API_KEY) {
  console.error('Не задан ANTHROPIC_API_KEY (server/.env или переменные окружения хостинга).');
  process.exit(1);
}

const PORT = Number(env.PORT) || 8787;
const ALLOWED_ORIGINS = (env.ALLOWED_ORIGINS || '*').split(',').map((s) => s.trim()).filter(Boolean);
const RATE_LIMIT = Number(env.RATE_LIMIT_PER_10_MIN) || 20;
const MAX_BODY = 32 * 1024;

const chat = createChat({
  client: new Anthropic({ timeout: 55_000, maxRetries: 1 }),
  content: loadSiteContent(fileURLToPath(new URL('../../shared/data', import.meta.url))),
  model: env.CHAT_MODEL || 'claude-opus-5-5',
  effort: env.CHAT_EFFORT || 'low',
  searchDomains: env.SEARCH_DOMAINS ? env.SEARCH_DOMAINS.split(',').map((s) => s.trim()).filter(Boolean) : DEFAULT_SEARCH_DOMAINS,
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
    if (error instanceof Anthropic.RateLimitError) console.error('Лимит API Anthropic:', error.message);
    else if (error instanceof Anthropic.AuthenticationError) console.error('Неверный ANTHROPIC_API_KEY');
    else if (error instanceof Anthropic.APIError) console.error(`Ошибка API ${error.status}:`, error.message);
    else console.error('Ошибка чата:', error);
    // Браузер в этом случае ответит локально по материалам сайта.
    return send(res, 502, { error: 'Помощник временно недоступен' }, cors);
  }
});

server.listen(PORT, () => console.log(`Чат-помощник NNATO: http://localhost:${PORT}/api/chat`));
