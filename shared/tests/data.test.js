// Запуск: node --test tests/   (из папки shared)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { indexById, findMissingSourceIds } from '../src/services/sources.js';
import { filterAgencies, hasListedSponsor, getAgencyCities } from '../src/services/agencies.js';
import { formatPrice, buildFeatureMatrix, getOwnFeatures } from '../src/services/plans.js';
import { validateLead } from '../src/services/leads.js';
import { getProgress, groupStepsByPhase } from '../src/services/steps.js';

const dataDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'data');
const load = (name) => JSON.parse(readFileSync(join(dataDir, name), 'utf8'));

const sources = load('sources.json');
const program = load('program.json');
const steps = load('steps.json');
const agencies = load('agencies.json');
const sponsors = load('sponsors.json');
const plans = load('plans.json');
const notes = load('important-notes.json');
const index = indexById(sources.sources);

function collectSourceIds(node, acc = []) {
  if (Array.isArray(node)) node.forEach((n) => collectSourceIds(n, acc));
  else if (node && typeof node === 'object') {
    for (const [key, value] of Object.entries(node)) {
      if (key === 'sourceIds' && Array.isArray(value)) acc.push(...value);
      else if (key === 'sourceId' && typeof value === 'string') acc.push(value);
      else if (key === 'sources' && Array.isArray(value) && value.every((v) => typeof v === 'string')) acc.push(...value);
      else collectSourceIds(value, acc);
    }
  }
  return acc;
}

test('все ссылки на источники существуют в sources.json', () => {
  for (const [name, data] of Object.entries({ program, steps, agencies, sponsors, plans, notes })) {
    const missing = findMissingSourceIds(collectSourceIds(data), index);
    assert.deepEqual(missing, [], `${name}: неизвестные sourceId ${missing.join(', ')}`);
  }
});

test('у каждого источника есть url и дата проверки', () => {
  for (const s of sources.sources) {
    assert.match(s.url, /^https:\/\//, s.id);
    assert.match(s.checkedAt, /^\d{4}-\d{2}-\d{2}$/, s.id);
  }
});

test('у агентств есть обязательные поля, неподтверждённое не помечено как verified', () => {
  for (const a of agencies.agencies) {
    for (const field of ['id', 'name', 'description', 'cities', 'contacts', 'claims', 'verificationStatus', 'sources', 'lastVerifiedAt']) {
      assert.ok(field in a, `${a.id}: нет поля ${field}`);
    }
    assert.ok('usSponsor' in a, `${a.id}: нет usSponsor`);
    assert.ok(!('localLegalEntity' in a) && !('kazakhstanLicense' in a), `${a.id}: поля юрлица/лицензии РК не должны храниться`);
    assert.notEqual(a.verificationStatus, 'verified', `${a.id}: нет независимого подтверждения`);
    for (const s of a.contacts.social) assert.match(s.url, /^https:\/\//, `${a.id}: ${s.type}`);
    for (const p of a.publishedPrices) {
      for (const field of ['currency', 'season', 'included', 'notIncluded', 'sourceId', 'asOf']) {
        assert.ok(field in p, `${a.id}/${p.label}: у цены нет поля ${field}`);
      }
    }
  }
});

test('во всех данных нет сведений о лицензии и юрлице агентств', () => {
  const raw = ['agencies.json', 'program.json', 'steps.json', 'important-notes.json', 'sources.json']
    .map((n) => readFileSync(join(dataDir, n), 'utf8'))
    .join('\n');
  assert.doesNotMatch(raw, /юрлиц|БИН|ТОО|elicense|Лицензия в РК|лицензи[яию] агентств/i);
});

test('цены тарифов NNATO точные, в тенге, за год', () => {
  const prices = Object.fromEntries(plans.plans.map((p) => [p.id, [p.price, p.currency, p.period]]));
  assert.deepEqual(prices, { lite: [5990, 'KZT', 'year'], classic: [7990, 'KZT', 'year'], 'all-in': [15999, 'KZT', 'year'] });
  assert.equal(formatPrice(5990, 'KZT'), '5 990 ₸');
  assert.equal(formatPrice(15999, 'KZT'), '15 999 ₸');
  assert.doesNotMatch(JSON.stringify(plans), /уточняется/);
});

test('$17/час сопровождается сноской о том, что это не гарантия', () => {
  const feature = plans.features.find((f) => f.id === 'offer-matching');
  assert.ok(feature.footnote);
  assert.match(plans.footnotes[feature.footnote], /не гарантия/);
});

test('тарифы: All-in включает всё из Classic, Classic — всё из Lite', () => {
  const [lite, classic, allIn] = ['lite', 'classic', 'all-in'].map((id) => plans.plans.find((p) => p.id === id));
  lite.features.forEach((f) => assert.ok(classic.features.includes(f)));
  classic.features.forEach((f) => assert.ok(allIn.features.includes(f)));
  assert.deepEqual(getOwnFeatures(lite, plans), lite.features);
  const matrix = buildFeatureMatrix(plans);
  assert.equal(matrix.length, plans.features.length);
});

test('фильтры агентств', () => {
  const list = agencies.agencies;
  assert.ok(getAgencyCities(list).includes('Алматы'));
  const almaty = filterAgencies(list, { city: 'Алматы' }, sponsors);
  assert.ok(almaty.every((a) => a.cities.includes('Алматы')));
  const withSponsor = filterAgencies(list, { listedSponsorOnly: true }, sponsors);
  assert.ok(withSponsor.length > 0);
  assert.ok(withSponsor.every((a) => hasListedSponsor(a, sponsors)));
  assert.equal(filterAgencies(list, { query: 'несуществующее' }, sponsors).length, 0);
});

test('валидация заявки', () => {
  assert.deepEqual(Object.keys(validateLead({})).sort(), ['consent', 'contact', 'name', 'planId']);
  assert.deepEqual(validateLead({ name: 'Айгерим', contact: '+7 700 123 45 67', planId: 'lite', consent: true }), {});
  assert.deepEqual(validateLead({ name: 'Айгерим', contact: 'a@b.kz', planId: 'all-in', consent: true }), {});
  assert.ok(validateLead({ name: 'А', contact: '123', planId: 'x', consent: false }).contact);
});

test('шаги сгруппированы и прогресс считается', () => {
  const groups = groupStepsByPhase(steps);
  assert.equal(groups.reduce((n, g) => n + g.steps.length, 0), steps.steps.length);
  assert.equal(getProgress(steps, {}).done, 0);
  assert.ok(getProgress(steps, { 'eligibility:0': true }).done === 1);
});

test('в шагах есть все обязательные этапы', () => {
  assert.equal(steps.steps.length, 15);
  assert.ok(notes.agencyQuestions.length >= 5);
});
