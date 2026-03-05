export function StatusChip({ completed, score }: { completed: boolean; score: number | null }) {
  if (completed) {
    return (
      <span className="inline-block bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
        Passed &mdash; {score}%
      </span>
    );
  }
  if (score !== null) {
    return (
      <span className="inline-block bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
        Failed &mdash; {score}%
      </span>
    );
  }
  return (
    <span className="inline-block bg-gray-100 text-gray-600 text-xs font-medium px-2.5 py-0.5 rounded-full">
      Not started
    </span>
  );
}
