export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    uploaded: 'bg-yellow-100 text-yellow-800',
    processing: 'bg-sky-100 text-sky-800',
    training_ready: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
  };
  const label: Record<string, string> = {
    uploaded: 'Uploaded',
    processing: 'Processing…',
    training_ready: 'Ready',
    failed: 'Failed',
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${map[status] ?? 'bg-gray-100 text-gray-700'}`}>
      {label[status] ?? status}
    </span>
  );
}
