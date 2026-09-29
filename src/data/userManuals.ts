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
    description: 'Visão geral, perfis de acesso, login real, as 7 fases, assinatura & hash, ferramentas, condutor por voz, glossário e FAQ.',
    version: 'v7',
    path: '/manuais/manual-sigcoi-completo-v7.html',
    updatedAt: '2026-09-29',
  },
  {
    id: 'manual-fases-4-a-7',
    title: 'Manual SIGCOI — Passo a passo · Fases 4 a 7',
    description: 'Guia detalhado das fases de Curadoria, Patologias, Galpão Definitivo e Consulta & Pesquisa.',
    version: 'v1',
    path: '/manuais/manual-sigcoi-fases-4-a-7-v1.html',
    updatedAt: '2026-09-25',
  },
  {
    id: 'manual-administrador-contas',
    title: 'Manual SIGCOI — Administrador · Gestão de Contas',
    description: 'Passo a passo do login real: ativar o primeiro acesso (migrando de dados antigos), cadastrar pessoa, gerar link de acesso, atender pedidos de "esqueci a senha", trocar a própria senha e remover acesso.',
    version: 'v6',
    path: '/manuais/manual-administrador-contas-v6.html',
    updatedAt: '2026-09-29',
  },
];
