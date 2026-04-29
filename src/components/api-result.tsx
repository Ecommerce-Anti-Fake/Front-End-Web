import { JsonPanel } from './json-panel';

type ApiResultProps = {
  title: string;
  loading: boolean;
  error: string | null;
  data: unknown;
};

export function ApiResult({ title, loading, error, data }: ApiResultProps) {
  if (loading) {
    return <div className="empty-state">Đang tải {title.toLowerCase()}...</div>;
  }

  if (error) {
    return <div className="empty-state error">{error}</div>;
  }

  if (!data) {
    return <div className="empty-state">Chưa có dữ liệu.</div>;
  }

  return <JsonPanel title={title} data={data} />;
}
