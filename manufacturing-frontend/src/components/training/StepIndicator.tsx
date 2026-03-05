import type { Module } from '../../types';
import type { Stage } from './types';

export function StepIndicator({
  modules,
  stage,
}: {
  modules: Module[];
  stage: Stage;
}) {
  function stepState(i: number): 'done' | 'active' | 'pending' {
    if (stage.type === 'result') return 'done';
    if (stage.type === 'final-quiz') {
      return i < modules.length ? 'done' : 'active';
    }
    if (stage.type === 'module-content' || stage.type === 'module-quiz') {
      if (i < stage.index) return 'done';
      if (i === stage.index) return 'active';
    }
    return 'pending';
  }

  const finalState: 'done' | 'active' | 'pending' =
    stage.type === 'result'
      ? 'done'
      : stage.type === 'final-quiz'
      ? 'active'
      : 'pending';

  return (
    <div className="flex items-center gap-2 mb-6 flex-wrap">
      {modules.map((mod, i) => (
        <div key={mod.id} className="flex items-center gap-2">
          <div
            title={mod.title}
            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition ${
              stepState(i) === 'done'
                ? 'bg-green-500 text-white'
                : stepState(i) === 'active'
                ? 'bg-sky-600 text-white ring-4 ring-sky-100'
                : 'bg-gray-100 text-gray-400'
            }`}
          >
            {stepState(i) === 'done' ? '✓' : i + 1}
          </div>
          <div
            className={`h-1 w-8 rounded-full transition ${
              stepState(i) === 'done' ? 'bg-green-400' : 'bg-gray-200'
            }`}
          />
        </div>
      ))}
      <span
        className={`px-3 py-1 rounded-full text-xs font-semibold border transition ${
          finalState === 'active'
            ? 'bg-indigo-600 text-white border-indigo-600'
            : finalState === 'done'
            ? 'bg-green-500 text-white border-green-500'
            : 'bg-gray-100 text-gray-400 border-gray-200'
        }`}
      >
        Final Quiz
      </span>
    </div>
  );
}
