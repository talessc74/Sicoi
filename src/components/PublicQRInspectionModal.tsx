import React from 'react';
import { OsteologicalCollection, UserRole } from '../types/sgccco';
import { QrCode, ShieldCheck, CheckCircle2, AlertTriangle, MapPin, Eye, Lock } from 'lucide-react';

interface PublicQRInspectionModalProps {
  collection: OsteologicalCollection;
  onClose: () => void;
  userRole: UserRole;
}

export const PublicQRInspectionModal: React.FC<PublicQRInspectionModalProps> = ({
  collection,
  onClose,
  userRole
}) => {
  const isPublicQrActive = collection.phase6.publicQrActive;
  const assemblyPhoto = collection.phase4.completeAssemblyPhotoApproved;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                Consulta por Etiqueta QR Code (§11)
              </h3>
              <p className="text-xs text-slate-500 font-mono">
                Padrão SIGCOI v3.2 · Hash Verificado
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-medium"
          >
            Fechar
          </button>
        </div>

        {/* Security Banner: Regra §7 */}
        <div className="p-3 mb-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-start gap-2.5 text-xs text-emerald-800 dark:text-emerald-300">
          <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
          <div>
            <span className="font-bold">Garantia Criptográfica de Privacidade (§7):</span>
            <p className="mt-0.5 text-[11px] text-emerald-700 dark:text-emerald-300/90 leading-tight">
              Dados de cemitério, declaração de óbito e processos judiciais estão segregados e NUNCA constam no QR Code, na busca pública nem para IA.
            </p>
          </div>
        </div>

        {/* Content of QR Code */}
        <div className="space-y-4 text-xs">
          {/* Main Collection Identity */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-mono text-slate-400 uppercase font-semibold block">
                Número de Identificação do Conjunto (NIC)
              </span>
              <span className="text-xl font-bold font-mono text-slate-900 dark:text-white">
                {collection.nic}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-1 rounded-full font-mono text-xs font-semibold ${
                isPublicQrActive
                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300'
                  : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-300'
              }`}>
                {isPublicQrActive ? '● QR Code Ativo' : '▲ Provisório (Em Trânsito/Estudo)'}
              </span>
              <span className="px-2.5 py-1 rounded-md bg-slate-200 dark:bg-slate-800 font-mono text-xs text-slate-800 dark:text-slate-200">
                Fase Atual: {collection.currentPhase}
              </span>
            </div>
          </div>

          {/* Approved Complete Assembly Photo (§11) */}
          <div>
            <span className="font-semibold text-slate-800 dark:text-slate-200 block mb-1.5 flex items-center justify-between">
              <span>Fotografia de Montagem Completa Aprovada (Categoria MONTAGEM_COMPLETA):</span>
              {assemblyPhoto && (
                <span className="text-[10px] text-emerald-600 font-mono font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Aprovada por {assemblyPhoto.approvedBy}
                </span>
              )}
            </span>
            {assemblyPhoto ? (
              <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 relative bg-black">
                <img
                  src={assemblyPhoto.photoUrl}
                  alt={`Montagem esquelética completa de ${collection.nic}`}
                  className="w-full h-64 object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 text-white text-[11px] flex justify-between font-mono">
                  <span>Data da Foto: {new Date(assemblyPhoto.capturedAt).toLocaleDateString('pt-BR')}</span>
                  <span>Hash: {assemblyPhoto.sha256Hash.substring(0, 16)}...</span>
                </div>
              </div>
            ) : (
              <div className="h-40 rounded-xl bg-slate-100 dark:bg-slate-950 border border-dashed border-slate-300 dark:border-slate-800 flex flex-col items-center justify-center text-slate-400 p-4 text-center">
                <Eye className="w-6 h-6 mb-1 opacity-50" />
                <p>Foto de montagem completa pendente de aprovação curatorial (Fase 4).</p>
              </div>
            )}
          </div>

          {/* Identification and Biological Hypotheses */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
            <span className="font-semibold text-slate-900 dark:text-white block">
              Identificação Curatorial Autorizada:
            </span>
            {collection.phase4.individuals && collection.phase4.individuals.length > 0 ? (
              <div className="space-y-2">
                {collection.phase4.individuals.map(ind => (
                  <div key={ind.id} className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-wrap justify-between items-center gap-2">
                    <div>
                      <span className="font-bold font-mono text-slate-900 dark:text-white">{ind.code}</span>
                      <span className="text-slate-500 ml-2 font-mono">Confiança: {ind.confidence.toUpperCase()}</span>
                    </div>
                    <div className="flex gap-2 font-mono text-[11px]">
                      <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                        Sexo: {ind.biologicalProfile.sexEstimate.value}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                        Idade: {ind.biologicalProfile.ageCategory.estimatedRangeYears || ind.biologicalProfile.ageCategory.value}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                        Estatura: {ind.biologicalProfile.statureCm.estimatedValue} cm
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-400 italic">Curadoria biológica em andamento.</p>
            )}
          </div>

          {/* Physical Location */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-sky-600" />
              <div>
                <span className="font-semibold text-slate-900 dark:text-white block">
                  Localização da Caixa:
                </span>
                <span className="text-slate-600 dark:text-slate-300 font-mono text-[11px]">
                  {collection.phase6.finalLocations[0]
                    ? `${collection.phase6.finalLocations[0].location.facility} · ${collection.phase6.finalLocations[0].location.room} · ${collection.phase6.finalLocations[0].location.rack} · ${collection.phase6.finalLocations[0].location.shelf}`
                    : collection.phase3.boxLocations[0]
                    ? `${collection.phase3.boxLocations[0].location.facility} (Provisório) · ${collection.phase3.boxLocations[0].location.room}`
                    : 'Bancada de Triagem e Recepção Inicial'}
                </span>
              </div>
            </div>
            <span className="font-mono text-[10px] text-slate-400">
              {collection.phase6.finalLocations.length > 0 ? 'Definitiva (Galpão)' : 'Provisória'}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-medium text-xs hover:opacity-95 transition-all"
          >
            Fechar Consulta QR
          </button>
        </div>
      </div>
    </div>
  );
};
