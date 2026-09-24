import React, { useState } from 'react';
import {
  HelpCircle,
  BookOpen,
  HelpCircle as QuestionIcon,
  ChevronDown,
  ChevronUp,
  FileText,
  ShieldCheck,
  Phone,
  Mail,
  ExternalLink,
  Search,
  CheckCircle2
} from 'lucide-react';

interface HelpViewProps {
  onNavigateToTab: (tab: string) => void;
  onNavigateToDocumentQuery?: (query: string) => void;
}

export const HelpView: React.FC<HelpViewProps> = ({
  onNavigateToTab,
  onNavigateToDocumentQuery
}) => {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [helpSearch, setHelpSearch] = useState('');

  const faqs = [
    {
      question: 'Como funciona o bloqueio sequencial e a assinatura das 7 fases?',
      answer: `O sistema opera sob o princípio da imutabilidade sequencial (§7 e §10 do Manual Normativo). Uma fase N só pode ser finalizada e bloqueada após o preenchimento de todos os dados obrigatórios e a aposição da assinatura digital com hash SHA-256. A Fase N+1 permanece bloqueada até que a Fase N atinja o status "locked".`
    },
    {
      question: 'É possível reabrir uma fase que já foi assinada e travada?',
      answer: `Sim, mas exclusivamente através dos perfis de Curador ou Administrador. A reabertura exige o preenchimento de uma justificativa técnica formal (ex: nova evidência anatômica ou retificação metodológica). A reabertura remove o hash anterior e gera um novo evento na trilha de auditoria para garantir total transparência pericial.`
    },
    {
      question: 'Quem pode visualizar os dados de processo judicial e cemitério?',
      answer: `Por mandamento da LGPD e Resolução DITEC 08/2026, os dados relativos a comarca, número de processo penal, cemitério, quadra, jazigo e declaração de óbito são restritos e visíveis APENAS aos perfis de Curador e Administrador. Eles são ocultados para Técnicos, Pesquisadores Externos e nunca constam em QR Codes públicos ou exportações científicas.`
    },
    {
      question: 'Como é calculada a estimativa de MNI (Número Mínimo de Indivíduos)?',
      answer: `O MNI é determinado pelo curador na Fase 4 com base em elementos diagnósticos irrefutáveis, prioritariamente a duplicação de estruturas ósseas homólogas (ex: dois terceiros molares inferiores esquerdos, duas patelas direitas), discrepâncias extremas de desenvolvimento etário ou dimorfismo sexual evidente.`
    },
    {
      question: 'Qual é a técnica correta para marcação óssea permanente?',
      answer: `O POP-OSTEO-05 determina a aplicação de uma camada base de resina acrílica Paraloid B-72 a 20% em acetona sobre a cortical óssea, seguida da escrita manual com tinta nanquim indelével preta do código oficial SIGCOI (ex: SIGCOI/NIC-2026-0841/IND-01/FEM-D), selando-se posteriormente com uma camada adicional de Paraloid.`
    },
    {
      question: 'Como um pesquisador externo obtém autorização de acesso aos dados?',
      answer: `O pesquisador deve submeter parecer de aprovação emitido por Comitê de Ética em Pesquisa (CEP/CONEP) e processo SEI. O Administrador cadastra a autorização ABAC na Fase 7, delimitando os NICs específicos e as variáveis autorizadas para consulta e exportação com hash de reprodutibilidade.`
    }
  ];

  const glossaryTerms = [
    { term: 'NIC', desc: 'Número de Identificação do Conjunto (formato NIC-AAAA-XXXX). Identificador mestre único e imutável.' },
    { term: 'MNI', desc: 'Número Mínimo de Indivíduos determinado cientificamente por duplicação anatômica ou maturação.' },
    { term: 'ABAC', desc: 'Attribute-Based Access Control. Controle de acesso baseado em atributos (papel, projeto, comitê de ética).' },
    { term: 'Paraloid B-72', desc: 'Copolímero de etil-metacrilato utilizado em conservação forense para criar base reversível de marcação.' },
    { term: 'DICOM', desc: 'Digital Imaging and Communications in Medicine. Padrão internacional para tomografias e radiografias.' },
    { term: 'SHA-256', desc: 'Função de hash criptográfica segura de 256 bits utilizada na assinatura e imutabilidade de cada fase.' }
  ];

  const filteredFaqs = faqs.filter(f =>
    !helpSearch.trim() ||
    f.question.toLowerCase().includes(helpSearch.toLowerCase()) ||
    f.answer.toLowerCase().includes(helpSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
        <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400 font-mono text-xs font-semibold uppercase">
          <HelpCircle className="w-4 h-4" />
          <span>Central de Ajuda, Tutoriais & Dúvidas Frequentes</span>
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white font-mono mt-0.5">
          Guia de Apoio Operacional SIGCOI (v3.2)
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Orientações passo a passo sobre a operação pericial, respostas às dúvidas mais comuns e glossário terminológico.
        </p>
      </div>

      {/* Quick Start Steps */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
        <h3 className="font-bold text-sm text-slate-900 dark:text-white font-mono flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
          <BookOpen className="w-4 h-4 text-sky-600" />
          Fluxo Rápido de Trabalho — Como Operar o Acervo em 4 Etapas
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="w-6 h-6 rounded-full bg-sky-600 text-white font-bold flex items-center justify-center font-mono">1</div>
            <h4 className="font-bold text-slate-900 dark:text-white">Seleção do Conjunto (NIC)</h4>
            <p className="text-slate-500 leading-relaxed">
              Selecione o NIC na fita superior ou crie um novo lote forense através do botão "Novo Conjunto".
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="w-6 h-6 rounded-full bg-sky-600 text-white font-bold flex items-center justify-center font-mono">2</div>
            <h4 className="font-bold text-slate-900 dark:text-white">Preenchimento da Fase Atual</h4>
            <p className="text-slate-500 leading-relaxed">
              Insira os dados técnicos obrigatórios de acordo com o POP respectivo (lavagem, pareamento, DICOM).
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="w-6 h-6 rounded-full bg-sky-600 text-white font-bold flex items-center justify-center font-mono">3</div>
            <h4 className="font-bold text-slate-900 dark:text-white">Assinatura Criptográfica</h4>
            <p className="text-slate-500 leading-relaxed">
              Assine digitalmente a fase para travar os dados e registrar o hash SHA-256 indelével no sistema.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="w-6 h-6 rounded-full bg-sky-600 text-white font-bold flex items-center justify-center font-mono">4</div>
            <h4 className="font-bold text-slate-900 dark:text-white">Avanço Linear & Galpão</h4>
            <p className="text-slate-500 leading-relaxed">
              O avanço desbloqueia a fase seguinte até a transferência e aceite definitivo no Galpão Central.
            </p>
          </div>
        </div>
      </div>

      {/* FAQ & In-Document Search Link */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* FAQs */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white font-mono flex items-center gap-2">
                <QuestionIcon className="w-4 h-4 text-amber-500" />
                Perguntas Frequentes (FAQ)
              </h3>
              <p className="text-slate-500 text-[11px]">
                Dúvidas técnicas sobre protocolos e regras do sistema.
              </p>
            </div>

            <div className="relative w-48">
              <input
                type="text"
                value={helpSearch}
                onChange={(e) => setHelpSearch(e.target.value)}
                placeholder="Filtrar dúvidas..."
                className="w-full pl-7 pr-2 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-[11px]"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2" />
            </div>
          </div>

          <div className="space-y-2.5">
            {filteredFaqs.map((faq, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div
                  key={idx}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden"
                >
                  <button
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="w-full text-left p-3.5 bg-slate-50/70 dark:bg-slate-950/70 hover:bg-slate-100 dark:hover:bg-slate-800/80 flex items-center justify-between gap-3 font-semibold text-slate-900 dark:text-white transition-colors"
                  >
                    <span>{faq.question}</span>
                    {isOpen ? <ChevronUp className="w-4 h-4 shrink-0 text-slate-400" /> : <ChevronDown className="w-4 h-4 shrink-0 text-slate-400" />}
                  </button>
                  {isOpen && (
                    <div className="p-4 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 leading-relaxed font-sans text-xs border-t border-slate-100 dark:border-slate-800">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Glossário e Contatos */}
        <div className="space-y-6">
          {/* Glossário Técnico */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-3 text-xs">
            <h4 className="font-bold text-slate-900 dark:text-white font-mono flex items-center gap-1.5 pb-2 border-b border-slate-200 dark:border-slate-800">
              <FileText className="w-4 h-4 text-sky-600" />
              Glossário Técnico Forense
            </h4>

            <div className="space-y-2 font-sans">
              {glossaryTerms.map(gt => (
                <div key={gt.term} className="p-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800">
                  <span className="font-mono font-bold text-sky-600 dark:text-sky-400 block">{gt.term}</span>
                  <span className="text-slate-600 dark:text-slate-300 text-[11px] leading-tight block mt-0.5">{gt.desc}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Suporte Institucional */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-3 text-xs">
            <h4 className="font-bold text-slate-900 dark:text-white font-mono flex items-center gap-1.5 pb-2 border-b border-slate-200 dark:border-slate-800">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Suporte Técnico INC/DITEC/PF
            </h4>

            <p className="text-slate-500 leading-relaxed text-[11px]">
              Dúvidas periciais ou necessidade de emissão de novas credenciais comitê de ética:
            </p>

            <div className="space-y-2 font-mono text-[11px]">
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span>ditec.antropologia@mj.gov.br</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span>(61) 2025-9800 (Ramal 410)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
