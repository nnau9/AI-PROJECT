// Запуск: npm test (из папки shared)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import {
  buildKnowledgeBase,
  createIndex,
  findAnswer,
  selectContext,
  tokenize,
  ASSISTANT_SUGGESTIONS,
} from '../src/services/assistant.js';
import { createAssistantRepository } from '../src/repositories/assistantRepository.js';

const dataDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'data');
const load = (name) => JSON.parse(readFileSync(join(dataDir, name), 'utf8'));

const content = {
  program: load('program.json'),
  steps: load('steps.json'),
  agencies: load('agencies.json'),
  sponsors: load('sponsors.json'),
  plans: load('plans.json'),
  importantNotes: load('important-notes.json'),
  sources: load('sources.json'),
};
const kb = buildKnowledgeBase(content);
const index = createIndex(kb);
const ROUTES = ['/', '/steps', '/agencies', '/important', '/plans', '/apply', '/sources'];

test('база знаний: уникальные id, непустые тексты, ссылки только на разделы сайта', () => {
  const ids = kb.map((e) => e.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const entry of kb) {
    assert.ok(entry.title && entry.text.length > 20, entry.id);
    assert.doesNotMatch(entry.text, /undefined|null|NaN|\.\.(?!\.)/, entry.id);
    if (entry.link) {
      assert.ok(ROUTES.includes(entry.link.to.split(/[#?]/)[0]), `${entry.id}: ${entry.link.to}`);
      assert.ok(entry.link.label, entry.id);
    }
  }
});

test('разбор текста: падежи, синонимы и коды документов', () => {
  assert.deepEqual(tokenize('визу'), tokenize('визы'));
  assert.deepEqual(tokenize('Сколько стоит?'), tokenize('цена'));
  assert.deepEqual(tokenize('DS-160'), ['ds160']);
  assert.deepEqual(tokenize('J-1'), ['j1']);
  assert.deepEqual(tokenize('All-in'), tokenize('all in'));
  assert.deepEqual(tokenize('а что это такое?'), []);
});

// Вопрос → id карточки, из которой должен быть взят ответ.
const CASES = [
  ['Сколько стоят тарифы NNATO?', 'plans'],
  ['какие у вас тарифы', 'plans'],
  ['Сколько стоит Classic?', 'plan-classic'],
  ['что входит в all-in', 'plan-all-in'],
  ['тариф лайт', 'plan-lite'],
  ['Есть ли курс английского?', 'feature-english-course'],
  ['в каком тарифе есть куратор', 'feature-curator-group'],
  ['вы подбираете работу от 17 долларов?', 'feature-offer-matching'],
  ['как оплатить подписку', 'payment'],
  ['можно ли вернуть деньги за тариф', 'payment'],
  ['Кто может участвовать?', 'eligibility'],
  ['какие требования к студентам', 'eligibility'],
  ['до скольки лет можно поехать', 'age'],
  ['есть ли ограничения по возрасту', 'age'],
  ['что такое work and travel', 'program'],
  ['Что такое NNATO?', 'about'],
  ['чем вы занимаетесь', 'about'],
  ['сколько длится программа', 'fact-max-duration'],
  ['можно ли поехать второй раз', 'fact-readmission'],
  ['сколько стоит SEVIS', 'fact-sevis-fee'],
  ['какой визовый сбор', 'fact-visa-fee'],
  ['нужна ли страховка', 'fact-insurance'],
  ['можно ли остаться после окончания программы и попутешествовать', 'fact-grace-period'],
  ['кем нельзя работать', 'jobs'],
  ['какая работа запрещена', 'jobs'],
  ['Какие расходы на программу?', 'costs'],
  ['сколько денег нужно на поездку', 'costs'],
  ['сколько стоят билеты', 'cost-flight'],
  ['с чего начать', 'steps'],
  ['как поехать в сша', 'steps'],
  ['что такое DS-2019', 'step-ds2019'],
  ['как заполнить ds-160', 'step-ds160'],
  ['когда покупать билеты', 'step-tickets'],
  ['как сменить работу в США', 'step-changes'],
  ['Как выбрать агентство?', 'step-compare'],
  ['какие агентства есть в казахстане', 'agencies'],
  ['какое агентство лучшее', 'agencies'],
  ['агентства в Караганде', 'city-Караганда'],
  ['есть ли агентство в Костанае', 'city-Костанай'],
  ['контакты IEC', 'agency-iec'],
  ['телефон KCET', 'agency-kcet'],
  ['расскажи про American Trip', 'agency-american-trip'],
  ['сколько берут агентства', 'agency-prices'],
  ['кто такой спонсор J-1', 'sponsors'],
  ['список спонсоров', 'sponsors'],
  ['вы гарантируете визу?', 'guarantees'],
  ['дадут ли мне визу', 'guarantees'],
  ['как не попасть на мошенников', 'red-flags'],
  ['что спросить у агентства', 'agency-questions'],
  ['что проверить до оплаты', 'before-paying'],
  ['сколько можно заработать за лето', 'earnings'],
  ['какая зарплата', 'earnings'],
  ['у меня забрали паспорт, куда звонить', 'hotlines'],
  ['горячая линия', 'hotlines'],
  ['можно ли работать на двух работах', 'step-changes'],
  ['какие у вас есть агентства', 'agencies'],
  ['какой у вас адрес', 'org-details'],
  ['ваш инстаграм', 'org-details'],
  ['телефон KCET', 'agency-kcet'],
  ['как с вами связаться', 'contact'],
  ['хочу поговорить с менеджером', 'contact'],
  ['откуда эта информация', 'sources'],
  ['ты бот?', 'assistant'],
  ['на что смотреть в договоре с агентством', 'note-contract'],
  ['какие у меня трудовые права', 'note-rights'],
];

test('помощник находит ответы на типичные вопросы', () => {
  const failures = [];
  for (const [question, expected] of CASES) {
    const answer = findAnswer(question, index);
    if (answer.entryId !== expected) failures.push(`«${question}» → ${answer.entryId} (ожидалось ${expected})`);
  }
  assert.deepEqual(failures, []);
});

test('подсказки в чате ведут к осмысленным ответам', () => {
  for (const question of ASSISTANT_SUGGESTIONS) {
    assert.equal(findAnswer(question, index).matched, true, question);
  }
});

test('ответы опираются на данные сайта', () => {
  const plansAnswer = findAnswer('сколько стоят тарифы', index).text;
  for (const price of [/5\s990\s₸/, /7\s990\s₸/, /15\s999\s₸/]) assert.match(plansAnswer, price);
  assert.match(findAnswer('подбор оффера от 17 долларов в час', index).text, /не гарантия/);
  assert.match(findAnswer('вы гарантируете визу?', index).text, /консульский сотрудник/);
  assert.match(findAnswer('горячая линия J-1', index).text, /1-866-283-9090/);
});

test('на вопросы вне материалов сайта помощник честно отвечает, что ответа нет', () => {
  const unknown = [
    'какая погода в Майами',
    'посоветуй фильм на вечер',
    'сколько будет дважды два',
    'как получить грин-карту',
    'курс доллара сегодня',
    'какой курс тенге',
    'есть ли мобильное приложение',
    'налоги в сша',
    'нужен ли загранпаспорт',
    'asdfgh qwerty',
  ];
  for (const question of unknown) {
    const answer = findAnswer(question, index);
    assert.equal(answer.matched, false, `«${question}» → ${answer.entryId}`);
    assert.match(answer.text, /не нахожу ответа/);
    assert.equal(answer.links[0].to, '/apply');
  }
});

test('приветствие и благодарность не уходят в поиск', () => {
  assert.equal(findAnswer('Привет!', index).entryId, 'greeting');
  assert.equal(findAnswer('спасибо большое', index).entryId, 'thanks');
  assert.equal(findAnswer('   ', index).matched, true);
});

test('репозиторий: без endpoint отвечает локально', async () => {
  const repo = createAssistantRepository({ loadContent: async () => content, delayMs: 0 });
  assert.equal(repo.isConnected, false);
  const answer = await repo.ask('сколько стоит Lite?');
  assert.equal(answer.mode, 'local');
  assert.match(answer.text, /5\s990\s₸/);
});

test('репозиторий: с endpoint отправляет вопрос, историю и контекст; ссылки — только внутренние', async () => {
  let request = null;
  const fetchImpl = async (url, init) => {
    request = { url, body: JSON.parse(init.body) };
    return {
      ok: true,
      json: async () => ({
        answer: 'Ответ модели',
        links: [{ to: '/plans', label: 'Тарифы' }, { to: 'https://evil.example', label: 'x' }, { to: '//evil.example', label: 'y' }],
      }),
    };
  };
  const repo = createAssistantRepository({ endpoint: 'https://api.example/chat', fetchImpl, loadContent: async () => content, delayMs: 0 });
  const answer = await repo.ask('сколько стоит Lite?', [{ role: 'user', text: 'привет' }]);
  assert.equal(request.url, 'https://api.example/chat');
  assert.equal(request.body.question, 'сколько стоит Lite?');
  assert.deepEqual(request.body.history, [{ role: 'user', text: 'привет' }]);
  assert.ok(request.body.context.length > 0 && request.body.context.length <= 6);
  assert.deepEqual(answer, { text: 'Ответ модели', links: [{ to: '/plans', label: 'Тарифы' }], matched: true, topic: null, mode: 'api' });
});

test('репозиторий: при сбое endpoint возвращается локальный ответ', async () => {
  const fetchImpl = async () => ({ ok: false, status: 500 });
  const repo = createAssistantRepository({ endpoint: 'https://api.example/chat', fetchImpl, loadContent: async () => content, delayMs: 0 });
  const answer = await repo.ask('сколько стоит Lite?');
  assert.equal(answer.mode, 'local');
  assert.match(answer.text, /5\s990\s₸/);
  assert.ok(selectContext('тарифы', index).length > 0);
});
