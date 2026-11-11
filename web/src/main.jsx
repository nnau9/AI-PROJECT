import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App.jsx';
import './styles/tokens.css';
import './styles/global.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* HashRouter: работает и на статическом хостинге, и при открытии файла без сервера. */}
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>,
);
