# Изображения и визуальные референсы NNATO

## Использованные фотографии

Все фотографии — **CC0 1.0 Universal (Public Domain Dedication)**: их можно использовать, изменять и публиковать, в том числе в коммерческих целях, без указания автора. Авторы указаны здесь из уважения к их работе. Каждое фото опубликовано на Wikimedia Commons как ранний снимок Unsplash (CC0 до смены лицензии Unsplash в июне 2017 г.); лицензия проверена через API Commons 11.11.2026.

Файлы хранятся локально в `web/src/assets/photos/` (WebP, уменьшены и пережаты; другие изменения не вносились).

| Файл | Где на сайте | Автор | Страница Commons | Первоисточник |
|---|---|---|---|---|
| `city.webp` | Главная, «Готовы начать?» | Luca Bravo | [Manhattan Bridge sunset](https://commons.wikimedia.org/wiki/File:Manhattan_Bridge_sunset._(Unsplash).jpg) | [unsplash.com/photos/A9YZMs8mTrk](https://unsplash.com/photos/A9YZMs8mTrk) |
| `almaty.webp` | «Как поехать», шапка | Nursultan Rakysh | [Man looking at lake, Almaty](https://commons.wikimedia.org/wiki/File:Man_looking_at_lake,_Almaty_(Unsplash).jpg) | [unsplash.com/photos/IunHchTIsM8](https://unsplash.com/photos/IunHchTIsM8) |
| `summerJob.webp` | Главная, «Что это за программа» | Zachary Staines | [Confused.](https://commons.wikimedia.org/wiki/File:Confused._(Unsplash).jpg) | [unsplash.com/photos/1FBkxz3tbtc](https://unsplash.com/photos/1FBkxz3tbtc) |
| `road.webp` | Главная, плитка «Как поехать» | Ryan Hefner | [Road to Somewhere](https://commons.wikimedia.org/wiki/File:Road_to_Somewhere_(Unsplash).jpg) | [unsplash.com/photos/RW4uu6dJCpY](https://unsplash.com/photos/RW4uu6dJCpY) |
| `conversation.webp` | Главная, плитка «Агентства»; шапка «Агентства» | rawpixel.com | [Discussing business strategy](https://commons.wikimedia.org/wiki/File:Discussing_business_strategy_(Unsplash).jpg) | [unsplash.com/photos/yx7MRPsTgss](https://unsplash.com/photos/yx7MRPsTgss) |
| `planning.webp` | Главная, плитка «Тарифы NNATO» | Thought Catalog | [Journaling over coffee](https://commons.wikimedia.org/wiki/File:Journaling_over_coffee_(Unsplash).jpg) | [unsplash.com/photos/505eectW54k](https://unsplash.com/photos/505eectW54k) |
| `signature.webp` | Главная, плитка «Важные моменты»; шапка «Важные моменты» | Helloquence | [Sign here](https://commons.wikimedia.org/wiki/File:Sign_here_(Unsplash).jpg) | [unsplash.com/photos/OQMZwNd3ThU](http://unsplash.com/photos/OQMZwNd3ThU) |

Поиск кандидатов: [Openverse](https://openverse.org/) (фильтр CC0/PDM) и [Wikimedia Commons API](https://commons.wikimedia.org/w/api.php).

## Картографические данные

Глобус на главной строится по маске суши из [Natural Earth](https://www.naturalearthdata.com/) 1:110m land — общественное достояние, атрибуция не требуется. Данные взяты из npm-пакета [world-atlas@2.0.2](https://github.com/topojson/world-atlas) (`land-110m.json`) и растеризованы в сетку 1° скриптом `web/scripts/build-land-mask.mjs`; сайт внешние данные не загружает.

## Собственная графика

`web/src/components/Brand.jsx` (знак NNATO «солнце над горизонтом») и `web/src/components/Art.jsx` (маршрут Казахстан → США) — оригинальные SVG проекта. `web/src/components/Globe.jsx` — собственный точечный глобус на Canvas 2D (рисуется кодом, без изображений и текстур).

## Визуальные референсы (только для вдохновения, ничего не скачивалось)

- [fojcikdominik.com](https://www.fojcikdominik.com/) — подача первого экрана главной: сцена во весь экран с наклоном за курсором, подписи и координаты по углам, моноширинные метаданные, нумерованный указатель разделов со знаком «>». Его шрифты (Doto, OffBit), цвета, тексты и код не использовались — палитра и типографика остались NNATO.
- [apple.com](https://www.apple.com/) — общая подача: тонкая верхняя навигация, короткие крупные заголовки, один сильный визуал на блок, чередование светлых и тёмных секций, сильный контраст размеров заголовка и текста. Код, тексты, изображения и макеты не копировались.
- Pinterest ([поиск «travel website design minimal»](https://www.pinterest.com/search/pins/?q=travel%20website%20design%20minimal), [«work and travel usa students»](https://www.pinterest.com/search/pins/?q=work%20and%20travel%20usa%20students)), [Behance](https://www.behance.net/search/projects/travel%20landing%20page), [Dribbble](https://dribbble.com/search/travel-landing-page) — без входа в аккаунт результаты не отдаются (страницы рендерятся скриптом или закрыты 403), поэтому конкретные работы оттуда не использовались.
