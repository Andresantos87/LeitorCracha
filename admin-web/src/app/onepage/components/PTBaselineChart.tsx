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
  ReferenceLine,
  LabelList,
  Cell
} from 'recharts';

interface PTBaselineChartProps {
  planta: "Guaíba" | "Santa Fe";
}

const baselineGuaibaData = [
  { area: "L. Fibras", pt: 210 },
  { area: "Pátio", pt: 188 },
  { area: "Caustif.", pt: 174 },
  { area: "CR", pt: 137 },
  { area: "Secagem", pt: 91 },
  { area: "Águas", pt: 72 },
  { area: "Defapa", pt: 57 },
  { area: "Pl. Quím.", pt: 47 },
  { area: "Energia", pt: 38 },
];

const baselineSantaFeData = [
  { area: "Pl. Quím.", pt: 60 },
  { area: "Pátio", pt: 60 },
  { area: "CR", pt: 55 },
  { area: "Secagem", pt: 50 },
  { area: "L. Fibras", pt: 50 },
  { area: "Energia", pt: 45 },
];

export default function PTBaselineChart({ planta }: PTBaselineChartProps) {
  const { t } = useTranslation();
  const isGuaiba = planta === "Guaíba";
  const rawData = isGuaiba ? baselineGuaibaData : baselineSantaFeData;
  const meta = isGuaiba ? 506 : 160;

  const data = useMemo(() => {
    let cumulative = 0;
    // Sort array by PT descending just to be safe
    const sorted = [...rawData].sort((a, b) => b.pt - a.pt);
    
    return sorted.map((item, index) => {
      cumulative += item.pt;
      // Define colors dynamically based on thirds/sections
      let color = "#f25c32"; // Laranja
      if (index >= 3 && index <= 4) color = "#1a362d"; // Verde escuro
      if (index > 4) color = "#7da559"; // Verde claro
      
      return {
        ...item,
        cumulative,
        color
      };
    });
  }, [rawData]);

  return (
    <div id={`chart-baseline-${planta !== "Santa Fe" ? "1" : "2"}`} className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl flex flex-col w-full h-full mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-white">{t.weeklyBaseline} - {planta}</h3>
          <p className="text-sm text-slate-400">{t.expectedVsGoal}</p>
        </div>
      </div>
      
      <div className="h-[300px] w-full mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={{
              top: 20,
              right: 20,
              bottom: 20,
              left: 20,
            }}
          >
            <CartesianGrid stroke="#334155" strokeDasharray="3 3" vertical={false} />
            <XAxis 
              dataKey="area" 
              stroke="#94a3b8" 
              fontSize={10}
              tickLine={false}
              axisLine={false}
              dy={10}
              interval={0}
              angle={-30}
              textAnchor="end"
              height={50}
            />
            <YAxis 
              yAxisId="left"
              stroke="#94a3b8" 
              fontSize={12}
              tickLine={false}
              axisLine={false}
              dx={-10}
              domain={[0, dataMax => Math.ceil(Math.max(dataMax, meta) * 1.15)]}
            />
            <YAxis 
              yAxisId="right" 
              orientation="right" 
              stroke="#94a3b8"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              dx={10}
              domain={[0, 'dataMax']}
              hide 
            />
            <Tooltip 
              contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc' }}
              itemStyle={{ color: '#f8fafc' }}
              formatter={(value, name) => [value, name === 'pt' ? 'PTs' : 'Acumulado']}
            />
            
            <ReferenceLine 
              yAxisId="left" 
              y={meta} 
              stroke="#10b981" 
              strokeDasharray="5 5" 
              label={{ position: 'insideTopRight', value: `Meta ${meta} PT/sem`, fill: '#10b981', fontSize: 11 }} 
            />
            
            <Bar yAxisId="left" dataKey="pt" radius={[4, 4, 0, 0]} maxBarSize={80}>
              {data.map((entry, index) => (
                <Cell key={"cell-" + index} fill={entry.color} />
              ))}
              <LabelList dataKey="pt" position="top" fill="#ffffff" style={{ textShadow: "0px 2px 4px rgba(0,0,0,0.8)" }} fontSize={14} fontWeight="bold" dy={-8} />
            </Bar>
            
            <Line 
              yAxisId="right"
              type="monotone" 
              dataKey="cumulative" 
              stroke="#d97706" 
              strokeWidth={3}
              dot={{ r: 4, fill: '#d97706', strokeWidth: 0 }}
              activeDot={{ r: 6, fill: '#f59e0b', strokeWidth: 0 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
