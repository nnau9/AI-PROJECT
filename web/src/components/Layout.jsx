import { useEffect } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import Icon from './Icon.jsx';
import { Wordmark } from './Brand.jsx';

export const NAV_ITEMS = [
  { to: '/', label: 'Главная', short: 'Главная', icon: 'home', end: true },
  { to: '/steps', label: 'Как поехать', short: 'Шаги', icon: 'steps' },
  { to: '/agencies', label: 'Агентства', short: 'Агентства', icon: 'agencies' },
  { to: '/important', label: 'Важные моменты', short: 'Важно', icon: 'alert' },
  { to: '/plans', label: 'Тарифы', short: 'Тарифы', icon: 'plans' },
];

function ScrollManager() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) return;
    window.scrollTo({ top: 0, behavior: 'instant' });
    document.getElementById('main')?.focus({ preventScroll: true });
  }, [pathname, hash]);
  return null;
}

export default function Layout({ children }) {
  return (
    <>
      <ScrollManager />
      <a className="skip-link" href="#main" onClick={(e) => { e.preventDefault(); document.getElementById('main')?.focus(); }}>
        Перейти к содержимому
      </a>
      <header className="site-header">
        <div className="container site-header__inner">
          <Link to="/" className="brand" aria-label="NNATO — на главную">
            <Wordmark />
          </Link>
          <span className="header-status" aria-hidden="true">SWT USA · J-1 · Казахстан</span>
          <nav aria-label="Основная навигация" className="top-nav">
            <ul>
              {NAV_ITEMS.slice(1).map((item) => (
                <li key={item.to}>
                  <NavLink to={item.to} end={item.end}>{item.label}</NavLink>
                </li>
              ))}
            </ul>
          </nav>
          <Link to="/apply" className="btn btn--primary btn--small header-cta">
            Заявка
          </Link>
        </div>
      </header>

      <main id="main" tabIndex={-1}>
        {children}
      </main>

      <footer className="site-footer">
        <div className="container">
          <div className="footer-top">
            <Wordmark />
            <nav aria-label="Разделы сайта" className="footer-nav">
              {NAV_ITEMS.map((item) => <Link key={item.to} to={item.to}>{item.label}</Link>)}
              <Link to="/apply">Заявка</Link>
              <Link to="/sources">Источники</Link>
            </nav>
          </div>
          <div className="footer-body">
          <p className="label">Правовая информация</p>
          <div>
          <p>
            NNATO — независимый информационный и консультационный сервис. NNATO не является американским
            спонсором J-1, визовым посредником или агентством по трудоустройству, не связан с Госдепартаментом США
            и не гарантирует участие в программе, работу, доход или визу.
          </p>
          <p>
            Шаги, требования и расходы на сайте — общая информация, а не индивидуальная юридическая или визовая
            инструкция. Решение о визе принимает консульский сотрудник. Условия зависят от спонсора и сезона —
            сверяйтесь с <Link to="/sources">первоисточниками</Link>.
          </p>
          <p className="footer-legal">© {new Date().getFullYear()} NNATO</p>
          </div>
          </div>
        </div>
      </footer>

      <nav className="bottom-nav" aria-label="Навигация по разделам">
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end} className="bottom-nav__item">
            <Icon name={item.icon} size={22} />
            <span>{item.short}</span>
          </NavLink>
        ))}
      </nav>
    </>
  );
}
