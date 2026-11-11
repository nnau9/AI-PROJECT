// Копирует однофайловую сборку в корневой index.html проекта,
// чтобы сайт можно было открыть двойным кликом без Node.js и сервера.
// Безопасность: перезаписывает файл, только если он пустой или ранее создан этой же сборкой
// (содержит метку swt-standalone). Иначе ничего не трогает.
import { copyFileSync, existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const MARKER = 'swt-standalone';
const from = fileURLToPath(new URL('../dist-standalone/index.html', import.meta.url));
const to = fileURLToPath(new URL('../../index.html', import.meta.url));

if (existsSync(to)) {
  const current = readFileSync(to, 'utf8');
  if (current.trim().length > 0 && !current.includes(MARKER)) {
    console.error(`Пропущено: ${to} содержит собственный контент. Сборка лежит в ${from}`);
    process.exit(1);
  }
}
copyFileSync(from, to);
console.log(`Standalone-сборка скопирована в ${to}`);
