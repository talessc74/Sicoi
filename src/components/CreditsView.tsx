import React from 'react';
import { ArrowLeft, Linkedin, Github, Plus } from 'lucide-react';
import { CREDITS_PEOPLE, ContributorCredit } from '../data/creditsData';

interface CreditsViewProps {
  onBack: () => void;
  people?: ContributorCredit[];
}

export const CreditsView: React.FC<CreditsViewProps> = ({
  onBack,
  people = CREDITS_PEOPLE
}) => {
  return (
    <div className="space-y-8 py-4 sm:py-6 max-w-5xl mx-auto">
      {/* Botão Voltar */}
      <div>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-2xs"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Voltar</span>
        </button>
      </div>

      {/* Cabeçalho */}
      <div className="text-center space-y-2">
        <span className="text-[11px] font-mono font-bold tracking-widest text-slate-400 dark:text-slate-500 uppercase">
          CRÉDITOS
        </span>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Quem fez o SIGCOI
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-xl mx-auto leading-relaxed">
          Design e desenvolvimento do SIGCOI, com a participação de quem pensou, revisou e testou.
        </p>
      </div>

      {/* Grade de Quadros das Pessoas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
        {people.map((person) => (
          <div
            key={person.id}
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex items-center gap-4 transition-all hover:border-slate-300 dark:hover:border-slate-700"
          >
            {/* Avatar Circular */}
            <div
              className={`w-14 h-14 rounded-full flex items-center justify-center font-bold text-lg text-white flex-shrink-0 shadow-2xs ${
                person.avatarBg || 'bg-slate-900 dark:bg-slate-800'
              }`}
            >
              {person.initials}
            </div>

            {/* Dados do Integrante */}
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white uppercase tracking-tight truncate" title={person.name}>
                {person.name}
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium mt-0.5">
                {person.role}
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                {person.institution}
              </p>

              {/* Links Sociais / Profissionais */}
              <div className="flex items-center gap-2.5 mt-2">
                {person.linkedin && (
                  <a
                    href={person.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 transition-colors"
                    title={`LinkedIn de ${person.name}`}
                  >
                    <Linkedin className="w-4 h-4" />
                  </a>
                )}
                {person.github && (
                  <a
                    href={person.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                    title={`GitHub de ${person.name}`}
                  >
                    <Github className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Quadro "Mais Alguém?" */}
        <div className="bg-white/60 dark:bg-slate-900/40 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-5 flex items-center gap-4 transition-all">
          <div className="w-14 h-14 rounded-full border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center text-slate-400 flex-shrink-0">
            <Plus className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-200 uppercase tracking-tight">
              MAIS ALGUÉM?
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
              Quem mais entra nos créditos? Nome, função, instituição e, se quiser, foto e links.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
