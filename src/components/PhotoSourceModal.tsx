import React from 'react';
import { Camera, Image as ImageIcon } from 'lucide-react';

// Escolha explícita entre tirar uma foto nova (câmera) ou anexar uma já
// existente no dispositivo (galeria/arquivos) — sem isso, o atributo
// capture="environment" do <input type="file"> abre a câmera direto em
// muitos navegadores móveis, sem dar a opção de anexar uma foto já tirada
// (pedido do Tales, out/2026). Reaproveitado nos três lugares que capturam
// foto real hoje: Phase1Recebimento, PopConversationalConductor e
// Phase4Curadoria.
interface PhotoSourceModalProps {
  onChooseCamera: () => void;
  onChooseGallery: () => void;
  onCancel: () => void;
}

export const PhotoSourceModal: React.FC<PhotoSourceModalProps> = ({ onChooseCamera, onChooseGallery, onCancel }) => (
  <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-xs w-full p-5 shadow-2xl space-y-2.5 text-xs">
      <h4 className="font-bold text-sm text-slate-900 dark:text-white text-center mb-1">Registrar foto</h4>
      <button
        type="button"
        onClick={onChooseCamera}
        className="w-full py-3 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
      >
        <Camera className="w-4 h-4" />
        <span>Abrir Câmera</span>
      </button>
      <button
        type="button"
        onClick={onChooseGallery}
        className="w-full py-3 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold flex items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
      >
        <ImageIcon className="w-4 h-4" />
        <span>Anexar Foto</span>
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="w-full py-2 text-slate-500 dark:text-slate-400 text-[11px] hover:text-slate-700 dark:hover:text-slate-200"
      >
        Cancelar
      </button>
    </div>
  </div>
);
