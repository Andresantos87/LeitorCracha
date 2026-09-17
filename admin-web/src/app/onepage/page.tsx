"use client";

import React, { useState, useEffect, useMemo } from "react";
import { PieChart, Activity, Users, Target, CheckCircle, Wrench, Settings } from "lucide-react";

export default function OnePageDashboard() {
  const [loading, setLoading] = useState(true);
  const [treinamentos, setTreinamentos] = useState<any[]>([]);
  const [filterPais, setFilterPais] = useState("");
  const [filterCurso, setFilterCurso] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/treinamentos?t=${Date.now()}`);
        const json = await res.json();
        if (json.success) setTreinamentos(json.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Lista de Cursos Únicos para o Filtro
  const cursosUnicos = useMemo(() => {
    const cursos = new Set<string>();
    treinamentos.forEach(t => {
      if (t.nome) cursos.add(t.nome.trim());
    });
    return Array.from(cursos).sort();
  }, [treinamentos]);

  // Cálculos Reais
  const stats = useMemo(() => {
    let totalEsperado = 0;
    let totalCapacitados = 0;
    let turmasAtivas = 0;

    const areasMap: Record<string, { nome: string, total: number, feitos: number, isManutencao: boolean, isOperacao: boolean }> = {};
    const turmasArray: any[] = [];

    let filtrados = treinamentos;
    if (filterPais) {
      filtrados = filtrados.filter(t => t.pais === filterPais);
    }
    if (filterCurso) {
      filtrados = filtrados.filter(t => t.nome?.trim() === filterCurso);
    }

    filtrados.forEach(t => {
      const previstos = t._count?.previstos || 0;
      const registros = t._count?.registros || 0;
      
      totalEsperado += previstos;
      totalCapacitados += registros;
      
      if (!t.status_encerrado) {
        turmasAtivas++;
      }

      // Agrupamento por Área (Nome da Turma)
      const nomeArea = t.turma ? t.turma.trim().toUpperCase() : (t.nome ? t.nome.trim().toUpperCase() : 'DESCONHECIDO');
      
      if (!areasMap[nomeArea]) {
        areasMap[nomeArea] = {
          nome: nomeArea,
          total: 0,
          feitos: 0,
          isManutencao: nomeArea.includes('MANUTENÇÃO') || nomeArea.includes('MANUTENCAO'),
          isOperacao: nomeArea.includes('OPERAÇÃO') || nomeArea.includes('OPERACAO') || nomeArea.includes('MAQUINA') || nomeArea.includes('MÁQUINA')
        };
      }
      
      areasMap[nomeArea].total += previstos;
      areasMap[nomeArea].feitos += registros;

      // Turmas individuais
      turmasArray.push({
        nome: nomeArea,
        curso: t.nome,
        avanco: previstos > 0 ? Math.round((registros / previstos) * 100) : 0,
        faltantes: Math.max(0, previstos - registros),
        isEncerrado: t.status_encerrado,
        data: t.data
      });
    });

    const avancoGlobal = totalEsperado > 0 ? ((totalCapacitados / totalEsperado) * 100).toFixed(1) : "0.0";

    const areas = Object.values(areasMap).map(a => ({
      ...a,
      avanco: a.total > 0 ? Math.round((a.feitos / a.total) * 100) : 0
    })).sort((a, b) => b.avanco - a.avanco); // Ordena por maior avanço

    const areasManutencao = areas.filter(a => a.isManutencao);
    const areasOperacao = areas.filter(a => a.isOperacao);
    const areasOutros = areas.filter(a => !a.isManutencao && !a.isOperacao);

    return { 
      totalEsperado, 
      totalCapacitados, 
      avancoGlobal, 
      turmasAtivas, 
      areasManutencao, 
      areasOperacao, 
      areasOutros,
      turmasArray: turmasArray.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()).slice(0, 50) // Ultimas 50
    };
  }, [treinamentos, filterPais, filterCurso]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-sky-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <PieChart className="h-8 w-8 text-sky-400" />
            Visão Geral (OnePage)
          </h1>
          <p className="text-slate-400 mt-2 text-sm max-w-2xl">
            Acompanhamento gerencial do progresso das capacitações por turmas e áreas.
          </p>
        </div>
        
        {/* Filtros */}
        <div className="flex items-center gap-2 flex-wrap">
          <select 
            value={filterCurso} 
            onChange={(e) => setFilterCurso(e.target.value)} 
            className="px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm font-bold text-slate-300 outline-none focus:border-sky-500 transition-colors cursor-pointer max-w-xs"
          >
            <option value="">📚 Todos os Cursos</option>
            {cursosUnicos.map((c, i) => (
              <option key={i} value={c}>{c}</option>
            ))}
          </select>

          <select 
            value={filterPais} 
            onChange={(e) => setFilterPais(e.target.value)} 
            className="px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm font-bold text-slate-300 outline-none focus:border-sky-500 transition-colors cursor-pointer"
          >
            <option value="">🌎 Todos os Países</option>
            <option value="BRASIL">Brasil</option>
            <option value="CHILE">Chile</option>
          </select>
        </div>
      </div>

      {/* KPIs Principais */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl flex flex-col justify-between">
          <div className="flex items-start justify-between mb-4">
            <h3 className="text-slate-400 font-medium text-sm">Total Esperado</h3>
            <div className="p-2 bg-slate-800 rounded-lg"><Users className="h-4 w-4 text-slate-300" /></div>
          </div>
          <div>
            <div className="text-3xl font-black text-white">{stats.totalEsperado}</div>
            <p className="text-xs text-slate-500 mt-1">Colaboradores em públicos-alvo</p>
          </div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl flex flex-col justify-between">
          <div className="flex items-start justify-between mb-4">
            <h3 className="text-slate-400 font-medium text-sm">Total Capacitados</h3>
            <div className="p-2 bg-emerald-900/30 rounded-lg"><CheckCircle className="h-4 w-4 text-emerald-400" /></div>
          </div>
          <div>
            <div className="text-3xl font-black text-emerald-400">{stats.totalCapacitados}</div>
            <p className="text-xs text-slate-500 mt-1">Presenças registradas</p>
          </div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl flex flex-col justify-between">
          <div className="flex items-start justify-between mb-4">
            <h3 className="text-slate-400 font-medium text-sm">Avanço Global</h3>
            <div className="p-2 bg-sky-900/30 rounded-lg"><Target className="h-4 w-4 text-sky-400" /></div>
          </div>
          <div>
            <div className="text-3xl font-black text-sky-400">{stats.avancoGlobal}%</div>
            <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
              <div className="bg-sky-400 h-1.5 rounded-full" style={{ width: `${stats.avancoGlobal}%` }}></div>
            </div>
          </div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl flex flex-col justify-between">
          <div className="flex items-start justify-between mb-4">
            <h3 className="text-slate-400 font-medium text-sm">Turmas Ativas</h3>
            <div className="p-2 bg-amber-900/30 rounded-lg"><Activity className="h-4 w-4 text-amber-400" /></div>
          </div>
          <div>
            <div className="text-3xl font-black text-amber-400">{stats.turmasAtivas}</div>
            <p className="text-xs text-slate-500 mt-1">Em andamento ou agendadas</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Avanço por Área */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl flex flex-col">
          <div className="p-6 border-b border-slate-800 sticky top-0 bg-slate-900/90 backdrop-blur z-10 rounded-t-2xl">
            <h3 className="text-lg font-bold text-white">Avanço por Área</h3>
            <p className="text-sm text-slate-400">Progresso separado por Operação e Manutenção</p>
          </div>
          <div className="p-6 space-y-8">
            
            {/* Bloco Operação */}
            {stats.areasOperacao.length > 0 && (
              <div>
                <h4 className="text-sm font-bold text-sky-400 uppercase tracking-wider mb-4 border-b border-slate-800 pb-2 flex items-center gap-2">
                  <Settings className="h-4 w-4" /> Operação
                </h4>
                <div className="space-y-4">
                  {stats.areasOperacao.map((area, idx) => (
                    <div key={idx} className="space-y-1.5">
                      <div className="flex justify-between items-end">
                        <span className="font-bold text-slate-200 text-xs tracking-wide">{area.nome}</span>
                        <span className="text-[10px] text-slate-400 font-medium">{area.feitos} / {area.total} ({area.avanco}%)</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden flex">
                        <div 
                          className={`h-1.5 rounded-full transition-all duration-1000 ${
                            area.avanco >= 80 ? 'bg-emerald-500' : 
                            area.avanco >= 50 ? 'bg-sky-500' : 'bg-rose-500'
                          }`}
                          style={{ width: `${area.avanco}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bloco Manutenção */}
            {stats.areasManutencao.length > 0 && (
              <div>
                <h4 className="text-sm font-bold text-amber-400 uppercase tracking-wider mb-4 border-b border-slate-800 pb-2 flex items-center gap-2">
                  <Wrench className="h-4 w-4" /> Manutenção
                </h4>
                <div className="space-y-4">
                  {stats.areasManutencao.map((area, idx) => (
                    <div key={idx} className="space-y-1.5">
                      <div className="flex justify-between items-end">
                        <span className="font-bold text-slate-200 text-xs tracking-wide">{area.nome}</span>
                        <span className="text-[10px] text-slate-400 font-medium">{area.feitos} / {area.total} ({area.avanco}%)</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden flex">
                        <div 
                          className={`h-1.5 rounded-full transition-all duration-1000 ${
                            area.avanco >= 80 ? 'bg-emerald-500' : 
                            area.avanco >= 50 ? 'bg-sky-500' : 'bg-rose-500'
                          }`}
                          style={{ width: `${area.avanco}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bloco Outros */}
            {stats.areasOutros.length > 0 && (
              <div>
                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-800 pb-2 flex items-center gap-2">
                  Demais Áreas
                </h4>
                <div className="space-y-4">
                  {stats.areasOutros.map((area, idx) => (
                    <div key={idx} className="space-y-1.5">
                      <div className="flex justify-between items-end">
                        <span className="font-bold text-slate-200 text-xs tracking-wide">{area.nome}</span>
                        <span className="text-[10px] text-slate-400 font-medium">{area.feitos} / {area.total} ({area.avanco}%)</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden flex">
                        <div 
                          className={`h-1.5 rounded-full transition-all duration-1000 ${
                            area.avanco >= 80 ? 'bg-emerald-500' : 
                            area.avanco >= 50 ? 'bg-sky-500' : 'bg-rose-500'
                          }`}
                          style={{ width: `${area.avanco}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Desempenho das Turmas */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl flex flex-col">
          <div className="p-6 border-b border-slate-800 sticky top-0 bg-slate-900/90 backdrop-blur z-10 rounded-t-2xl">
            <h3 className="text-lg font-bold text-white">Desempenho das Turmas (Recentes)</h3>
            <p className="text-sm text-slate-400">Aderência por turma individual</p>
          </div>
          <div className="p-6 space-y-4">
            {stats.turmasArray.map((turma, idx) => (
              <div key={idx} className="bg-slate-800/40 border border-slate-700/50 p-4 rounded-xl flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sky-400 text-sm">{turma.nome}</h4>
                  <p className="text-[10px] text-slate-500 mb-1 tracking-wider uppercase">{turma.curso}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {turma.isEncerrado ? (
                      <span className="text-emerald-400 font-bold">Turma Encerrada</span>
                    ) : (
                      <><span className="text-rose-400 font-bold">{turma.faltantes}</span> faltantes</>
                    )}
                  </p>
                </div>
                <div className="text-right flex flex-col items-end">
                  <span className={`text-xl font-black ${
                    turma.avanco >= 80 ? 'text-emerald-400' : 
                    turma.avanco >= 50 ? 'text-sky-400' : 'text-rose-400'
                  }`}>{turma.avanco}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}
