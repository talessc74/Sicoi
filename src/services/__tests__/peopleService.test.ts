import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchPeople, createPersonApi, deletePersonApi } from '../peopleService';

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

describe('peopleService', () => {
  it('fetchPeople devolve a lista em caso de sucesso', async () => {
    mockFetchOnce(200, { people: [{ id: '1', name: 'Perito X' }] });
    const people = await fetchPeople();
    expect(people).toEqual([{ id: '1', name: 'Perito X' }]);
  });

  it('fetchPeople lança o erro vindo da API em caso de falha', async () => {
    mockFetchOnce(500, { error: 'Erro ao carregar pessoas' });
    await expect(fetchPeople()).rejects.toThrow('Erro ao carregar pessoas');
  });

  it('createPersonApi envia POST com os dados e devolve a pessoa criada', async () => {
    mockFetchOnce(201, { person: { id: '2', name: 'Nova Pessoa' } });
    const person = await createPersonApi({ name: 'Nova Pessoa', role: 'tecnico', institution: 'INC', email: 'nova.pessoa@inc.pf.gov.br', registrationNumber: '1' });

    expect(person).toEqual({ id: '2', name: 'Nova Pessoa' });
    expect(fetch).toHaveBeenCalledWith(
      '/api/people',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('deletePersonApi não lança erro em caso de sucesso sem corpo', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, status: 204, json: async () => { throw new Error('sem corpo'); } })
    );
    await expect(deletePersonApi('1')).resolves.toBeUndefined();
  });

  it('deletePersonApi usa mensagem padrão quando a API não devolve corpo de erro', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 404, json: async () => { throw new Error('sem corpo'); } })
    );
    await expect(deletePersonApi('id-inexistente')).rejects.toThrow('Erro ao remover pessoa (HTTP 404)');
  });
});
