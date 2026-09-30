import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchCollections, createCollectionApi, saveCollectionApi, fetchCollectionHistory } from '../collectionsService';

function mockFetchOnce(status: number, body: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      json: async () => body
    })
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('collectionsService', () => {
  it('fetchCollections devolve a lista em caso de sucesso', async () => {
    mockFetchOnce(200, { collections: [{ nic: 'NIC-2026-0841' }] });
    const collections = await fetchCollections();
    expect(collections).toEqual([{ nic: 'NIC-2026-0841' }]);
  });

  it('fetchCollections lança o erro vindo da API em caso de falha', async () => {
    mockFetchOnce(500, { error: 'Erro ao carregar conjuntos' });
    await expect(fetchCollections()).rejects.toThrow('Erro ao carregar conjuntos');
  });

  it('createCollectionApi envia POST com o conjunto (sem actorId — identidade vem da sessão)', async () => {
    const collection = { nic: 'NIC-2026-0841' } as any;
    mockFetchOnce(201, { collection });

    const created = await createCollectionApi(collection);

    expect(created).toEqual(collection);
    expect(fetch).toHaveBeenCalledWith(
      '/api/collections',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ collection })
      })
    );
  });

  it('saveCollectionApi codifica o NIC na URL e envia PUT', async () => {
    const collection = { nic: 'NIC/2026 0841' } as any;
    mockFetchOnce(200, { collection });

    await saveCollectionApi(collection);

    expect(fetch).toHaveBeenCalledWith(
      `/api/collections/${encodeURIComponent('NIC/2026 0841')}`,
      expect.objectContaining({ method: 'PUT' })
    );
  });

  it('fetchCollectionHistory devolve assinaturas, alterações e estado da corrente', async () => {
    const history = { signatures: [], changes: [], chain: { ok: true, brokenAtId: null } };
    mockFetchOnce(200, history);

    const result = await fetchCollectionHistory('NIC-2026-0841');

    expect(result).toEqual(history);
    expect(fetch).toHaveBeenCalledWith('/api/collections/NIC-2026-0841/history');
  });

  it('usa a mensagem de erro padrão quando a API não devolve corpo JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 503, json: async () => { throw new Error('sem corpo'); } })
    );
    await expect(fetchCollections()).rejects.toThrow('Erro ao carregar conjuntos (HTTP 503)');
  });
});
