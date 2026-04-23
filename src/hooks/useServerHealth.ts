import { useEffect, useState } from 'react';
import { fetchServerHealth, type ServerHealth } from '@/lib/api';

export function useServerHealth(apiBase: string | undefined | null): ServerHealth | null {
  const [health, setHealth] = useState<ServerHealth | null>(null);

  useEffect(() => {
    if (!apiBase) return;
    let cancelled = false;

    const load = () => {
      fetchServerHealth(apiBase)
        .then((h) => {
          if (!cancelled) setHealth(h);
        })
        .catch(() => {
          if (!cancelled) setHealth(null);
        });
    };

    load();
    const timer = window.setInterval(load, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [apiBase]);

  return health;
}
