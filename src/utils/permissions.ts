import type { UserProfile, UserRole } from '../types/sgccco';

// O Curador pode executar as ações de qualquer papel sem perder sua identidade
// nas assinaturas e nos registros de auditoria.
//
// Decisão de acesso (out/2026): o Pesquisador passa a ter os mesmos acessos
// do Técnico em todas as fases, exceto a Fase 6 — hoje a única função que usa
// este helper com requiredRole 'tecnico' é justamente "pode agir como
// técnico" (Fases 1, 2, 3, 5 e a aba Montagem da Fase 4), então a regra
// abaixo propaga a decisão pra todos esses lugares de uma vez. A Fase 6 não
// tem portão de papel nenhum hoje (está aberta pra todo mundo), então nada
// precisa mudar lá.
// Correção (mesmo mês): "acesso" e "assinatura" são coisas distintas — este
// helper continua valendo pra acesso/edição, mas a assinatura que trava cada
// fase passou a usar canSignAsTechnician abaixo, que NUNCA aceita o
// Pesquisador. Ver cada Phase*.tsx: canActAsTechnician (este helper, pro
// acesso aos campos/checklist) é uma variável separada de canSign/
// canSignPhysical (canSignAsTechnician, pra assinatura).
export const canPerformRole = (currentRole: UserRole, requiredRole: UserRole): boolean =>
  currentRole === 'curador' ||
  currentRole === requiredRole ||
  (requiredRole === 'tecnico' && currentRole === 'pesquisador');

// Quem pode SER a assinatura "técnico" que destrava uma fase — diferente de
// canPerformRole acima, que também libera o Pesquisador pra acessar/editar
// (decisão de acesso out/2026). Acesso e assinatura são coisas distintas: nas
// fases onde Técnico e Pesquisador têm acesso, a assinatura do Técnico (ou do
// Curador, agindo como técnico) continua sendo a única que conta — o
// Pesquisador pode registrar sua própria confirmação separada, sempre
// opcional, mas nunca substitui esta (decisão de acesso out/2026, correção).
export const canSignAsTechnician = (currentRole: UserRole): boolean =>
  currentRole === 'curador' || currentRole === 'tecnico';

// Funções de Administrador (cadastro de pessoas, links de acesso, Zona de
// Risco): quem tem o papel Administrador, ou outro papel com o acesso de
// Administrador somado (ex.: a Curadora que também administra o sistema).
export const hasAdminAccess = (person: Pick<UserProfile, 'role' | 'adminAccess'> | null | undefined): boolean =>
  Boolean(person && (person.role === 'administrador' || person.adminAccess === true));
