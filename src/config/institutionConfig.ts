/**
 * Configuração Institucional Parametrizada do SIGCOI
 *
 * Permite que universidades e instituições parceiras customizem
 * a identidade visual, sigla, títulos e prefixos através de
 * variáveis de ambiente (.env), sem necessidade de alterar o código.
 *
 * Valores padrão mantêm a referência institucional original (INC/DITEC/PF).
 */

export interface InstitutionConfig {
  /** Nome por extenso da instituição gestora (ex.: Instituto Nacional de Criminalística, USP, UFMG) */
  institutionName: string;
  /** Sigla oficial exibida nos cabeçalhos e badges (ex.: INC/DITEC/PF, LAF-USP) */
  institutionAcronym: string;
  /** Nome ou sigla do sistema de software (padrão: SIGCOI) */
  systemName: string;
  /** Título abreviado do cabeçalho (padrão: Coleções Osteológicas) */
  shortTitle: string;
  /** Subtítulo completo descritivo */
  subtitle: string;
  /** Prefixo dos conjuntos e caixas (padrão: COI) */
  collectionPrefix: string;
  /** Rótulo da versão/ambiente (padrão: ALFA) */
  versionTag: string;
  /** URL opcional de logotipo customizado */
  logoUrl?: string;
}

export const INSTITUTION_CONFIG: InstitutionConfig = {
  institutionName:
    (import.meta.env.VITE_INSTITUTION_NAME as string | undefined)?.trim() ||
    'Instituto Nacional de Criminalística / DITEC / PF',
  institutionAcronym:
    (import.meta.env.VITE_INSTITUTION_ACRONYM as string | undefined)?.trim() ||
    'INC/DITEC/PF',
  systemName:
    (import.meta.env.VITE_SYSTEM_NAME as string | undefined)?.trim() ||
    'SIGCOI',
  shortTitle:
    (import.meta.env.VITE_SYSTEM_SHORT_TITLE as string | undefined)?.trim() ||
    'Coleções Osteológicas',
  subtitle:
    (import.meta.env.VITE_SYSTEM_SUBTITLE as string | undefined)?.trim() ||
    'Sistema de Gestão da Coleção Osteológica Identificada',
  collectionPrefix:
    (import.meta.env.VITE_COLLECTION_PREFIX as string | undefined)?.trim() ||
    'COI',
  versionTag:
    (import.meta.env.VITE_VERSION_TAG as string | undefined)?.trim() ||
    'ALFA',
  logoUrl:
    (import.meta.env.VITE_LOGO_URL as string | undefined)?.trim() ||
    undefined
};
