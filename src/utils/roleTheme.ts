/**
 * Identidade visual por papel (§ Zona de UX, discutida com a Galera de UX —
 * Compass, Empiricus, PolarBear, Few — set/2026).
 *
 * Cada papel tem uma cor e um ícone fixos, usados só como INDICADOR DE
 * IDENTIDADE (faixa no topo do cabeçalho, selo com o nome da pessoa ativa,
 * lista de pessoas cadastradas) — nunca em botões, bordas de formulário ou
 * qualquer lugar que já carregue significado de status (assinado = emerald,
 * em aberto = amber, bloqueado/perigo = rose, marca/ação primária = sky).
 *
 * As cinco cores variam deliberadamente em CLARIDADE, não só em tom —
 * Administrador é a mais escura, Estudante a mais clara — porque cor
 * parecida em tons próximos (a v1 desta paleta) é difícil de guardar de
 * cabeça no dia a dia. O ícone é a segunda camada de identificação: mesmo
 * que a cor falhe (por luz, monitor ou daltonismo), a forma não muda.
 */
import type { UserRole } from '../types/sgccco';
import { Wrench, FlaskConical, ShieldCheck, Search, GraduationCap, type LucideIcon } from 'lucide-react';

export interface RoleTheme {
  label: string;
  icon: LucideIcon;
  /** Faixa fina de identidade (topo do cabeçalho, barra de um selo). */
  bar: string;
  /** Selo/pill: fundo + borda + texto. */
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  /** Círculo sólido pequeno (ex.: lista de pessoas em Configurações). */
  solidBg: string;
  solidIcon: string;
  /**
   * Texto sobre fundo escuro fixo (o card de boas-vindas do Início é sempre
   * escuro, independente do tema claro/escuro do site). O invariante aqui não
   * é a mesma cor do selo — é o mesmo lugar na escala de destaque: Administrador
   * continua no extremo de mais destaque (branco), Estudante no de menos
   * destaque (apagado), só que invertido porque o fundo também inverteu.
   */
  onDark: string;
  /** Borda de 4px sobre o mesmo fundo escuro fixo — mesma lógica do onDark. */
  borderOnDark: string;
}

export const ROLE_THEME: Record<UserRole, RoleTheme> = {
  tecnico: {
    label: 'Técnico',
    icon: Wrench,
    bar: 'bg-blue-600 dark:bg-blue-500',
    badgeBg: 'bg-blue-50 dark:bg-blue-950',
    badgeBorder: 'border-blue-200 dark:border-blue-800',
    badgeText: 'text-blue-700 dark:text-blue-300',
    solidBg: 'bg-blue-600',
    solidIcon: 'text-white',
    onDark: 'text-blue-300',
    borderOnDark: 'border-t-blue-500'
  },
  curador: {
    label: 'Curador',
    icon: FlaskConical,
    bar: 'bg-purple-800 dark:bg-purple-500',
    badgeBg: 'bg-purple-50 dark:bg-purple-950',
    badgeBorder: 'border-purple-200 dark:border-purple-800',
    badgeText: 'text-purple-800 dark:text-purple-300',
    solidBg: 'bg-purple-800',
    solidIcon: 'text-white',
    onDark: 'text-purple-300',
    borderOnDark: 'border-t-purple-500'
  },
  administrador: {
    label: 'Administrador',
    icon: ShieldCheck,
    // Duas tentativas anteriores falharam pelo mesmo motivo: preto/branco puro é a
    // cor dos botões padrão do site; índigo tão escuro que ficou preto de novo aos
    // olhos — tom muito escuro não registra como "cor", registra como "neutro",
    // não importa o matiz por baixo. Teal sólido, num valor médio (não extremo de
    // escuridão), resolve: lê como cor de verdade a olho nu, e ainda é distinto de
    // emerald (status "assinado") por ser mais azulado/petróleo, não verde puro.
    bar: 'bg-teal-700 dark:bg-teal-400',
    solidBg: 'bg-teal-700',
    solidIcon: 'text-white',
    // Único papel com selo SÓLIDO (preenchido), não pastel — mantém o Administrador
    // visualmente mais "pesado" que os outros quatro, sem depender de ser escuro.
    badgeBg: 'bg-teal-700 dark:bg-teal-500',
    badgeBorder: 'border-teal-700 dark:border-teal-500',
    badgeText: 'text-white',
    onDark: 'text-teal-300',
    borderOnDark: 'border-t-teal-400'
  },
  pesquisador: {
    label: 'Pesquisador',
    icon: Search,
    bar: 'bg-pink-600 dark:bg-pink-500',
    badgeBg: 'bg-pink-50 dark:bg-pink-950',
    badgeBorder: 'border-pink-200 dark:border-pink-800',
    badgeText: 'text-pink-700 dark:text-pink-300',
    solidBg: 'bg-pink-600',
    solidIcon: 'text-white',
    onDark: 'text-pink-300',
    borderOnDark: 'border-t-pink-500'
  },
  estudante: {
    label: 'Estudante',
    icon: GraduationCap,
    bar: 'bg-slate-300 dark:bg-slate-600',
    badgeBg: 'bg-slate-50 dark:bg-slate-900',
    badgeBorder: 'border-slate-200 dark:border-slate-700',
    badgeText: 'text-slate-500 dark:text-slate-400',
    solidBg: 'bg-slate-300 dark:bg-slate-600',
    solidIcon: 'text-slate-700 dark:text-white',
    onDark: 'text-slate-500',
    borderOnDark: 'border-t-slate-600'
  }
};

export function getRoleTheme(role: UserRole): RoleTheme {
  return ROLE_THEME[role];
}
