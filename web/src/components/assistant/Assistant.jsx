import { Fragment, createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ASSISTANT_GREETING, ASSISTANT_SUGGESTIONS } from '@shared/index.js';
import { assistantRepository } from '../../services.js';
import Icon from '../Icon.jsx';
import Orca from './Orca.jsx';
import '../../styles/assistant.css';

// Чат-помощник: приглашение на главной, окно чата и кнопка вызова в шапке.
// Переписка и отметка «приглашение закрыто» живут в sessionStorage — до закрытия вкладки.

const MAX_QUESTION_LENGTH = 500;
const PHONE_QUERY = '(max-width: 719px)';
const STORAGE_MESSAGES = 'nnato.assistant.messages';
const STORAGE_INVITE = 'nnato.assistant.inviteDismissed';

const ERROR_ANSWER = {
  text: 'Не получилось загрузить материалы сайта, поэтому ответить сейчас не могу. Попробуйте ещё раз чуть позже или оставьте вопрос в форме заявки.',
  links: [{ to: '/apply', label: 'Оставить заявку' }],
  topic: null,
};

const AssistantContext = createContext(null);

export function useAssistant() {
  const value = useContext(AssistantContext);
  if (!value) throw new Error('useAssistant: нет AssistantProvider');
  return value;
}

/** Состояние в sessionStorage: сохраняется при перезагрузке, пропадает с закрытием вкладки. */
function useSessionState(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const raw = window.sessionStorage.getItem(key);
      return raw ? JSON.parse(raw) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      window.sessionStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* хранилище недоступно — работаем без сохранения */
    }
  }, [key, value]);
  return [value, setValue];
}

const isPhone = () => window.matchMedia(PHONE_QUERY).matches;
const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export function AssistantProvider({ children }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useSessionState(STORAGE_MESSAGES, []);
  const [inviteDismissed, setInviteDismissed] = useSessionState(STORAGE_INVITE, false);
  const [pending, setPending] = useState(false);
  const [draft, setDraft] = useState('');
  const openerRef = useRef(null);
  const pendingRef = useRef(false);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const { pathname } = useLocation();

  const openChat = useCallback((event) => {
    // Запоминаем, откуда открыли чат, чтобы вернуть туда фокус при закрытии.
    openerRef.current = event?.currentTarget ?? document.activeElement;
    setInviteDismissed(true);
    setOpen(true);
  }, [setInviteDismissed]);

  const closeChat = useCallback(({ restoreFocus = true } = {}) => {
    setOpen(false);
    if (!restoreFocus) return;
    // Возвращаем фокус туда, откуда чат открыли; если элемента уже нет — на кнопку в шапке.
    requestAnimationFrame(() => {
      const opener = openerRef.current;
      const visible = (el) => el && el.isConnected && el.getClientRects().length > 0;
      const target = visible(opener)
        ? opener
        : [...document.querySelectorAll('[data-assistant-trigger]')].find(visible);
      target?.focus();
    });
  }, []);

  const dismissInvite = useCallback(() => setInviteDismissed(true), [setInviteDismissed]);

  const send = useCallback(async (text) => {
    const question = String(text).trim().slice(0, MAX_QUESTION_LENGTH);
    if (!question || pendingRef.current) return;
    const history = messagesRef.current.map((m) => ({ role: m.role, text: m.text }));
    setMessages((list) => [...list, { id: newId(), role: 'user', text: question }]);
    pendingRef.current = true;
    setPending(true);
    let answer;
    try {
      answer = await assistantRepository.ask(question, history);
    } catch {
      answer = ERROR_ANSWER;
    }
    setMessages((list) => [
      ...list,
      { id: newId(), role: 'assistant', text: answer.text, links: answer.links ?? [], topic: answer.topic ?? null },
    ]);
    pendingRef.current = false;
    setPending(false);
  }, [setMessages]);

  // На телефоне чат занимает всю область контента — при переходе в другой раздел закрываем его.
  useEffect(() => {
    if (isPhone()) setOpen(false);
  }, [pathname]);

  const value = useMemo(
    () => ({ open, messages, pending, draft, setDraft, inviteDismissed, openChat, closeChat, dismissInvite, send }),
    [open, messages, pending, draft, inviteDismissed, openChat, closeChat, dismissInvite, send],
  );

  return (
    <AssistantContext.Provider value={value}>
      {children}
      <Invite />
      {open ? <ChatPanel /> : null}
    </AssistantContext.Provider>
  );
}

/** Кнопка вызова чата в шапке. variant: nav — пункт верхнего меню, solo — значок рядом с «Заявка». */
export function AssistantTrigger({ variant = 'solo' }) {
  const { open, openChat, closeChat } = useAssistant();
  return (
    <button
      type="button"
      className={`assistant-trigger assistant-trigger--${variant}`}
      data-assistant-trigger
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-label={open ? 'Помощник: закрыть чат' : 'Помощник: открыть чат'}
      title="Чат с помощником"
      onClick={(event) => (open ? closeChat() : openChat(event))}
    >
      <Orca size={28} compact />
      <span className="assistant-trigger__label" aria-hidden="true">Помощник</span>
    </button>
  );
}

/** Компактное приглашение: появляется на главной после прокрутки ниже первого экрана. */
function Invite() {
  const { open, inviteDismissed, openChat, dismissInvite } = useAssistant();
  const { pathname } = useLocation();
  const [belowFold, setBelowFold] = useState(false);
  const eligible = pathname === '/' && !inviteDismissed && !open;

  useEffect(() => {
    if (!eligible) {
      setBelowFold(false);
      return undefined;
    }
    let frame = 0;
    const check = () => {
      frame = 0;
      setBelowFold(window.scrollY > window.innerHeight * 0.9);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(check);
    };
    schedule();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, [eligible]);

  if (!eligible) return null;

  return (
    <aside className={`assistant-invite ${belowFold ? 'is-visible' : ''}`} aria-label="Приглашение в чат с помощником">
      <button type="button" className="assistant-invite__open" onClick={openChat}>
        <Orca size={60} className="assistant-invite__orca" />
        <span className="assistant-invite__text">
          <span className="assistant-invite__label">Помощник NNATO</span>
          <span className="assistant-invite__title">Все еще остались вопросы?</span>
        </span>
      </button>
      <button type="button" className="assistant-invite__close" onClick={dismissInvite} aria-label="Скрыть приглашение">
        <Icon name="close" size={18} />
      </button>
    </aside>
  );
}

const URL_RE = /(https:\/\/[^\s]+[^\s.,;:!?)»])/g;

function withLinks(text) {
  return text.split(URL_RE).map((part, i) =>
    i % 2 === 1 ? (
      <a key={i} href={part} target="_blank" rel="noopener noreferrer">
        {part.replace(/^https:\/\/(www\.)?/, '').replace(/\/$/, '')}
        <span className="visually-hidden"> (откроется в новой вкладке)</span>
      </a>
    ) : (
      part
    ),
  );
}

/** Текст ответа: абзацы разделены пустой строкой, строки с «• » — пункты списка. */
function MessageText({ text }) {
  return text.split(/\n{2,}/).map((block, i) => {
    const lines = block.split('\n');
    const firstItem = lines.findIndex((line) => line.startsWith('• '));
    const isList = firstItem >= 0 && lines.slice(firstItem).every((line) => line.startsWith('• '));
    if (!isList) return <p key={i}>{withLinks(lines.join(' '))}</p>;
    return (
      <Fragment key={i}>
        {firstItem > 0 ? <p>{withLinks(lines.slice(0, firstItem).join(' '))}</p> : null}
        <ul>
          {lines.slice(firstItem).map((line, j) => <li key={j}>{withLinks(line.slice(2))}</li>)}
        </ul>
      </Fragment>
    );
  });
}

function Message({ message, onLinkClick }) {
  const isUser = message.role === 'user';
  return (
    <div className={`assistant-msg assistant-msg--${message.role}`}>
      <span className="visually-hidden">{isUser ? 'Вы: ' : 'Помощник: '}</span>
      {message.topic ? <p className="assistant-msg__topic">Тема: {message.topic}</p> : null}
      <MessageText text={message.text} />
      {message.links?.length ? (
        <ul className="assistant-msg__links">
          {message.links.map((link) => (
            <li key={link.to}>
              <Link to={link.to} onClick={onLinkClick}>
                {link.label}
                <span aria-hidden="true">→</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

const GREETING_MESSAGE = { role: 'assistant', text: ASSISTANT_GREETING };

function ChatPanel() {
  const { messages, pending, draft, setDraft, closeChat, send } = useAssistant();
  const panelRef = useRef(null);
  const logRef = useRef(null);
  const inputRef = useRef(null);

  // При открытии: фокус в поле ввода (на сенсорных экранах — на само окно, чтобы не поднимать
  // клавиатуру без запроса) и заранее собираем базу знаний.
  useEffect(() => {
    const touch = window.matchMedia('(pointer: coarse)').matches;
    (touch ? panelRef.current : inputRef.current)?.focus({ preventScroll: true });
    assistantRepository.warmUp().catch(() => {});
  }, []);

  // Экранная клавиатура: поднимаем окно над ней, чтобы поле ввода оставалось видно.
  useEffect(() => {
    const viewport = window.visualViewport;
    const panel = panelRef.current;
    if (!viewport || !panel) return undefined;
    const update = () => {
      const inset = Math.round(window.innerHeight - viewport.height - viewport.offsetTop);
      const keyboard = Math.abs(viewport.scale - 1) < 0.01 && inset > 120;
      panel.classList.toggle('is-keyboard', keyboard);
      if (keyboard) panel.style.setProperty('--assistant-keyboard', `${inset}px`);
      else panel.style.removeProperty('--assistant-keyboard');
    };
    update();
    viewport.addEventListener('resize', update);
    viewport.addEventListener('scroll', update);
    return () => {
      viewport.removeEventListener('resize', update);
      viewport.removeEventListener('scroll', update);
    };
  }, []);

  // Прокрутка: последний вопрос — у верхнего края, чтобы ответ читался с начала.
  // Если переписка короче окна, браузер сам ограничит прокрутку нижним краем.
  // Пока вопросов нет, окно остаётся на приветствии.
  useLayoutEffect(() => {
    const log = logRef.current;
    if (!log) return;
    const questions = log.querySelectorAll('.assistant-msg--user');
    const last = questions[questions.length - 1];
    log.scrollTop = last ? last.offsetTop - 12 : 0;
  }, [messages.length, pending]);

  const onSubmit = (event) => {
    event.preventDefault();
    if (!draft.trim() || pending) return;
    send(draft);
    setDraft('');
  };

  const onKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      closeChat();
    }
  };

  const onLinkClick = () => {
    if (isPhone()) closeChat({ restoreFocus: false });
  };

  const ask = (question) => {
    send(question);
    inputRef.current?.focus({ preventScroll: true });
  };

  return (
    <section
      ref={panelRef}
      id="assistant-panel"
      className="assistant"
      role="dialog"
      aria-modal="false"
      aria-labelledby="assistant-title"
      tabIndex={-1}
      onKeyDown={onKeyDown}
    >
      <header className="assistant__head">
        <Orca size={44} title="Косатка — помощник NNATO" />
        <div className="assistant__heading">
          <h2 id="assistant-title" className="assistant__title">Помощник NNATO</h2>
          <p className="assistant__status">
            <span className="assistant__dot blink" aria-hidden="true" />
            По материалам сайта
          </p>
        </div>
        <button type="button" className="assistant__close" onClick={() => closeChat()} aria-label="Закрыть чат">
          <span aria-hidden="true">Закрыть</span>
          <Icon name="close" size={16} />
        </button>
      </header>

      <div ref={logRef} className="assistant__log" role="log" aria-live="polite" aria-label="Переписка с помощником" tabIndex={0}>
        <Message message={GREETING_MESSAGE} />
        {messages.length === 0 ? (
          <ul className="assistant__suggestions" aria-label="Частые вопросы">
            {ASSISTANT_SUGGESTIONS.map((question) => (
              <li key={question}>
                <button type="button" className="assistant__suggestion" onClick={() => ask(question)}>
                  {question}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        {messages.map((message) => (
          <Message key={message.id} message={message} onLinkClick={onLinkClick} />
        ))}
        {pending ? (
          <div className="assistant-msg assistant-msg--assistant assistant-msg--typing">
            <span className="visually-hidden">Помощник печатает ответ…</span>
            <span className="assistant-typing" aria-hidden="true"><i /><i /><i /></span>
          </div>
        ) : null}
      </div>

      <form className="assistant__form" onSubmit={onSubmit}>
        <label className="visually-hidden" htmlFor="assistant-input">Ваш вопрос помощнику</label>
        <input
          ref={inputRef}
          id="assistant-input"
          className="assistant__input"
          type="text"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Спросите о программе или тарифах"
          autoComplete="off"
          enterKeyHint="send"
          maxLength={MAX_QUESTION_LENGTH}
        />
        <button type="submit" className="assistant__send" disabled={!draft.trim() || pending} aria-label="Отправить сообщение">
          <Icon name="arrow" size={20} />
        </button>
      </form>
      <p className="assistant__note">
        Общая информация по материалам сайта, не юридическая консультация. Не указывайте паспортные данные.
      </p>
    </section>
  );
}
