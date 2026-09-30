/**
 * SIGCOI - Manuais do Usuário (guias em HTML, servidos como estáticos em /manuais)
 *
 * Cada manual é versionado no nome do arquivo (ex: -v1.html). Ao publicar uma
 * revisão de conteúdo depois de uma mudança relevante no site, suba a versão
 * (v2, v3, ...) e atualize a entrada correspondente aqui — nunca sobrescreva
 * um arquivo de versão já publicada.
 */

export interface UserManual {
  id: string;
  title: string;
  description: string;
  version: string;
  path: string;
  updatedAt: string; // YYYY-MM-DD
}

export const USER_MANUALS: UserManual[] = [
  {
    id: 'manual-completo',
    title: 'Manual SIGCOI — Guia completo',
    description: 'Visão geral, perfis de acesso, as 7 fases, assinatura & hash, ferramentas, condutor por voz, glossário e FAQ.',
    version: 'v5',
    path: '/manuais/manual-sigcoi-completo-v5.html',
    updatedAt: '2026-09-28',
  },
  {
    id: 'manual-fases-4-a-7',
    title: 'Manual SIGCOI — Passo a passo · Fases 4 a 7',
    description: 'Guia detalhado das fases de Curadoria, Patologias, Galpão Definitivo e Consulta & Pesquisa.',
    version: 'v1',
    path: '/manuais/manual-sigcoi-fases-4-a-7-v1.html',
    updatedAt: '2026-09-25',
  },
];
