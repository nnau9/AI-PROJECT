/** Группирует шаги по фазам в порядке, заданном в phases. */
export function groupStepsByPhase(stepsData) {
  const phases = stepsData?.phases ?? [];
  const steps = stepsData?.steps ?? [];
  return phases
    .map((phase) => ({ ...phase, steps: steps.filter((s) => s.phase === phase.id) }))
    .filter((phase) => phase.steps.length > 0);
}

/** Ключ пункта чек-листа: `${stepId}:${index}` */
export const checklistKey = (stepId, index) => `${stepId}:${index}`;

/**
 * Прогресс по чек-листам.
 * @param {{steps: {id:string, checklist:string[]}[]}} stepsData
 * @param {Record<string, boolean>} checked
 */
export function getProgress(stepsData, checked = {}) {
  let total = 0;
  let done = 0;
  for (const step of stepsData?.steps ?? []) {
    step.checklist.forEach((_, i) => {
      total += 1;
      if (checked[checklistKey(step.id, i)]) done += 1;
    });
  }
  return { total, done, percent: total ? Math.round((done / total) * 100) : 0 };
}

export function isStepComplete(step, checked = {}) {
  return step.checklist.length > 0 && step.checklist.every((_, i) => checked[checklistKey(step.id, i)]);
}
