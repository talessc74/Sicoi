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
    description: 'Visão geral, perfis de acesso, login real, as 7 fases, assinatura & hash, ferramentas (incl. Busca por Semelhança entre ossos), condutor por voz, glossário e FAQ.',
    version: 'v9',
    path: '/manuais/manual-sigcoi-completo-v9.html',
    updatedAt: '2026-10-13',
  },
  {
    id: 'manual-fases-4-a-7',
    title: 'Manual SIGCOI — Passo a passo · Fases 4 a 7',
    description: 'Guia detalhado das fases de Curadoria, Patologias, Galpão Definitivo e Consulta & Pesquisa.',
    version: 'v2',
    path: '/manuais/manual-sigcoi-fases-4-a-7-v2.html',
    updatedAt: '2026-10-13',
  },
  {
    id: 'manual-administrador-contas',
    title: 'Manual SIGCOI — Administrador · Gestão de Contas',
    description: 'Passo a passo do login real: ativar o primeiro acesso (migrando de dados antigos), cadastrar pessoa, editar pessoa já cadastrada (ex.: adicionar e-mail a um registro antigo), dar acesso de Administrador a quem tem outro papel (ex.: Curadora que também administra), gerar link de acesso, atender pedidos de "esqueci a senha", trocar a própria senha e remover acesso.',
    version: 'v8',
    path: '/manuais/manual-administrador-contas-v8.html',
    updatedAt: '2026-10-13',
  },
];
