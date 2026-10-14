import React, { useState } from 'react';
import { OsteologicalCollection } from '../types/sgccco';
import { WAREHOUSE_STRUCTURE } from '../data/mockData';
import { Warehouse, Thermometer, Droplets, ShieldCheck, Box, Info } from 'lucide-react';

interface WarehouseRackMapProps {
  collections: OsteologicalCollection[];
  onSelectNic: (nic: string) => void;
}

export const WarehouseRackMap: React.FC<WarehouseRackMapProps> = ({
  collections,
  onSelectNic
}) => {
  const [activeZone, setActiveZone] = useState<'provisonal' | 'definitive'>('definitive');

  const zoneData = WAREHOUSE_STRUCTURE[activeZone];
  const roomName = activeZone === 'provisonal' ? (zoneData as any).room : `${(zoneData as any).warehouse} · ${(zoneData as any).building}`;

  // Calculate total occupied slots in this zone
  let occupiedCount = 0;
  let totalCapacity = 0;

  zoneData.racks.forEach(rack => {
    rack.shelves.forEach(sh => {
      totalCapacity += sh.capacity;
      occupiedCount += sh.occupiedBoxes.length;
    });
  });

  const occupancyRate = totalCapacity > 0 ? Math.round((occupiedCount / totalCapacity) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400 font-mono text-xs font-semibold uppercase">
              <Warehouse className="w-4 h-4" />
              <span>Mapa Físico de Estantes & Custódia Espacial (§12)</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white font-mono mt-0.5">
              {roomName}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Navegação hierárquica por Instalação &gt; Sala &gt; Estante &gt; Prateleira &gt; Caixa.
            </p>
          </div>

          {/* Environmental Telemetry Sensors */}
          <div className="flex items-center gap-3">
            <div className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center gap-2 text-xs font-mono">
              <Thermometer className="w-4 h-4 text-emerald-500" />
              <span className="text-slate-500">Temp:</span>
              <span className="text-slate-900 dark:text-white font-bold">{activeZone === 'definitive' ? '20.4' : '22.1'}°C</span>
            </div>

            <div className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center gap-2 text-xs font-mono">
              <Droplets className="w-4 h-4 text-sky-500" />
              <span className="text-slate-500">Umidade:</span>
              <span className="text-slate-900 dark:text-white font-bold">{activeZone === 'definitive' ? '48.2' : '51.0'}%</span>
            </div>

            <div className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5 text-xs font-mono text-emerald-700 dark:text-emerald-300 font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span className="hidden sm:inline">Monitoramento Ativo</span>
            </div>
          </div>
        </div>

        {/* Zone Selector Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-2 mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-mono mr-1">Instalação:</span>
            <button
              onClick={() => setActiveZone('definitive')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                activeZone === 'definitive'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              Galpão Definitivo Central (Fase 6)
            </button>
            <button
              onClick={() => setActiveZone('provisonal')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                activeZone === 'provisonal'
                  ? 'bg-sky-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              Sala B-10 (Armazenamento Provisório - Fase 3)
            </button>
          </div>

          <div className="font-mono text-xs text-slate-500">
            Taxa de Ocupação da Sala: <strong className="text-slate-900 dark:text-white">{occupancyRate}%</strong> ({occupiedCount}/{totalCapacity} caixas)
          </div>
        </div>
      </div>

      {/* Grid of Racks & Shelves */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {zoneData.racks.map((rack) => (
          <div
            key={rack.rackCode}
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4"
          >
            <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-800">
              <span className="font-bold font-mono text-slate-900 dark:text-white text-sm">
                {rack.rackCode}
              </span>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                {rack.shelves.length} Prateleiras
              </span>
            </div>

            <div className="space-y-3">
              {rack.shelves.map((shelf) => {
                const isFull = shelf.occupiedBoxes.length >= shelf.capacity;

                return (
                  <div
                    key={shelf.shelfCode}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 space-y-2 text-xs"
                  >
                    <div className="flex justify-between items-center font-mono">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {shelf.shelfCode}
                      </span>
                      <span className={`text-[10px] font-bold ${isFull ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {shelf.occupiedBoxes.length} / {shelf.capacity} caixas
                      </span>
                    </div>

                    {/* Visual box slots */}
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
                      {Array.from({ length: shelf.capacity }).map((_, idx) => {
                        const boxCode = shelf.occupiedBoxes[idx];
                        const matchingNic = collections.find(c =>
                          c.phase1.preliminaryBoxes.some(b => b.boxCode === boxCode || b.id === boxCode) ||
                          c.phase6.finalLocations.some(fl => fl.boxId === boxCode)
                        )?.nic || (boxCode ? 'COI-001' : undefined);

                        return (
                          <div
                            key={idx}
                            onClick={() => matchingNic && onSelectNic(matchingNic)}
                            title={boxCode ? `Caixa: ${boxCode} (COI: ${matchingNic || 'N/D'}) - Clique para abrir` : 'Vão Livre'}
                            className={`h-10 rounded-lg border flex flex-col items-center justify-center p-1 text-[9px] font-mono transition-all ${
                              boxCode
                                ? 'bg-amber-100 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 cursor-pointer hover:ring-2 hover:ring-amber-500'
                                : 'bg-slate-100/50 dark:bg-slate-900/50 border-dashed border-slate-300 dark:border-slate-800 text-slate-400'
                            }`}
                          >
                            {boxCode ? (
                              <>
                                <Box className="w-3 h-3 mb-0.5 text-amber-700 dark:text-amber-300" />
                                <span className="truncate max-w-full font-bold">{boxCode.split('-').slice(-2).join('-') || boxCode}</span>
                              </>
                            ) : (
                              <span>Livre</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
