// Comparação campo a campo entre duas versões de um conjunto (ou de uma fase).
// Usada pelo servidor para o registro de alterações e pela tela de Auditoria para
// comparar versões assinadas — a mesma regra dos dois lados.

export interface FlatLeaf {
  value: unknown;
  aiSuggested?: boolean;
}

export interface FieldDifference {
  path: string;
  before: unknown;
  after: unknown;
  aiSuggested: boolean;
}

/** JSON com as chaves em ordem alfabética: compara conteúdo sem depender da ordem. */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map((v) => canonicalJson(v === undefined ? null : v)).join(',')}]`;
  const obj = value as Record<string, unknown>;
  const entries = Object.keys(obj)
    .filter((k) => obj[k] !== undefined)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${canonicalJson(obj[k])}`);
  return `{${entries.join(',')}}`;
}

export const sameContent = (a: unknown, b: unknown) => canonicalJson(a) === canonicalJson(b);

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === 'object' && !Array.isArray(v);

// Campo de formulário com sugestão de IA: { value, isAiSuggested, transcriptSnippet? }.
const isFieldWithSuggestion = (v: unknown): v is { value: unknown; isAiSuggested?: boolean } =>
  isPlainObject(v) && 'value' in v && ('isAiSuggested' in v || 'transcriptSnippet' in v);

/**
 * Achata um valor em folhas "caminho → valor". Campos de formulário viram uma folha
 * só (o valor); listas de objetos com `id` são indexadas pelo id, para incluir ou
 * remover um item não parecer mudança de todos os seguintes.
 */
export function flattenForDiff(value: unknown, path: string, out: Map<string, FlatLeaf> = new Map()): Map<string, FlatLeaf> {
  if (isFieldWithSuggestion(value)) {
    out.set(path, { value: value.value ?? null, aiSuggested: value.isAiSuggested === true });
    return out;
  }
  if (Array.isArray(value)) {
    if (value.length > 0 && value.every((item) => isPlainObject(item) && typeof item.id === 'string')) {
      for (const item of value as Record<string, unknown>[]) flattenForDiff(item, `${path}[${item.id}]`, out);
      return out;
    }
    if (value.some((item) => isPlainObject(item) || Array.isArray(item))) {
      value.forEach((item, idx) => flattenForDiff(item, `${path}[${idx}]`, out));
      return out;
    }
    out.set(path, { value });
    return out;
  }
  if (isPlainObject(value)) {
    const keys = Object.keys(value);
    if (keys.length === 0) {
      out.set(path, { value: {} });
      return out;
    }
    for (const key of keys) flattenForDiff(value[key], path ? `${path}.${key}` : key, out);
    return out;
  }
  out.set(path, { value: value === undefined ? null : value });
  return out;
}

/** Diferenças entre duas versões; `exclude` lista chaves de primeiro nível ignoradas. */
export function diffValues(before: unknown, after: unknown, rootPath = '', exclude: string[] = []): FieldDifference[] {
  const flat = (v: unknown) => {
    const out = new Map<string, FlatLeaf>();
    if (isPlainObject(v) && !isFieldWithSuggestion(v)) {
      for (const key of Object.keys(v)) {
        if (!exclude.includes(key)) flattenForDiff(v[key], rootPath ? `${rootPath}.${key}` : key, out);
      }
    } else {
      flattenForDiff(v, rootPath, out);
    }
    return out;
  };
  const b = flat(before);
  const a = flat(after);
  const paths = new Set([...b.keys(), ...a.keys()]);
  const result: FieldDifference[] = [];
  for (const path of paths) {
    const x = b.get(path);
    const y = a.get(path);
    if (x && y && sameContent(x.value, y.value)) continue;
    result.push({ path, before: x ? x.value : null, after: y ? y.value : null, aiSuggested: y?.aiSuggested === true });
  }
  return result.sort((p, q) => p.path.localeCompare(q.path));
}
