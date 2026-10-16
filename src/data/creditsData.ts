export interface ContributorCredit {
  id: string;
  name: string;
  initials: string;
  role: string;
  institution: string;
  avatarBg?: string;
  linkedin?: string;
  github?: string;
  email?: string;
}

export const CREDITS_PEOPLE: ContributorCredit[] = [
  {
    id: 'tales',
    name: 'TALES SEIXAS DE CARVALHO',
    initials: 'T',
    role: 'Função a confirmar',
    institution: 'Instituição · UF',
    avatarBg: 'bg-slate-900 dark:bg-slate-800',
    linkedin: 'https://linkedin.com',
    github: 'https://github.com'
  },
  {
    id: 'maria-izabel',
    name: 'MARIA IZABEL CARDOSO BENTO',
    initials: 'M',
    role: 'Função a confirmar',
    institution: 'Instituição · UF',
    avatarBg: 'bg-indigo-900 dark:bg-indigo-800',
    linkedin: 'https://linkedin.com',
    github: 'https://github.com'
  },
  {
    id: 'nicole',
    name: 'NICOLE PRATA DAMASCENA',
    initials: 'N',
    role: 'Função a confirmar',
    institution: 'Instituição · UF',
    avatarBg: 'bg-cyan-900 dark:bg-cyan-800',
    linkedin: 'https://linkedin.com',
    github: 'https://github.com'
  },
  {
    id: 'carlos-eduardo',
    name: 'CARLOS EDUARDO PALHARES MACHADO',
    initials: 'C',
    role: 'Função a confirmar',
    institution: 'Instituição · UF',
    avatarBg: 'bg-blue-900 dark:bg-blue-800',
    linkedin: 'https://linkedin.com',
    github: 'https://github.com'
  }
];
