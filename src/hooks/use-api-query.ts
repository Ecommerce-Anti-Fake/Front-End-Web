import { useEffect, useState } from 'react';
import { apiRequest } from '../lib/api-client';
import { useAuth } from '../modules/auth/auth-context';

type QueryState<T> = {
  data: T | null;
  error: string | null;
  loading: boolean;
  reload: () => Promise<void>;
};

export function useApiQuery<T>(path: string, enabled = true): QueryState<T> {
  const { session } = useAuth();
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    if (!enabled || !session?.accessToken) {
      setData(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const nextData = await apiRequest<T>(path, {
        accessToken: session.accessToken,
      });
      setData(nextData);
    } catch (queryError) {
      setError(queryError instanceof Error ? queryError.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [path, enabled, session?.accessToken]);

  return { data, error, loading, reload: load };
}
