import { useEffect, useState, useCallback } from "react";

interface UseSupabaseQueryOptions<T> {
  queryFn: () => Promise<T>;
  enabled?: boolean;
}

interface UseSupabaseQueryResult<T> {
  data: T;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useSupabaseQuery<T>(
  initialData: T,
  queryFn: () => Promise<T>,
  deps: unknown[] = []
): UseSupabaseQueryResult<T> {
  const [data, setData] = useState<T>(initialData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await queryFn();
      setData(result);
    } catch (e: any) {
      setError(e.message || "Error loading data");
    } finally {
      setLoading(false);
    }
  }, deps);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, loading, error, refetch };
}
