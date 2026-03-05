import type { QuizQuestion } from '../../types';

export function QuizSection({
  questions,
  answers,
  onSelect,
  checked,
}: {
  questions: QuizQuestion[];
  answers: Record<string, number>;
  onSelect: (qid: string, idx: number) => void;
  checked: boolean;
}) {
  return (
    <div className="space-y-6">
      {questions.map((q, qi) => {
        const selected = answers[q.id];
        return (
          <div key={q.id}>
            <p className="text-sm font-semibold text-gray-800 mb-2">
              {qi + 1}. {q.question}
            </p>
            <div className="space-y-2">
              {q.options.map((opt, i) => {
                let style =
                  'border border-gray-200 text-gray-700 hover:border-sky-400 hover:bg-sky-50';
                if (!checked && selected === i) {
                  style = 'border border-sky-500 bg-sky-50 text-sky-800';
                }
                if (checked) {
                  if (i === q.correct_index) {
                    style = 'border border-green-400 bg-green-50 text-green-800 font-medium';
                  } else if (selected === i) {
                    style = 'border border-red-400 bg-red-50 text-red-700 line-through';
                  } else {
                    style = 'border border-gray-100 text-gray-400';
                  }
                }
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => onSelect(q.id, i)}
                    disabled={checked}
                    className={`w-full text-left px-4 py-3 rounded-lg text-sm transition ${style} disabled:cursor-default`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
            {checked && q.explanation && (
              <p className="mt-1.5 text-xs text-gray-500 italic">{q.explanation}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
