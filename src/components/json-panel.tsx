type JsonPanelProps = {
  title: string;
  data: unknown;
};

export function JsonPanel({ title, data }: JsonPanelProps) {
  return (
    <div className="json-panel">
      <div className="section-header compact">
        <h3>{title}</h3>
      </div>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}
