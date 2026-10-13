import type { UserProfile, UserRole } from '../types/sgccco';

// O Curador pode executar as ações de qualquer papel sem perder sua identidade
// nas assinaturas e nos registros de auditoria.
export const canPerformRole = (currentRole: UserRole, requiredRole: UserRole): boolean =>
  currentRole === 'curador' || currentRole === requiredRole;

// Quem pode SER a assinatura "técnico" que destrava uma fase — diferente de
// canPerformRole acima, que (no PR #58, "Pesquisador ganha os mesmos acessos
// do Técnico") também passa a liberar o Pesquisador pra acessar/editar.
// Acesso e assinatura são coisas distintas: nas fases onde Técnico e
// Pesquisador têm acesso, a assinatura do Técnico (ou do Curador, agindo como
// técnico) continua sendo a única que conta — o Pesquisador pode registrar
// sua própria confirmação separada, sempre opcional, mas nunca substitui
// esta.
export const canSignAsTechnician = (currentRole: UserRole): boolean =>
  currentRole === 'curador' || currentRole === 'tecnico';

// Funções de Administrador (cadastro de pessoas, links de acesso, Zona de
// Risco): quem tem o papel Administrador, ou outro papel com o acesso de
// Administrador somado (ex.: a Curadora que também administra o sistema).
export const hasAdminAccess = (person: Pick<UserProfile, 'role' | 'adminAccess'> | null | undefined): boolean =>
  Boolean(person && (person.role === 'administrador' || person.adminAccess === true));
