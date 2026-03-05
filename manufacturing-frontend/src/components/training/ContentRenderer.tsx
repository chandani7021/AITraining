import type { ContentBlock } from '../../types';

export function ContentRenderer({ block }: { block: ContentBlock }) {
  if (block.type === 'paragraph') {
    return <p className="text-gray-700 text-sm leading-relaxed">{block.text}</p>;
  }
  if (block.type === 'bullet_list') {
    return (
      <ul className="list-disc list-inside text-gray-700 text-sm space-y-1">
        {block.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    );
  }
  return null;
}
