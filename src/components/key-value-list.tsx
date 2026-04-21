import type { KeyValueItem } from '../types';

type KeyValueListProps = {
  items: KeyValueItem[];
};

export function KeyValueList({ items }: KeyValueListProps) {
  return (
    <div className="key-value-list">
      {items.map((item) => (
        <div key={item.label} className="key-value-item">
          <span>{item.label}</span>
          <strong>{item.value === null || item.value === undefined || item.value === '' ? '-' : String(item.value)}</strong>
        </div>
      ))}
    </div>
  );
}
