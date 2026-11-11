// Источник контента из локальных JSON-модулей (версия 1).
// Чтобы перейти на API, используйте apiSource.js с тем же набором методов.
import program from '../../data/program.json';
import steps from '../../data/steps.json';
import agencies from '../../data/agencies.json';
import sponsors from '../../data/sponsors.json';
import plans from '../../data/plans.json';
import importantNotes from '../../data/important-notes.json';
import sources from '../../data/sources.json';

const collections = { program, steps, agencies, sponsors, plans, importantNotes, sources };

export const COLLECTION_NAMES = Object.keys(collections);

export function createJsonSource() {
  return {
    async get(name) {
      const data = collections[name];
      if (!data) throw new Error(`Неизвестная коллекция контента: ${name}`);
      // Копия, чтобы UI не мог случайно изменить исходные данные.
      return JSON.parse(JSON.stringify(data));
    },
  };
}
