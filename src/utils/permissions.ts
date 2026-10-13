import type { UserProfile, UserRole } from '../types/sgccco';

// O Curador pode executar as ações de qualquer papel sem perder sua identidade
// nas assinaturas e nos registros de auditoria.
export const canPerformRole = (currentRole: UserRole, requiredRole: UserRole): boolean =>
  currentRole === 'curador' || currentRole === requiredRole;

// Funções de Administrador (cadastro de pessoas, links de acesso, Zona de
// Risco): quem tem o papel Administrador, ou outro papel com o acesso de
// Administrador somado (ex.: a Curadora que também administra o sistema).
export const hasAdminAccess = (person: Pick<UserProfile, 'role' | 'adminAccess'> | null | undefined): boolean =>
  Boolean(person && (person.role === 'administrador' || person.adminAccess === true));
