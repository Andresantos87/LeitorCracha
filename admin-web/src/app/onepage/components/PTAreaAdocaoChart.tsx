"use client";

import React, { useMemo, useState, useEffect } from "react";
import { useTranslation } from "@/lib/useTranslation";

interface PTAreaAdocaoChartProps {
  ptRawData: any[];
  filtroPlantaPt: string;
}

const baselines: Record<string, Record<string, number>> = {
  "Guaíba": { "L. Fibras": 210, "Pátio": 188, "Caustif.": 174, "CR": 137, "Secagem": 91, "Águas": 72, "Defapa": 57, "Pl. Quím.": 47, "Energia": 38 },
  "Santa Fe": { "Pl. Quím.": 60, "Pátio": 60, "CR": 55, "Secagem": 50, "L. Fibras": 50, "Energia": 45 }
};

const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function normalizeArea(rawArea: string) {
    if (!rawArea) return 'Outros';
    const a = rawArea.toUpperCase();
    
    // Pátio de Madeiras
    if (a.includes('PATIO') || a.includes('PÁTIO') || a.includes('CAVACO') || a.includes('MADEIRA') || a.includes('ASTIL') || a.includes('MADERAS') || a.includes('ROLLIZOS')) {
        return 'Pátio';
    }
    // Caustificação
    if (a.includes('CAUST')) {
        return 'Caustif.';
    }
    // Caldeira de Recuperação
    if (a.includes('RECUP') || a.includes('CR3')) {
        return 'CR';
    }
    // Linha de Fibras
    if (a.includes('FIBRA') || a.includes('BRANQ') || a.includes('BLANQ') || a.includes('LAVADO') || a.includes('DIG.CONT') || a.includes('PULPA') || a.includes('CELULOSE')) {
        return 'L. Fibras';
    }
    // Águas / Efluentes (ETA, ETE)
    if (a.includes('ETA') || a.includes('ETE') || a.includes('ÁGUA') || a.includes('AGUA') || a.includes('EFLUENTE') || a.includes('DESMINERALIZA')) {
        return 'Águas';
    }
    // Energia
    if (a.includes('ENERGIA') || a.includes('BIOMAS') || a.includes('UTILIDADES')) {
        return 'Energia';
    }
    // Secagem
    if (a.includes('SECAGEM') || a.includes('SECADO')) {
        return 'Secagem';
    }
    // Planta Química
    if (a.includes('QUIM') || a.includes('QUÍM') || a.includes('CLORO') || a.includes('SODA')) {
        return 'Pl. Quím.';
    }
    // Defapa
    if (a.includes('DEFAPA')) {
        return 'Defapa';
    }
    
    return 'Outros';
}

export default function PTAreaAdocaoChart({ ptRawData, filtroPlantaPt }: PTAreaAdocaoChartProps) {
  const { t } = useTranslation();
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);

  const { data, mesesDisponiveis, mesAtual } = useMemo(() => {
    if (!ptRawData || ptRawData.length === 0) return { data: [], mesesDisponiveis: [], mesAtual: null };
    
    let filtered = ptRawData;
    if (filtroPlantaPt !== "Todas") {
         filtered = ptRawData.filter(r => r["Planta"] === filtroPlantaPt || r["Planta"] === (filtroPlantaPt === "Guaíba" ? "Guaiba" : "Santa Fe"));
    }

    const mesesEncontrados = new Set<number>();
    let ultimoMesGeral = -1;

    filtered.forEach(r => {
        const dateKey = Object.keys(r).find(k => k.includes('cio') || k.includes('nicio') || k.includes('In') || k.includes('Fecha de'));
        const d = dateKey ? r[dateKey] : null;
        if (d) {
            const parts = d.split('/');
            if (parts.length >= 2) {
                const m = parseInt(parts[1], 10) - 1;
                if (m >= 0 && m < 12) {
                    mesesEncontrados.add(m);
                    if (m > ultimoMesGeral && m <= new Date().getMonth()) {
                        ultimoMesGeral = m;
                    }
                }
            }
        }
    });

    const mesesDisponiveisArr = Array.from(mesesEncontrados).sort((a, b) => a - b);
    
    let mesParaFiltrar = selectedMonth;
    if (mesParaFiltrar === null) {
        mesParaFiltrar = ultimoMesGeral !== -1 ? ultimoMesGeral : new Date().getMonth();
    }
    
    // Filtrar os PTs apenas do mês selecionado
    const ptsDoMes = filtered.filter(r => {
        const dateKey = Object.keys(r).find(k => k.includes('cio') || k.includes('nicio') || k.includes('In') || k.includes('Fecha de'));
        const d = dateKey ? r[dateKey] : null;
        if (!d) return false;
        const parts = d.split('/');
        return parts.length >= 2 && parseInt(parts[1], 10) - 1 === mesParaFiltrar;
    });

    const areas: Record<string, number> = {};
    
    ptsDoMes.forEach(r => {
        const areaKey = Object.keys(r).find(k => k.includes('rea de opera'));
        const a = areaKey ? r[areaKey] : "";
        const normalized = normalizeArea(a || "");
        if (normalized !== "Outros" ) {
            areas[normalized] = (areas[normalized] || 0) + 1;
        }
    });

    // Calcular as metas
    const metaPorArea: Record<string, number> = {};
    Object.keys(baselines).forEach(planta => {
        if (filtroPlantaPt === "Todas" || filtroPlantaPt === planta) {
            Object.keys(baselines[planta]).forEach(area => {
                metaPorArea[area] = (metaPorArea[area] || 0) + (baselines[planta][area] * 4); // * 4 semanas
            });
        }
    });

    // Montar o array final com porcentagens
    const result = Object.keys(metaPorArea).map(area => {
        const realizado = areas[area] || 0;
        const meta = metaPorArea[area] || 1;
        const adocao = Math.min(100, Math.round((realizado / meta) * 100));
        return {
            area,
            realizado,
            meta,
            adocao
        };
    });

    return { 
        data: result.sort((a, b) => b.adocao - a.adocao), 
        mesesDisponiveis: mesesDisponiveisArr,
        mesAtual: mesParaFiltrar
    };
  }, [ptRawData, filtroPlantaPt, selectedMonth]);

  // Se trocar a planta ou resetar dados e o selectedMonth nao tiver dados, reseta pro ultimo
  useEffect(() => {
      if (mesesDisponiveis.length > 0 && selectedMonth !== null && !mesesDisponiveis.includes(selectedMonth)) {
          setSelectedMonth(null); // Reseta para auto (ultimoMesGeral)
      }
  }, [mesesDisponiveis, selectedMonth]);

  return (
    <div id="chart-area-adocao" className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl flex flex-col w-full h-full mx-auto mt-8 xl:mt-0 relative">
      
      {/* Cabeçalho Flexível para evitar sobreposição */}
      <div className="flex justify-between items-start mb-6 gap-4">
        <div>
          <h3 className="text-lg font-bold text-white flex flex-wrap items-center gap-2">
              Ranking de Adoção por Área
              {mesAtual !== null && (
                  <span className="bg-sky-500/20 text-sky-400 text-xs px-2.5 py-0.5 rounded-full border border-sky-500/30 uppercase tracking-wider whitespace-nowrap">
                      {monthNames[mesAtual]}
                  </span>
              )}
          </h3>
          <p className="text-sm text-slate-400 mt-1">{t.perfMonthVsGoal}</p>
        </div>

        <div className="shrink-0 z-10 pt-0.5">
          <select 
              className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-bold text-slate-300 outline-none focus:border-sky-500 transition-colors cursor-pointer pdf-mode-hide shadow-lg"
              value={selectedMonth === null ? "" : selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value === "" ? null : parseInt(e.target.value, 10))}
          >
              <option value="">Automático ({mesAtual !== null ? monthNames[mesAtual] : "N/A"})</option>
              {mesesDisponiveis.map(m => (
                  <option key={m} value={m}>{monthNames[m]}</option>
              ))}
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden pr-2 space-y-4 hide-scrollbar" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {data.length === 0 ? (
            <p className="text-slate-500 text-sm text-center mt-10">{t.noData}</p>
        ) : (
            data.map((item, idx) => (
                <div key={idx} className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-end">
                        <span className="font-bold text-slate-200 text-xs tracking-wide">{item.area}</span>
                        <span className="text-[11px] text-slate-400 font-medium">
                            <strong className="text-white">{item.realizado}</strong> / {item.meta} ({item.adocao}%)
                        </span>
                    </div>
                    <div className="w-full bg-slate-800/80 rounded-full h-4 overflow-hidden flex border border-slate-700/50">
                        <div 
                            className={`h-4 rounded-full transition-all duration-1000 ${
                              item.adocao >= 80 ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 
                              item.adocao >= 50 ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]' : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]'
                            }`}
                            style={{ width: `${item.adocao}%` }}
                        ></div>
                    </div>
                </div>
            ))
        )}
      </div>
    </div>
  );
}
