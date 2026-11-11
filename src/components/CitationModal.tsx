import React, { useState } from 'react';
import { BookOpen, Copy, Check, Download, X, Quote } from 'lucide-react';
import { INSTITUTION_CONFIG } from '../config/institutionConfig';

interface CitationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CitationModal: React.FC<CitationModalProps> = ({ isOpen, onClose }) => {
  const [copiedFormat, setCopiedFormat] = useState<'abnt' | 'bibtex' | null>(null);

  if (!isOpen) return null;

  const abntText = `DAMASCENA, Nicole Prata; CARVALHO, Tales Seixas de; BENTO, Maria Izabel Cardoso; MACHADO, Carlos Eduardo Palhares. SIGCOI: An Open-Source, Blockchain-Ready Management System for Human Osteological Collections and Forensic Bioanthropology. Forensic Science International / Repositório Institucional, 2026. Disponível em: <https://github.com/nicoledamascena-art/SIGCOI>.`;

  const bibtexText = `@article{damascena2026sigcoi,
  title={SIGCOI: An Open-Source, Blockchain-Ready Management System for Human Osteological Collections and Forensic Bioanthropology},
  author={Damascena, Nicole Prata and Carvalho, Tales Seixas de and Bento, Maria Izabel Cardoso and Machado, Carlos Eduardo Palhares},
  journal={Forensic Science International (Preprint/Em Avaliação)},
  year={2026},
  institution={${INSTITUTION_CONFIG.institutionName}},
  url={https://github.com/nicoledamascena-art/SIGCOI}
}`;

  const copyToClipboard = (text: string, format: 'abnt' | 'bibtex') => {
    navigator.clipboard.writeText(text);
    setCopiedFormat(format);
    setTimeout(() => setCopiedFormat(null), 3000);
  };

  const handleDownloadBibtex = () => {
    const blob = new Blob([bibtexText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'sigcoi-citation.bib';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-start bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <Quote className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Como Citar este Software
              </h3>
              <p className="text-xs text-slate-500">
                Política de Citação Científica &amp; Pós-Doutorado Dra. Nicole Damascena
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh] text-xs">
          <div className="p-3.5 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-900/60 text-sky-900 dark:text-sky-200 leading-relaxed">
            <p className="font-semibold mb-1 flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              Requisito de Uso em Teses, Dissertações e Publicações
            </p>
            O uso da plataforma SIGCOI ou de dados curados através de sua metodologia em artigos científicos, dissertações de mestrado, teses de doutorado e laudos periciais deve referenciar o artigo metodológico fundacional.
          </div>

          {/* Formato ABNT */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-mono uppercase font-bold text-[11px] text-slate-500">
                Formato ABNT (NBR 6023)
              </span>
              <button
                onClick={() => copyToClipboard(abntText, 'abnt')}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 font-medium transition-colors"
              >
                {copiedFormat === 'abnt' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-600 font-bold">Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar ABNT</span>
                  </>
                )}
              </button>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 font-sans text-slate-800 dark:text-slate-200 leading-relaxed select-all">
              {abntText}
            </div>
          </div>

          {/* Formato BibTeX */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-mono uppercase font-bold text-[11px] text-slate-500">
                Formato BibTeX (LaTeX / Zotero / Mendeley)
              </span>
              <div className="flex gap-2">
                <button
                  onClick={handleDownloadBibtex}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 font-medium transition-colors"
                  title="Baixar arquivo .bib"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>.bib</span>
                </button>
                <button
                  onClick={() => copyToClipboard(bibtexText, 'bibtex')}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 font-medium transition-colors"
                >
                  {copiedFormat === 'bibtex' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-600 font-bold">Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar BibTeX</span>
                    </>
                  )}
                </button>
              </div>
            </div>
            <pre className="p-3.5 rounded-xl bg-slate-950 text-slate-300 font-mono text-[11px] overflow-x-auto leading-relaxed border border-slate-800 select-all">
              {bibtexText}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-end bg-slate-50/50 dark:bg-slate-800/40">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-medium text-xs hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
