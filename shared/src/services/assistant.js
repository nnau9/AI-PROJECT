// Помощник сайта: отвечает на вопросы только по материалам из shared/data.
//
// 1. buildKnowledgeBase(content) собирает из JSON-контента короткие «карточки ответов».
//    Тексты и цифры берутся из данных, поэтому при правке JSON ответы обновляются сами.
// 2. findAnswer(question, kb) подбирает карточку по словам вопроса. Если уверенного
//    совпадения нет — честно сообщает об этом и предлагает связаться с командой.
//
// Чистые функции без DOM и сети: работают в web, mobile и в тестах Node.

import { formatPrice, formatPlanPrice, getOwnFeatures, getIncludedPlanNames } from './plans.js';
import { formatDate, formatMoney } from './format.js';
import { AGENCY_STATUS_LABELS } from './agencies.js';
import { groupStepsByPhase } from './steps.js';

/* ------------------------------------------------------------------ */
/* Разбор текста                                                        */
/* ------------------------------------------------------------------ */

const STOP_WORDS = new Set(`
  и в во на с со к ко по о об от до за из у а но или ли же бы не ни да нет то это этот эта эти
  как что чем кто где когда какой какая какие какое каком какую каких чего кого кому
  я мне меня мой моя мои мы нам нас наш вы вам вас ваш ваши ваша он она они его ее их
  для при про над под без через между если чтобы тоже также еще уже очень просто только
  есть быть будет будут был была было были можно нужно надо ли там тут здесь вот ну
  пожалуйста подскажите подскажи скажите скажи расскажите расскажи объясните объясни хочу хотел хотела
  узнать интересует интересно вопрос такое такой такая сколько скольки нужна нужен нужны после перед самый самая самое
  and the of to is are in for on
`.split(/\s+/).filter(Boolean));

// Синонимы и разговорные варианты → слово, которое встречается в карточках.
const SYNONYMS = {
  стоит: 'цена', стоят: 'цена', стоимость: 'цена', стоимости: 'цена', цены: 'цена', цену: 'цена', ценам: 'цена',
  прайс: 'цена', почем: 'цена', дорого: 'цена', дешево: 'цена', обойдется: 'цена',
  дешевый: 'цена', дешевле: 'цена', дорогой: 'цена', дороже: 'цена',
  wat: 'swt', ват: 'swt', ворк: 'work', тревел: 'travel', трэвел: 'travel', трэвэл: 'travel',
  америка: 'сша', америку: 'сша', америке: 'сша', usa: 'сша',
  ннато: 'nnato', нато: 'nnato',
  // «лето» и «лет» после отсечения окончаний совпали бы
  лето: 'summer', летом: 'summer', летний: 'summer', летние: 'summer', летних: 'summer',
  лайт: 'lite', классик: 'classic', олин: 'allin', оллин: 'allin',
  инглиш: 'английский', english: 'английский',
  зп: 'зарплата', заработок: 'зарплата', заработать: 'зарплата', заработаю: 'зарплата', доход: 'зарплата',
  платят: 'зарплата', оклад: 'зарплата',
  самолет: 'перелет', авиабилеты: 'билеты', авиабилет: 'билеты',
  посольство: 'посольстве', консульство: 'посольстве', консул: 'посольстве',
  интервью: 'собеседование',
  квартира: 'жилье', общежитие: 'жилье', аренда: 'жилье', проживание: 'жилье', жить: 'жилье', поселиться: 'жилье',
  развод: 'мошенники', обман: 'мошенники', обманут: 'мошенники', кидалово: 'мошенники', скам: 'мошенники',
  мошенничество: 'мошенники', мошенник: 'мошенники',
  связаться: 'контакт', связываться: 'контакт', свяжитесь: 'контакт', свяжусь: 'контакт',
  оператор: 'контакт', менеджер: 'контакт', позвонить: 'контакт', написать: 'контакт',
  поговорить: 'контакт', пообщаться: 'контакт', обсудить: 'контакт',
  контакты: 'контакт', контактов: 'контакт',
  фирма: 'агентство', фирмы: 'агентство', компания: 'агентство', компании: 'агентство',
  алмата: 'алматы', алмате: 'алматы', астане: 'астана', астану: 'астана', караганде: 'караганда', костанае: 'костанай',
  длится: 'длительность', длиться: 'длительность', продолжительность: 'длительность', срок: 'длительность',
};

const ENDINGS = [
  'иями', 'ями', 'ами', 'ией', 'иях', 'ого', 'его', 'ому', 'ему', 'ыми', 'ими', 'ешь', 'ишь', 'ете', 'ите',
  'ают', 'яют', 'уют', 'ует', 'ать', 'ять', 'ить', 'еть',
  'ая', 'яя', 'ое', 'ее', 'ые', 'ие', 'ый', 'ий', 'ой', 'ей', 'ом', 'ем', 'ам', 'ям', 'ах', 'ях', 'ов', 'ев',
  'ия', 'ию', 'ии', 'ью', 'ть', 'ет', 'ут', 'ют', 'ит', 'ат', 'ят',
  'а', 'я', 'о', 'е', 'ы', 'и', 'у', 'ю', 'ь', 'й',
];

/** Нижний регистр, «ё» → «е», коды вида DS-160 и J-1 склеиваются в ds160 и j1. */
export function normalizeText(text) {
  return String(text ?? '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/all[\s-]?in/g, 'allin')
    .replace(/\b([a-z]{1,2})[\s-](\d{1,4})\b/g, '$1$2')
    .replace(/[^a-zа-я0-9]+/g, ' ')
    .trim();
}

/** Грубое отсечение русских окончаний: «визу», «визы», «виза» → «виз». */
export function stem(word) {
  if (!/[а-я]/.test(word) || word.length <= 3) return word;
  let w = word.replace(/(ся|сь)$/, '');
  for (const ending of ENDINGS) {
    if (w.length - ending.length >= 3 && w.endsWith(ending)) {
      w = w.slice(0, -ending.length);
      break;
    }
  }
  return w;
}

// «У вас», «ваш» в вопросе посетителя — это про сам сервис NNATO. В карточках такое слово
// записано в ключевых словах как ourservice; в текстах сайта местоимения ничего не значат.
const SERVICE_TOKEN = 'ourservice';
const SERVICE_PRONOUNS = new Set('вас вам вами ваш ваша ваше ваши вашу вашего вашей вашем ваших'.split(' '));

/**
 * Текст → значимые основы слов (без служебных слов, с учётом синонимов).
 * fromVisitor: true — текст вопроса посетителя (см. SERVICE_PRONOUNS).
 */
export function tokenize(text, { fromVisitor = false } = {}) {
  const result = [];
  for (const raw of normalizeText(text).split(' ')) {
    if (!raw) continue;
    if (SERVICE_PRONOUNS.has(raw)) {
      if (fromVisitor) result.push(SERVICE_TOKEN);
      continue;
    }
    const word = SYNONYMS[raw] ?? raw;
    if (STOP_WORDS.has(word)) continue;
    if (word.length < 2 && !/\d/.test(word)) continue;
    const base = stem(word);
    result.push(SYNONYMS[base] ? stem(SYNONYMS[base]) : base);
  }
  return result;
}

/* ------------------------------------------------------------------ */
/* База знаний                                                          */
/* ------------------------------------------------------------------ */

const LIST_LIMIT = 8;

/** Маркированный список; длинные списки обрезаются с честной пометкой. */
function bullets(items = [], limit = LIST_LIMIT) {
  const clean = items.filter(Boolean);
  const lines = clean.slice(0, limit).map((item) => `• ${item}`);
  const rest = clean.length - lines.length;
  return rest > 0 ? `${lines.join('\n')}\n\n…и ещё ${rest} — полный список на странице.` : lines.join('\n');
}

const para = (...parts) => parts.filter(Boolean).join('\n\n');
// Дата в конце предложения: «11 ноября 2026 г.» уже оканчивается точкой — вторую не ставим.
const dateText = (iso) => sentence(formatDate(iso));
const sentence = (text) => (text && !/[.!?…»]$/.test(text.trim()) ? `${text.trim()}.` : text?.trim() ?? '');

const FACT_KEYWORDS = {
  'max-duration': 'длительность сколько длится программа месяцев на сколько едут продлить продление максимум',
  readmission: 'повторно второй раз снова еще раз поехать опять повторное участие',
  'arrival-window': 'въезд въехать прилететь раньше заранее до начала программы за сколько дней прилет',
  'grace-period': 'после окончания программы остаться путешествовать выезд grace period 30 дней льготный период',
  'program-dates': 'даты программы окно когда начинается сезон начало конец лето date chart',
  'sevis-fee': 'sevis севис i901 сбор цена 35 220',
  'visa-fee': 'визовый консульский сбор цена визы виза mrv 185 180',
  insurance: 'страховка медицинская страхование медстраховка',
  'kz-vwp': 'visa waiver безвизовый vwp оффер до въезда',
};

const STEP_KEYWORDS = {
  eligibility: 'подхожу проверить требования каникулы деканат',
  compare: 'сравнить выбрать агентство спонсора как выбирать',
  apply: 'подать заявку в агентство документы паспорт справка с места учебы проверка английского',
  contract: 'договор подписать подписание график платежей',
  interview: 'интервью с работодателем агентством спонсором рассказ о себе',
  'job-offer': 'оффер job offer вакансия условия работы работодатель ставка часы',
  ds2019: 'ds2019 форма документ спонсора',
  ds160: 'ds160 анкета запись на собеседование сборы',
  'visa-interview': 'визовое собеседование в посольстве пройти что говорить',
  'after-visa': 'получил визу после визы проверить визу',
  tickets: 'билеты купить перелет когда покупать рейс',
  orientation: 'ориентация перед вылетом копии документов план связи',
  arrival: 'по прибытии прилетел что делать после прилета сообщить спонсору',
  changes: 'сменить работу поменять работодателя вторая работа на двух работах подработка смена адреса переезд',
  return: 'возвращение вернуться домой конец программы',
};

const NOTE_KEYWORDS = {
  contract: 'договор с агентством проверить договор что смотреть в договоре возврат денег при отказе в визе квитанция',
  'job-offer': 'job offer оффер письменно устные обещания условия работы',
  housing: 'жилье транспорт депозит заселение как добираться',
  insurance: 'медицинская страховка покрытие кто предоставляет',
  safety: 'безопасность копии документов круглосуточный номер спонсора',
  rights: 'трудовые права минимальная оплата сверхурочные паспорт забрали know your rights',
  changes: 'смена работы адреса поменять работу',
  interview: 'визовое собеседование в посольстве как пройти отказ',
  return: 'возвращение вернуться продление остаться дольше',
};

const COST_KEYWORDS = {
  'agency-fee': 'агентский сбор услуги агентства цена',
  'sponsor-fee': 'плата спонсору программа сбор спонсора цена',
  flight: 'перелет билеты цена билетов',
  housing: 'жилье депозит цена жилья',
  living: 'питание транспорт еда расходы на жизнь',
  reserve: 'резерв деньги с собой сколько брать запас на первое время',
};

const FEATURE_KEYWORDS = {
  guide: 'гайд по шагам',
  checklists: 'чек-листы материалы',
  'agency-table': 'таблица агентств сравнение',
  'curator-group': 'куратор группа чат',
  'english-course': 'английский курс разговорный язык',
  'visa-checklist': 'чек-лист визовое собеседование',
  'extra-materials': 'дополнительные материалы рекомендации',
  'personal-author': 'личная связь с автором один на один',
  'max-support': 'индивидуальная поддержка',
  'offer-matching': 'подбор оффера работы вакансии 17 долларов в час ставка выбрать город штат',
  'visa-prep': 'подготовка к визовому собеседованию',
  'personal-support': 'личное сопровождение',
};

function describeAgencyPrice(price) {
  const amount = formatMoney(price.amount, price.currency, price.prefix ?? '');
  const season = price.season ? `сезон ${price.season}` : 'сезон не указан';
  const flags = [price.stale ? 'устаревшая цена' : null, price.closed ? 'набор закрыт' : null].filter(Boolean);
  return `${price.label} — ${amount} (${[season, ...flags].join(', ')})`;
}

function describeAgency(agency) {
  const sponsor = agency.usSponsor?.claimedNames?.length
    ? `Спонсор J-1 (по заявлению агентства): ${agency.usSponsor.claimedNames.join(', ')}.`
    : 'Спонсор J-1 на проверенных страницах не назван.';
  const offices = (agency.offices ?? [])
    .map((o) => (o.address ? `${o.city}: ${o.address}` : `${o.city}: адрес не указан`));
  const phones = (agency.contacts?.phones ?? []).map((p) => (p.label ? `${p.value} (${p.label})` : p.value));
  const contacts = [
    agency.contacts?.website ? `Сайт: ${agency.contacts.website}` : null,
    phones.length ? `Телефоны: ${phones.join(', ')}` : null,
    agency.contacts?.emails?.length ? `Email: ${agency.contacts.emails.join(', ')}` : null,
  ];
  const prices = (agency.publishedPrices ?? []).map(describeAgencyPrice);
  return para(
    `${agency.name}. ${agency.description}`,
    sponsor,
    `Статус проверки: ${AGENCY_STATUS_LABELS[agency.verificationStatus] ?? agency.verificationStatus}.`,
    offices.length ? `Офисы:\n${bullets(offices)}` : 'Город и адрес офиса на сайте агентства не указаны.',
    `Контакты (с сайта агентства):\n${bullets(contacts)}`,
    prices.length ? `Цены с сайта агентства:\n${bullets(prices)}` : 'Цены на сайте агентства не опубликованы.',
    `Это не рейтинг и не рекомендация. Сведения сверены ${dateText(agency.lastVerifiedAt)}`,
  );
}

/**
 * Собирает карточки ответов из контента сайта.
 * @param {{program?:any, steps?:any, agencies?:any, sponsors?:any, plans?:any, importantNotes?:any, sources?:any}} content
 * @returns {{id:string, title:string, keywords:string, text:string, link:{to:string,label:string}|null}[]}
 */
export function buildKnowledgeBase(content = {}) {
  const { program, steps, agencies, sponsors, plans, importantNotes: notes, sources } = content;
  const entries = [];
  const add = (entry) => entries.push({ keywords: '', link: null, ...entry });

  /* ---------- NNATO и программа ---------- */
  if (program) {
    add({
      id: 'about',
      title: 'Что такое NNATO',
      keywords: 'nnato ourservice кто вы о сервисе о сайте чем занимаетесь что это за сайт что вы делаете услуги сервиса',
      text: para(
        program.meta.serviceDisclaimer,
        'На сайте есть:\n' + bullets([
          'путь участника по шагам с чек-листом',
          'сравнение агентств Казахстана по проверяемым параметрам',
          'расходы на программу, риски и тревожные сигналы',
          'годовые тарифы сопровождения NNATO',
        ]),
      ),
      link: { to: '/plans', label: 'Тарифы NNATO' },
    });

    add({
      id: 'program',
      overview: true,
      title: 'Что такое Summer Work Travel',
      keywords: 'swt summer work travel что это за программа суть культурный обмен bridgeusa j1 виза',
      text: para(`${program.summary.title}.`, program.summary.lead, bullets(program.summary.points.map((p) => p.text))),
      link: { to: '/steps', label: 'Как поехать' },
    });

    const age = program.eligibility.find((e) => e.id === 'age');
    add({
      id: 'eligibility',
      title: 'Кто может участвовать',
      keywords: 'кто может участвовать участие требования условия критерии подхожу подходит студент очно заочно вуз университет колледж курс семестр английский уровень языка могу поехать',
      text: para(
        'Базовые условия BridgeUSA:',
        bullets(program.eligibility.filter((e) => e.id !== 'age').map((e) => e.text)),
        age?.text,
      ),
      link: { to: '/steps#eligibility', label: 'Шаг «Проверить, подходите ли вы»' },
    });

    const ageClaims = (agencies?.agencies ?? []).flatMap((a) =>
      a.claims.filter((c) => /\d+\s*[–-]\s*\d+\s*(лет|года)/.test(c.text)).map((c) => `${a.name}: ${c.text}`));
    add({
      id: 'age',
      title: 'Возраст участника',
      keywords: 'возраст сколько лет возрастные ограничения старше младше 18 лет',
      text: para(
        age?.text ?? 'Возрастные требования на сайте не описаны.',
        ageClaims.length ? `Что пишут сами агентства (заявления организаций):\n${bullets(ageClaims)}` : null,
      ),
      link: { to: '/agencies', label: 'Агентства' },
    });

    const costById = Object.fromEntries((notes?.costItems ?? []).map((c) => [c.id, c]));
    const factCost = { 'sevis-fee': 'sevis', 'visa-fee': 'visa-fee' };
    for (const fact of program.facts) {
      const cost = costById[factCost[fact.id]];
      add({
        id: `fact-${fact.id}`,
        title: fact.label,
        keywords: FACT_KEYWORDS[fact.id] ?? '',
        text: para(
          fact.value ? sentence(`${fact.label}: ${fact.value}`) : `${fact.label}: подтверждённых данных на сайте пока нет.`,
          fact.note,
          cost && cost.text !== fact.note ? cost.text : null,
          `Проверено ${dateText(fact.verifiedAt)}`,
        ),
        link: { to: '/important#facts', label: 'Ключевые правила и сроки' },
      });
    }

    add({
      id: 'jobs',
      title: 'Какая работа разрешена и запрещена',
      keywords: 'работа кем можно работать нельзя запрещено запрещенные виды работ вакансии какая работа няня водитель склад ночная',
      text: para(
        program.summary.points[1]?.text,
        `${program.excludedJobs.title}:`,
        bullets(program.excludedJobs.items),
      ),
      link: { to: '/important#facts', label: 'Правила программы' },
    });

    add({
      id: 'before-paying',
      title: 'Что проверить до оплаты',
      keywords: 'до оплаты перед оплатой что проверить платить агентству безопасно ли платить',
      text: para('До оплаты проверьте:', bullets(program.checkBeforePaying.map((c) => `${c.title}. ${c.text}`))),
      link: { to: '/important', label: 'Важные моменты' },
    });

    add({
      id: 'hotlines',
      title: 'Экстренные контакты и помощь в США',
      keywords: 'экстренная ситуация горячая линия помощь проблема эксплуатация злоупотребление забрали паспорт не платят зарплату 911 куда звонить обратиться жалоба',
      text: para(
        'Контакты помощи участникам J-1:',
        bullets(program.hotlines.map((h) => `${h.title}: ${h.value}${h.note ? ` — ${h.note}` : ''}`)),
        'Если есть угроза жизни — сразу звоните 911.',
      ),
      link: { to: '/important#help', label: 'Экстренные контакты' },
    });

    add({
      id: 'guarantees',
      title: 'Гарантии визы и участия',
      keywords: 'гарантия гарантируете гарантии виза дадут ли визу шансы вероятность отказ одобрение 100 процентов точно получу',
      text: para(program.meta.visaDisclaimer, program.meta.serviceDisclaimer, program.meta.conditionsDisclaimer),
      link: { to: '/important#interview', label: 'Визовое собеседование' },
    });
  }

  /* ---------- Шаги ---------- */
  if (steps) {
    const phases = groupStepsByPhase(steps);
    add({
      id: 'steps',
      overview: true,
      title: 'Как поехать: путь участника',
      keywords: 'как поехать в сша с чего начать шаги этапы процесс порядок действий путь план инструкция что делать сначала',
      text: para(
        `Путь участника — ${steps.steps.length} шагов в ${phases.length} этапах:`,
        bullets(phases.map((p) => `${p.title}: ${p.steps.map((s) => s.title.toLowerCase()).join('; ')}`), 10),
        steps.meta.disclaimer,
      ),
      link: { to: '/steps', label: 'Интерактивный чек-лист' },
    });

    for (const step of steps.steps) {
      add({
        id: `step-${step.id}`,
        title: step.title,
        keywords: STEP_KEYWORDS[step.id] ?? '',
        text: para(
          `${step.title}. ${step.summary}`,
          step.details,
          step.checklist.length ? `Чек-лист шага:\n${bullets(step.checklist)}` : null,
        ),
        link: { to: `/steps#${step.id}`, label: `Шаг «${step.title}»` },
      });
    }
  }

  /* ---------- Агентства и спонсоры ---------- */
  if (agencies) {
    const list = [...agencies.agencies].sort((a, b) => a.name.localeCompare(b.name, 'ru'));
    add({
      id: 'agencies',
      overview: true,
      title: 'Агентства Казахстана',
      keywords: 'агентства агентство список какие есть выбрать лучшее надежное рейтинг сравнить сравнение посоветуйте к кому обратиться',
      text: para(
        'На сайте сравниваются агентства (по алфавиту, это не рейтинг):',
        bullets(list.map((a) => {
          const where = a.cities.length ? a.cities.join(', ') : 'город не указан';
          const sponsor = a.usSponsor?.claimedNames?.length ? a.usSponsor.claimedNames.join(', ') : 'не назван';
          return `${a.name} — ${where}; спонсор J-1: ${sponsor}`;
        })),
        'NNATO не называет «лучшее» агентство: мы показываем только то, что нашли в источниках, и отмечаем, что подтверждено, а что — заявление самого агентства.',
      ),
      link: { to: '/agencies', label: 'Сравнить агентства' },
    });

    for (const agency of list) {
      add({
        id: `agency-${agency.id}`,
        title: agency.name,
        keywords: agency.cities.join(' '),
        text: describeAgency(agency),
        link: { to: '/agencies', label: 'Карточки агентств' },
      });
    }

    const cities = [...new Set(list.flatMap((a) => a.cities))];
    for (const city of cities) {
      const inCity = list.filter((a) => a.cities.includes(city));
      add({
        id: `city-${city}`,
        title: `Агентства: ${city}`,
        keywords: `агентства в городе ${city}`,
        text: para(
          `В данных сайта офис в городе ${city} указан у агентств:`,
          bullets(inCity.map((a) => {
            const office = a.offices.find((o) => o.city === city);
            return `${a.name}${office?.address ? ` — ${office.address}` : ''}`;
          })),
          'Адреса взяты с сайтов агентств — уточняйте перед визитом.',
        ),
        link: { to: '/agencies', label: 'Все агентства и фильтр по городу' },
      });
    }

    const priced = list.filter((a) => a.publishedPrices.length > 0);
    add({
      id: 'agency-prices',
      title: 'Цены агентств',
      keywords: 'цена агентств сколько берут агентства цена программы у агентства full self пакет',
      text: para(
        'Цены, опубликованные на сайтах агентств (это не цены NNATO):',
        bullets(priced.flatMap((a) => a.publishedPrices.map((p) => `${a.name}: ${describeAgencyPrice(p)}`))),
        'У остальных агентств цены на проверенных страницах не опубликованы. Что входит в цену и что оплачивается отдельно — в карточках агентств.',
      ),
      link: { to: '/agencies', label: 'Карточки агентств' },
    });
  }

  if (sponsors) {
    add({
      id: 'sponsors',
      title: 'Американские спонсоры J-1',
      keywords: `спонсор спонсоры кто такой спонсор список спонсоров bridgeusa официальный список проверить спонсора ${sponsors.sponsors.map((s) => s.shortName).join(' ')}`,
      text: para(
        sponsors.meta.description,
        `В списке (${sponsors.meta.listLabel}):`,
        bullets(sponsors.sponsors.filter((s) => s.listedForKazakhstan).map((s) => s.shortName), 15),
      ),
      link: { to: '/agencies', label: 'Спонсоры и агентства' },
    });
  }

  /* ---------- Тарифы NNATO ---------- */
  if (plans) {
    const featureById = Object.fromEntries(plans.features.map((f) => [f.id, f]));
    add({
      id: 'plans',
      overview: true,
      title: 'Тарифы и цены NNATO',
      keywords: 'ourservice тариф тарифы цена подписка подписки сколько стоят услуги пакеты чем отличаются разница какой тариф выбрать лучше',
      text: para(
        'Годовые тарифы NNATO:',
        bullets(plans.plans.map((p) => `${p.name} — ${formatPlanPrice(p, plans.meta.period)}. ${p.tagline}.`)),
        plans.meta.periodExplanation,
        plans.meta.notIncluded,
      ),
      link: { to: '/plans', label: 'Сравнить тарифы' },
    });

    for (const plan of plans.plans) {
      const included = getIncludedPlanNames(plan, plans);
      const own = getOwnFeatures(plan, plans).map((id) => featureById[id]?.title).filter(Boolean);
      add({
        id: `plan-${plan.id}`,
        title: `Тариф ${plan.name}`,
        keywords: `тариф ${plan.name} ${plan.id} цена что входит состав`,
        text: para(
          `Тариф ${plan.name} — ${formatPlanPrice(plan, plans.meta.period)}. ${plan.tagline}.`,
          included.length ? `Включает всё из тарифа ${included[0]}, а также:` : 'В тариф входит:',
          bullets(own, 12),
          plan.features.some((id) => featureById[id]?.footnote) ? plans.footnotes['offer-floor'] : null,
        ),
        link: { to: `/apply?plan=${plan.id}`, label: `Заявка на ${plan.name}` },
      });
    }

    for (const feature of plans.features) {
      const inPlans = plans.plans.filter((p) => p.features.includes(feature.id));
      if (inPlans.length === plans.plans.length) continue; // есть во всех тарифах — отвечает карточка «Тарифы»
      add({
        id: `feature-${feature.id}`,
        title: feature.title,
        keywords: `${FEATURE_KEYWORDS[feature.id] ?? ''} в каком тарифе входит ли есть ли`,
        text: para(
          `«${feature.title}» входит в ${inPlans.length > 1 ? 'тарифы' : 'тариф'}: ${inPlans
            .map((p) => `${p.name} (${formatPlanPrice(p, plans.meta.period)})`)
            .join(', ')}.`,
          feature.footnote ? plans.footnotes[feature.footnote] : null,
        ),
        link: { to: '/plans', label: 'Сравнить тарифы' },
      });
    }

    add({
      id: 'payment',
      title: 'Оплата и возврат подписки NNATO',
      keywords: 'ourservice оплата оплатить как купить покупка возврат вернуть деньги карта kaspi рассрочка договор оферта подписаться оформить тариф',
      text: para(plans.meta.paymentNote, plans.meta.periodExplanation, plans.meta.notIncluded),
      link: { to: '/apply', label: 'Оставить заявку' },
    });
  }

  /* ---------- Расходы, риски, права ---------- */
  if (notes) {
    const describeCost = (c) => `${c.title}: ${c.amount ? `${c.amount}. ` : ''}${c.text}`;
    add({
      id: 'costs',
      overview: true,
      title: 'Расходы на программу',
      keywords: 'расходы бюджет цена программы поездки участия сколько денег нужно затраты во сколько обойдется общая сумма полная цена',
      text: para(
        'Из чего складываются расходы на саму программу:',
        bullets(notes.costItems.map(describeCost)),
        notes.meta.note,
      ),
      link: { to: '/important#costs', label: 'Расходы на программу' },
    });

    for (const cost of notes.costItems) {
      if (!COST_KEYWORDS[cost.id]) continue;
      add({
        id: `cost-${cost.id}`,
        title: cost.title,
        keywords: COST_KEYWORDS[cost.id],
        text: para(sentence(describeCost(cost)), 'Точной суммы на сайте нет: мы публикуем только то, что подтверждено источником.'),
        link: { to: '/important#costs', label: 'Расходы на программу' },
      });
    }

    for (const section of notes.sections) {
      add({
        id: `note-${section.id}`,
        title: section.title,
        keywords: NOTE_KEYWORDS[section.id] ?? '',
        text: para(`${section.title}:`, bullets(section.items)),
        link: { to: `/important#${section.id}`, label: section.title },
      });
    }

    add({
      id: 'red-flags',
      title: 'Тревожные сигналы',
      keywords: 'мошенники тревожные сигналы красные флаги как не попасться опасность риски подозрительно гарантированный заработок',
      text: para('Тревожные сигналы — повод остановиться и проверить:', bullets(notes.redFlags)),
      link: { to: '/important#red-flags', label: 'Тревожные сигналы' },
    });

    add({
      id: 'agency-questions',
      title: 'Вопросы агентству до договора',
      keywords: 'что спросить у агентства вопросы агентству какие вопросы задать перед договором',
      text: para('Задайте агентству до подписания договора:', bullets(notes.agencyQuestions)),
      link: { to: '/agencies', label: 'Агентства' },
    });

    const rights = notes.sections.find((s) => s.id === 'rights');
    const offer = notes.sections.find((s) => s.id === 'job-offer');
    add({
      id: 'earnings',
      title: 'Заработок и ставка',
      keywords: 'зарплата сколько можно заработать ставка в час минимальная оплата деньги за лето окупится окупаемость',
      text: para(
        'Сумму заработка на сайте мы не называем: она зависит от конкретной вакансии, ставки и часов.',
        bullets([offer?.items?.[2], rights?.items?.[0], rights?.items?.[1]]),
        plans?.footnotes?.['offer-floor'],
        '«Гарантированный заработок» — один из тревожных сигналов.',
      ),
      link: { to: '/important#rights', label: 'Трудовые права' },
    });
  }

  /* ---------- Связь, источники, сам помощник ---------- */
  add({
    id: 'contact',
    title: 'Как связаться с командой NNATO',
    keywords: 'связаться контакт команда nnato ourservice заявка оставить заявку консультация обратная связь человек живой задать вопрос',
    text: para(
      'Связаться с командой NNATO можно через форму заявки: выберите тариф, оставьте имя и телефон или email, а вопрос напишите в поле «Комментарий».',
      'Паспорт, документы и оплату в форме не просят. Оплата на сайте не принимается.',
    ),
    link: { to: '/apply', label: 'Оставить заявку' },
  });

  // На сайте нет адреса, телефона и соцсетей NNATO — единственный канал связи — форма заявки.
  // Если контакты появятся, обновите эту карточку.
  add({
    id: 'org-details',
    title: 'Адрес, телефон и соцсети NNATO',
    keywords: 'nnato ourservice адрес офис телефон номер телефона инстаграм instagram телеграм telegram ватсап whatsapp email почта соцсети график работы часы работы выходные где находитесь',
    text: para(
      'Адреса офиса, телефона и соцсетей NNATO в материалах сайта нет — придумывать их я не буду.',
      'Связаться с командой можно через форму заявки: оставьте телефон или email, а вопрос напишите в поле «Комментарий».',
    ),
    link: { to: '/apply', label: 'Оставить заявку' },
  });

  if (sources) {
    add({
      id: 'sources',
      title: 'Источники и актуальность',
      keywords: 'источники откуда информация данные достоверность актуальность проверено когда обновлялось можно ли верить официальные',
      text: para(
        `Каждый изменяемый факт на сайте ссылается на источник с датой проверки и статусом. В реестре ${sources.sources.length} источников, последняя сверка — ${dateText(sources.meta.lastReviewAt)}`,
        'Если официальная страница не открылась при проверке, на сайте так и написано — сумму или правило мы в таком случае не утверждаем.',
      ),
      link: { to: '/sources', label: 'Все источники' },
    });
  }

  add({
    id: 'assistant',
    title: 'Кто этот помощник',
    keywords: 'ты кто бот робот человек ии искусственный интеллект нейросеть косатка помощник что умеешь как тебя зовут',
    text: para(
      'Я косатка — помощник NNATO. Отвечаю на вопросы по материалам этого сайта: программа Summer Work Travel, шаги, агентства, расходы, риски и тарифы.',
      'Я не человек и не юрист: мои ответы — общая информация, а не визовая или юридическая консультация. Если ответа на сайте нет, я так и скажу.',
    ),
    link: { to: '/apply', label: 'Связаться с командой' },
  });

  return entries;
}

/* ------------------------------------------------------------------ */
/* Поиск ответа                                                         */
/* ------------------------------------------------------------------ */

const FIELD_WEIGHTS = { keywords: 4, title: 3, text: 1 };
const STRONG_FIELDS = ['keywords', 'title'];
const PREFIX_MIN = 4;
const PREFIX_FACTOR = 0.8;
const PAIR_BONUS = 2;

// Слова, которые встречаются почти в любом вопросе о программе: учитываются с малым весом,
// чтобы не перетягивать ответ («можно ли поехать…», «…по программе», «…в США»).
const WEAK_TOKENS = new Set(
  ['поехать', 'ехать', 'поеду', 'программа', 'сша', 'казахстан', 'можно', 'работа', 'работать', 'участие', 'участвовать', SERVICE_TOKEN]
    .flatMap((w) => tokenize(w)),
);
const WEAK_FACTOR = 0.35;
const OVERVIEW_BOOST = 1.15; // при равенстве общий обзор темы важнее частной карточки
const PREFIX_MAX_DIFF = 3;

const pairKey = (a, b) => (a < b ? `${a} ${b}` : `${b} ${a}`);
const prefixMatch = (a, b) =>
  a.length >= PREFIX_MIN && b.length >= PREFIX_MIN && Math.abs(a.length - b.length) <= PREFIX_MAX_DIFF &&
  (a.startsWith(b) || b.startsWith(a));

const isWeak = (token) => WEAK_TOKENS.has(token) || [...WEAK_TOKENS].some((weak) => prefixMatch(weak, token));

/**
 * Индекс: для каждой карточки — основы слов с суммой весов полей, где они встречаются,
 * пары соседних слов из заголовка и ключевых слов, плюс редкость основ (IDF).
 */
export function createIndex(entries) {
  const docs = entries.map((entry) => {
    const weights = new Map();
    const strong = new Set();
    const pairs = new Set();
    for (const [field, weight] of Object.entries(FIELD_WEIGHTS)) {
      const tokens = tokenize(entry[field]);
      for (const token of new Set(tokens)) weights.set(token, (weights.get(token) ?? 0) + weight);
      if (STRONG_FIELDS.includes(field)) {
        tokens.forEach((token, i) => {
          strong.add(token);
          if (i > 0) pairs.add(pairKey(tokens[i - 1], token));
        });
      }
    }
    return { entry, weights, strong, pairs };
  });
  const df = new Map();
  for (const doc of docs) for (const token of doc.weights.keys()) df.set(token, (df.get(token) ?? 0) + 1);
  const idf = new Map([...df].map(([token, n]) => [token, Math.log(1 + docs.length / n)]));
  return { docs, idf, maxIdf: Math.log(1 + docs.length) };
}

/** Вес слова в карточке: точное совпадение основы или совпадение по началу слова. */
function matchToken(doc, token) {
  const exact = doc.weights.get(token);
  if (exact) return { weight: exact, strong: doc.strong.has(token) };
  let best = { weight: 0, strong: false };
  if (token.length < PREFIX_MIN) return best;
  for (const [candidate, weight] of doc.weights) {
    if (!prefixMatch(candidate, token)) continue;
    const strong = doc.strong.has(candidate);
    if (weight * PREFIX_FACTOR > best.weight) best = { weight: weight * PREFIX_FACTOR, strong: best.strong || strong };
    else if (strong) best.strong = true;
  }
  return best;
}

/** Карточки, отсортированные по близости к вопросу. */
export function rankEntries(question, index) {
  const sequence = tokenize(question, { fromVisitor: true });
  const tokens = [...new Set(sequence)];
  if (tokens.length === 0) return [];

  const importance = new Map(tokens.map((token) => {
    let idf = index.idf.get(token);
    if (idf === undefined) {
      // Слово может совпасть только по началу («визовый» ↔ «визов») — берём редкость ближайшего.
      idf = index.maxIdf;
      for (const [candidate, value] of index.idf) {
        if (prefixMatch(candidate, token)) { idf = value; break; }
      }
    }
    return [token, isWeak(token) ? idf * WEAK_FACTOR : idf];
  }));
  const total = tokens.reduce((sum, t) => sum + importance.get(t), 0);
  // Вопрос только из общих слов («как поехать в США») — тогда и они считаются значимыми.
  const allWeak = tokens.every(isWeak);

  return index.docs
    .map((doc) => {
      let score = 0;
      let covered = 0;
      let strong = false; // значимое слово вопроса есть в заголовке или ключевых словах
      let hit = false; // то же, но считая и «слабые» слова — для подсказок «возможно, поможет»
      for (const token of tokens) {
        const match = matchToken(doc, token);
        if (!match.weight) continue;
        score += importance.get(token) * match.weight;
        covered += importance.get(token);
        if (match.strong) hit = true;
        if (match.strong && (allWeak || !isWeak(token))) strong = true;
      }
      // Соседние слова вопроса стоят рядом и в заголовке или ключевых словах карточки.
      for (let i = 1; i < sequence.length; i += 1) {
        const [a, b] = [sequence[i - 1], sequence[i]];
        if (a !== b && doc.pairs.has(pairKey(a, b))) score += (importance.get(a) + importance.get(b)) * PAIR_BONUS;
      }
      const coverage = total ? covered / total : 0;
      if (doc.entry.overview) score *= OVERVIEW_BOOST;
      return { entry: doc.entry, score: score * coverage, coverage, strong, hit };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score);
}

const GREETING_RE = /^(привет|приветик|здравствуй|здравствуйте|добрый (день|вечер)|доброе утро|салем|салам|сәлем|hello|hi|hey|хай|ку)( .{0,20})?$/;
const THANKS_RE = /^(.{0,15} )?(спасибо|благодарю|рахмет|рақмет|thanks|thank you|пасиб|спс)( .{0,20})?$/;
const BYE_RE = /^(пока|до свидания|до встречи|всего доброго|bye)( .{0,10})?$/;

export const ASSISTANT_GREETING =
  'Привет! Я косатка — помощник NNATO. Отвечаю по материалам сайта: программа Summer Work Travel, шаги, агентства, расходы и тарифы. Что подсказать?';

export const ASSISTANT_SUGGESTIONS = [
  'Кто может участвовать?',
  'Сколько стоят тарифы NNATO?',
  'Какие расходы на программу?',
  'Как выбрать агентство?',
];

const CONTACT_LINK = { to: '/apply', label: 'Задать вопрос команде' };

/**
 * Ответ на вопрос по базе знаний.
 * matched: false — уверенного ответа в материалах сайта нет.
 * topic — заголовок карточки сайта, из которой взят ответ (показывается над ответом).
 * @returns {{ text: string, links: {to:string,label:string}[], matched: boolean, entryId: string|null, topic?: string|null }}
 */
export function findAnswer(question, index) {
  const normalized = normalizeText(question);
  if (!normalized) {
    return { text: 'Напишите вопрос — например, про тарифы, шаги или агентства.', links: [], matched: true, entryId: null };
  }
  if (GREETING_RE.test(normalized)) {
    return { text: 'Привет! Спросите про программу, шаги, агентства, расходы или тарифы NNATO — отвечу по материалам сайта.', links: [], matched: true, entryId: 'greeting' };
  }
  if (THANKS_RE.test(normalized)) {
    return { text: 'Пожалуйста! Если появятся ещё вопросы — я здесь.', links: [], matched: true, entryId: 'thanks' };
  }
  if (BYE_RE.test(normalized)) {
    return { text: 'До встречи! Переписка сохранится, пока открыта эта вкладка.', links: [], matched: true, entryId: 'bye' };
  }

  const ranked = rankEntries(question, index);
  const [best, second] = ranked;
  // Уверенный ответ: значимое слово вопроса совпало с темой карточки, и карточка покрывает
  // не меньше половины «веса» вопроса. Иначе честно говорим, что ответа нет.
  const confident = Boolean(best) && best.strong && best.coverage >= 0.5;

  if (!confident) {
    const near = ranked.filter((r) => r.hit && r.entry.link).slice(0, 2).map((r) => r.entry.link);
    return {
      text: para(
        'В материалах сайта я не нахожу ответа на этот вопрос, а выдумывать не буду.',
        'Что можно сделать:\n' + bullets([
          'задать вопрос команде NNATO через форму заявки — в поле «Комментарий»',
          'переформулировать вопрос: я знаю про шаги программы, агентства, расходы, риски и тарифы',
        ]),
      ),
      links: dedupeLinks([CONTACT_LINK, ...near]),
      matched: false,
      entryId: null,
      topic: null,
    };
  }

  const links = [best.entry.link];
  if (second && second.strong && second.score >= best.score * 0.6) links.push(second.entry.link);
  return { text: best.entry.text, links: dedupeLinks(links), matched: true, entryId: best.entry.id, topic: best.entry.title };
}

function dedupeLinks(links) {
  const seen = new Set();
  return links.filter((link) => {
    if (!link || seen.has(link.to)) return false;
    seen.add(link.to);
    return true;
  });
}

/** Самые близкие карточки — контекст для внешней языковой модели (см. assistantRepository). */
export function selectContext(question, index, limit = 6) {
  return rankEntries(question, index)
    .slice(0, limit)
    .map(({ entry }) => ({ title: entry.title, text: entry.text, link: entry.link }));
}
