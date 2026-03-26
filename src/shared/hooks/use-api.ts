'use client';

import { useState, useCallback } from 'react';
import { ApiResponse } from '@/src/shared/types/api.types';

interface UseApiOptions {
  onSuccess?: (data: unknown) => void;
  onError?: (error: string) => void;
}

export function useApi<T>(options?: UseApiOptions) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const execute = useCallback(
    async (url: string, init?: RequestInit) => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(url, {
          headers: { 'Content-Type': 'application/json', ...init?.headers },
          ...init,
        });

        const result: ApiResponse<T> = await response.json();

        if (!result.success) {
          const errorMessage = result.error?.message || 'An error occurred';
          setError(errorMessage);
          options?.onError?.(errorMessage);
          return null;
        }

        setData(result.data as T);
        options?.onSuccess?.(result.data);
        return result.data as T;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Network error';
        setError(errorMessage);
        options?.onError?.(errorMessage);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [options],
  );

  return { data, error, isLoading, execute };
}
