export type Stage =
  | { type: 'module-content'; index: number }
  | { type: 'module-quiz'; index: number }
  | { type: 'final-quiz' }
  | { type: 'result' };
