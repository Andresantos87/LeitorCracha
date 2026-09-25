"use client";

import React, { useMemo } from "react";
import { useTranslation } from "@/lib/useTranslation";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
  Cell,
  ReferenceLine
} from 'recharts';

interface PTMonthlyChartProps {
  monthlyData: any[];
  filtroPlantaPt: string;
  filtroAreaPt: string;
  setFiltroAreaPt: (area: string) => void;
  areasDisponiveis: string[];
}

const baselineGuaiba: Record<string, number> = {
  "L. Fibras": 210,
  "Pátio": 188,
  "Caustif.": 174,
  "CR": 137,
  "Secagem": 91,
  "Águas": 72,
  "Defapa": 57,
  "Pl. Quím.": 47,
  "Energia": 38
};

const baselineSantaFe: Record<string, number> = {
  "Pl. Quím.": 60,
  "CR": 55,
  "Secagem": 50,
  "L. Fibras": 50,
  "Energia": 45,
  "Pátio": 60
};

export default function PTMonthlyChart({ monthlyData = [], filtroPlantaPt, filtroAreaPt, setFiltroAreaPt, areasDisponiveis = [] }: PTMonthlyChartProps) {
  const { t } = useTranslation();
  
  const metaInfo = useMemo(() => {
    let metaSemanal = 0;
    
    const getMeta = (base: Record<string, number>) => {
       if (filtroAreaPt === "Todas") {
           return Object.values(base).reduce((a, b) => a + b, 0);
       }
       return base[filtroAreaPt] || 0;
    };

    if (filtroPlantaPt === "Guaíba") {
        metaSemanal = getMeta(baselineGuaiba);
    } else if (filtroPlantaPt === "Santa Fe") {
        metaSemanal = getMeta(baselineSantaFe);
    } else {
        metaSemanal = getMeta(baselineGuaiba) + getMeta(baselineSantaFe);
    }

    const metaMensal = metaSemanal * 4;
    return Math.round(metaMensal);
  }, [filtroPlantaPt, filtroAreaPt]);

  const data = useMemo(() => {
    if (!monthlyData || monthlyData.length === 0) return [];
    
    let cumulative = 0;
    return monthlyData.map((item, index) => {
      cumulative += item.pt;
      const isCurrentMonth = index === monthlyData.length - 1;
      
      let adocaoMes = 0;
      if (metaInfo > 0 && item.pt > 0) {
          adocaoMes = Math.min(100, Math.round((item.pt / metaInfo) * 100));
      }

      return {
          ...item,
          pt: item.pt === 0 ? null : item.pt,
          realPt: item.pt,
          cumulative,
          adocaoMes,
          metaMensalVal: metaInfo,
          color: isCurrentMonth ? "#3b82f6" : "#64748b" 
        };
      });
  }, [monthlyData, metaInfo]);

  const currentAdocao = useMemo(() => {
     if (metaInfo === 0 || data.length === 0) return null;
     let ultimo = [...data].reverse().find(d => d.pt > 0);
     if (!ultimo) return null;
     return { perc: ultimo.adocaoMes, atual: ultimo.realPt, meta: metaInfo };
  }, [data, metaInfo]);

  const renderCustomBarLabel = (props: any) => {
    const { x, y, width, value } = props;
    if (value === 0 || value === undefined || value === null) return null;
    
    const realAdocao = metaInfo > 0 ? Math.min(100, Math.round((value / metaInfo) * 100)) : 0;

    return (
      <g>
        <text x={x + width / 2} y={y - 32} fill="#ffffff" style={{ textShadow: "0px 2px 4px rgba(0,0,0,0.8)" }} textAnchor="middle" fontSize={16} fontWeight="bold">
          {value}
        </text>
        {metaInfo > 0 && (
          <>
            <rect 
              x={x + width / 2 - 25} 
              y={y - 24} 
              width={50} 
              height={20} 
              rx={8} 
              fill="#064e3b" 
              stroke="#10b981"
              strokeWidth={1}
            />
            <text x={x + width / 2} y={y - 10} fill="#6ee7b7" textAnchor="middle" fontSize={12} fontWeight="bold">
              {realAdocao}%
            </text>
          </>
        )}
      </g>
    );
  };

  const renderCustomLineLabel = (props: any) => {
    const { x, y, value } = props;
    if (value === 0 || value === undefined) return null;
    
    return (
      <text x={x} y={y - 10} fill="#f59e0b" textAnchor="middle" fontSize={11} fontWeight="bold">
        {value}
      </text>
    );
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      // Find the pt payload, because payload[0] might be the meta bar now!
      const ptPayload = payload.find((p: any) => p.dataKey === 'pt') || payload[0];
      const barData = ptPayload.payload;
      return (
        <div className="bg-slate-900 border border-slate-700 p-3 rounded-xl shadow-xl z-50 relative">
          <p className="text-white font-bold mb-2">{label}</p>
          <p className="text-blue-400 text-sm">{t.ptsDone}: <strong className="text-white">{barData.realPt || 0}</strong></p>
          
          {metaInfo > 0 && (
             <>
               <div className="h-px w-full bg-slate-700 my-2" />
               <p className="text-slate-400 text-sm">{t.monthlyGoal}: <strong className="text-white">{metaInfo}</strong></p>
               <p className="text-emerald-400 text-sm">{t.monthAdhesion}: <strong className="text-white">{metaInfo > 0 ? Math.min(100, Math.round(((barData.realPt || 0) / metaInfo) * 100)) : 0}%</strong></p>
             </>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div id="chart-monthly" className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl flex flex-col w-full mx-auto mt-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div>
          <h3 className="text-lg font-bold text-white">{t.monthlyEvol}</h3>
          <p className="text-sm text-slate-400">{t.perfVsGoal}</p>
          {currentAdocao && (
             <div className="mt-2 inline-flex items-center gap-2 bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full text-xs font-bold border border-emerald-500/20">
                Adoção Atual (Último Mês): {currentAdocao.perc}% ({currentAdocao.atual} / {currentAdocao.meta})
             </div>
          )}
        </div>
        
        <div>
          <select 
             value={filtroAreaPt}
             onChange={(e) => setFiltroAreaPt(e.target.value)}
             className="bg-slate-800 text-slate-200 text-sm font-medium border border-slate-700 rounded-lg px-3 py-2 outline-none focus:border-emerald-500 transition-colors"
          >
             <option value="Todas">Área: Todas</option>
             {areasDisponiveis.map(a => (
                <option key={a} value={a}>{a}</option>
             ))}
          </select>
        </div>
      </div>
      
      <div className="h-[400px] w-full mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={{
              top: 45,
              right: 20,
              bottom: 20,
              left: 20,
            }}
          >
            <CartesianGrid stroke="#334155" strokeDasharray="3 3" vertical={false} />
            <XAxis 
              dataKey="mes" 
              stroke="#94a3b8" 
              fontSize={12}
              tickLine={false}
              axisLine={false}
              dy={10}
            />
            <YAxis 
              yAxisId="left"
              stroke="#94a3b8" 
              fontSize={12}
              tickLine={false}
              axisLine={false}
              dx={-10}
              domain={[0, dataMax => Math.ceil(Math.max(dataMax, metaInfo) * 1.25)]}
            />
              
            
            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#334155', opacity: 0.4 }} />
            
            <Bar yAxisId="left" dataKey="metaMensalVal" name="Meta" fill="#1e293b" radius={[4, 4, 0, 0]} maxBarSize={65} />
            
            <Bar yAxisId="left" dataKey="pt" name="Realizado" radius={[4, 4, 0, 0]} maxBarSize={65} minPointSize={4}>
              {data.map((entry, index) => (
                <Cell key={"cell-" + index} fill={entry.color} />
              ))}
              <LabelList dataKey="realPt" content={renderCustomBarLabel} />
            </Bar>
            
            
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}