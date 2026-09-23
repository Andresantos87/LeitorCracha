"use client";

import React, { useMemo } from 'react';
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

interface PTChartProps {
  chartData: { area: string; pt: number }[];
  title: string;
}

export default function PTChart({ chartData, title }: PTChartProps) {
  const data = useMemo(() => {
    let cumulative = 0;
    return chartData.map((item, index) => {
      cumulative += item.pt;
      /* First 3 (orange), next 2 (dark green), last 4 (light green) */
      let color = "#f25c32"; // Laranja
      if (index >= 3 && index <= 4) color = "#1a362d"; // Verde escuro
      if (index > 4) color = "#7da559"; // Verde claro
      
      return {
        ...item,
        cumulative,
        color
      };
    });
  }, [chartData]);

  // If no data, render empty state
  if (data.length === 0) {
     return (
        <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl flex flex-col w-full h-full min-h-[400px] mx-auto items-center justify-center">
            <p className="text-slate-500 font-medium">Sem dados para exibir.</p>
        </div>
     );
  }

  return (
    <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl flex flex-col w-full mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-white">{title}</h3>
          <p className="text-sm text-slate-400">Principais áreas vs Acumulado</p>
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
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis 
              yAxisId="left"
              stroke="#94a3b8" 
              fontSize={12}
              tickLine={false}
              axisLine={false}
              dx={-10}
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
            
            <Bar yAxisId="left" dataKey="pt" radius={[4, 4, 0, 0]} maxBarSize={60}>
              {data.map((entry, index) => (
                <Cell key={"cell-" + index} fill={entry.color} />
              ))}
              <LabelList dataKey="pt" position="top" fill="#cbd5e1" fontSize={12} dy={-5} />
            </Bar>
            
            <Line 
              yAxisId="right"
              type="monotone" 
              dataKey="cumulative" 
              stroke="#d97706" 
              strokeWidth={3}
              dot={{ r: 6, fill: '#d97706', strokeWidth: 0 }}
              activeDot={{ r: 8, fill: '#f59e0b', strokeWidth: 0 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}