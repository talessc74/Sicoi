import type { UserRole } from '../types/sgccco';

// O Curador pode executar as ações de qualquer papel sem perder sua identidade
// nas assinaturas e nos registros de auditoria.
export const canPerformRole = (currentRole: UserRole, requiredRole: UserRole): boolean =>
  currentRole === 'curador' || currentRole === requiredRole;
