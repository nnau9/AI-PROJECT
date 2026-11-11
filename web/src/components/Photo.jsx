import { PHOTOS } from '../assets/photos/index.js';

/**
 * Фотография из локальных ассетов NNATO (web/src/assets/photos).
 * Изображения иллюстративные, смысл секции передаёт текст, поэтому alt пустой.
 */
export default function Photo({ name, className = '', loading = 'lazy', position }) {
  const photo = PHOTOS[name];
  if (!photo) return null;
  return (
    <img
      className={`photo ${className}`}
      src={photo.src}
      alt=""
      width={photo.width}
      height={photo.height}
      loading={loading}
      decoding="async"
      style={position || photo.position ? { objectPosition: position ?? photo.position } : undefined}
    />
  );
}
