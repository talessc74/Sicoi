import type { UserRole } from '../types/sgccco';

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
export const canPerformRole = (currentRole: UserRole, requiredRole: UserRole): boolean =>
  currentRole === 'curador' ||
  currentRole === requiredRole ||
  (requiredRole === 'tecnico' && currentRole === 'pesquisador');
