// Фотографии NNATO. Все — CC0 1.0 (общественное достояние), получены с Wikimedia Commons,
// где опубликованы как ранние фото Unsplash (до смены лицензии Unsplash в 2017 г.).
// Атрибуция не требуется; авторы и источники перечислены в /ASSETS-CREDITS.md.
// Файлы пережаты в WebP (качество 0.7) и хранятся локально — сайт не зависит от внешних URL.
import hero from './hero.webp';
import city from './city.webp';
import almaty from './almaty.webp';
import summerJob from './summerJob.webp';
import road from './road.webp';
import conversation from './conversation.webp';
import planning from './planning.webp';
import signature from './signature.webp';

export const PHOTOS = {
  // Путешественник с чемоданом у окна аэропорта — начало поездки (герой главной)
  hero: { src: hero, width: 2000, height: 1333, position: '58% 50%' },
  // Манхэттенский мост на закате — цель поездки (финальный призыв на главной)
  city: { src: city, width: 2000, height: 1333, position: '50% 60%' },
  // Большое Алматинское озеро — путь начинается дома (шапка «Как поехать»)
  almaty: { src: almaty, width: 1800, height: 1350, position: '50% 62%' },
  // Бариста за работой — сезонная работа в сфере обслуживания («Что это за программа»)
  summerJob: { src: summerJob, width: 1200, height: 903, position: '62% 40%' },
  // Дорога к горизонту — последовательность шагов (плитка «Как поехать»)
  road: { src: road, width: 1200, height: 800, position: '50% 70%' },
  // Разговор за столом — консультация и сравнение агентств
  conversation: { src: conversation, width: 1200, height: 801, position: '50% 45%' },
  // Блокнот и кофе — планирование (плитка тарифов)
  planning: { src: planning, width: 1200, height: 800, position: '40% 50%' },
  // Подпись документа — проверка договора, права (важные моменты)
  signature: { src: signature, width: 1200, height: 801, position: '35% 45%' },
};
