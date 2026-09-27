import { describe, it, expect } from 'vitest';
import { canonicalJson, sameContent, flattenForDiff, diffValues } from '../historyDiff';

describe('canonicalJson / sameContent', () => {
  it('produz o mesmo texto para objetos com chaves em ordem diferente', () => {
    const a = { b: 1, a: 2 };
    const b = { a: 2, b: 1 };
    expect(canonicalJson(a)).toBe(canonicalJson(b));
    expect(sameContent(a, b)).toBe(true);
  });

  it('ignora chaves com valor undefined', () => {
    const a = { x: 1, y: undefined };
    const b = { x: 1 };
    expect(sameContent(a, b)).toBe(true);
  });

  it('detecta diferença de valor dentro de um array de objetos', () => {
    const a = { items: [{ id: '1', v: 1 }] };
    const b = { items: [{ id: '1', v: 2 }] };
    expect(sameContent(a, b)).toBe(false);
  });

  it('trata undefined dentro de array como null', () => {
    expect(canonicalJson([1, undefined, 3])).toBe(canonicalJson([1, null, 3]));
  });
});

describe('flattenForDiff', () => {
  it('achata um campo de formulário com sugestão de IA numa folha só', () => {
    const flat = flattenForDiff({ value: 'Fêmur', isAiSuggested: true }, 'osso');
    expect(flat.get('osso')).toEqual({ value: 'Fêmur', aiSuggested: true });
  });

  it('indexa lista de objetos com id pelo id, não pela posição', () => {
    const flat = flattenForDiff([{ id: 'a', v: 1 }, { id: 'b', v: 2 }], 'lista');
    expect([...flat.keys()].sort()).toEqual(['lista[a].id', 'lista[a].v', 'lista[b].id', 'lista[b].v']);
  });

  it('objeto vazio vira uma folha com valor {}', () => {
    const flat = flattenForDiff({}, 'vazio');
    expect(flat.get('vazio')).toEqual({ value: {} });
  });
});

describe('diffValues', () => {
  it('não acusa diferença quando os dois lados são iguais', () => {
    const before = { equipe: 'Alfa', ciclos: 1 };
    const after = { equipe: 'Alfa', ciclos: 1 };
    expect(diffValues(before, after)).toEqual([]);
  });

  it('acusa campo alterado com valor antes e depois', () => {
    const before = { equipe: 'Alfa' };
    const after = { equipe: 'Beta' };
    const diffs = diffValues(before, after);
    expect(diffs).toEqual([{ path: 'equipe', before: 'Alfa', after: 'Beta', aiSuggested: false }]);
  });

  it('campo novo aparece com before null; campo removido aparece com after null', () => {
    const before = { a: 1 };
    const after = { b: 2 };
    const diffs = diffValues(before, after);
    expect(diffs).toEqual([
      { path: 'a', before: 1, after: null, aiSuggested: false },
      { path: 'b', before: null, after: 2, aiSuggested: false }
    ]);
  });

  it('ignora chaves de primeiro nível listadas em exclude', () => {
    const before = { procedenciaLegal: 'X', equipe: 'Alfa' };
    const after = { procedenciaLegal: 'Y', equipe: 'Beta' };
    const diffs = diffValues(before, after, '', ['procedenciaLegal']);
    expect(diffs.map((d) => d.path)).toEqual(['equipe']);
  });

  it('marca aiSuggested quando o valor novo veio de sugestão de IA', () => {
    const before = { osso: { value: null, isAiSuggested: false } };
    const after = { osso: { value: 'Fêmur', isAiSuggested: true } };
    const diffs = diffValues(before, after);
    expect(diffs).toEqual([{ path: 'osso', before: null, after: 'Fêmur', aiSuggested: true }]);
  });

  it('resultado vem ordenado por path', () => {
    const before = {};
    const after = { zulu: 1, alfa: 1 };
    const diffs = diffValues(before, after);
    expect(diffs.map((d) => d.path)).toEqual(['alfa', 'zulu']);
  });
});
