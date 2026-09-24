import { useEffect, useState } from 'react';

/**
 * Referência de qual commit está rodando neste servidor (4 primeiros dígitos).
 * Só para acompanhamento visual das atualizações — sem função operacional.
 */
export function useAppVersion(): string | null {
  const [commit, setCommit] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/version')
      .then((res) => res.json())
      .then((data) => setCommit(data.commit || null))
      .catch(() => setCommit(null));
  }, []);

  return commit;
}
