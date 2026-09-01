"use client";
import { Activity, Users, FileCheck2, BarChart3, PlayCircle } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import Link from "next/link";
import { useTranslation } from "@/lib/useTranslation";

export default function Home() {
  const { t } = useTranslation();
  const [treinamentos, setTreinamentos] = useState<any[]>([]);
  const [colabStats, setColabStats] = useState<{ total: number, porPlanta: Record<string, number> } | null>(null);
  const [rankingFacilitadores, setRankingFacilitadores] = useState<any[]>([]);
  const [todasPresencas, setTodasPresencas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [filtroCurso, setFiltroCurso] = useState("");
  const [filtroTurma, setFiltroTurma] = useState("");
  const [visaoGrafico, setVisaoGrafico] = useState<'semana' | 'mes'>('semana');
  const [periodoOffset, setPeriodoOffset] = useState(0);
  const [dataSelecionada, setDataSelecionada] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [resTreinamentos, resColabs, resRanking, resPresencas] = await Promise.all([
          fetch("/api/treinamentos"),
          fetch("/api/colaboradores/stats"),
          fetch("/api/facilitadores/stats"),
          fetch("/api/dashboard/presencas")
        ]);

        const jsonTreinamentos = await resTreinamentos.json();
        const jsonColabs = await resColabs.json();
        const jsonRanking = await resRanking.json();
        const jsonPresencas = await resPresencas.json();

        if (jsonTreinamentos.success) setTreinamentos(jsonTreinamentos.data);
        if (jsonColabs.success) setColabStats(jsonColabs.data);
        if (jsonRanking.success) setRankingFacilitadores(jsonRanking.ranking);
        if (jsonPresencas.success) setTodasPresencas(jsonPresencas.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const treinamentosFiltrados = useMemo(() => {
    let f = treinamentos;
    if (filtroCurso) f = f.filter(t => t.nome === filtroCurso);
    if (filtroTurma) f = f.filter(t => t.turma === filtroTurma || t.subpasta === filtroTurma);
    return f;
  }, [treinamentos, filtroCurso, filtroTurma]);

  const totalPresencas = treinamentosFiltrados.reduce((acc, t) => acc + (t._count?.registros || t.presencas_count || 0), 0);
  const turmasConcluidas = treinamentosFiltrados.filter(t => t.status_agenda === 'CONCLUIDO').length;

  const presencasDoDiaSelecionado = useMemo(() => {
    if (!dataSelecionada) return [];
    const validTreinamentoIds = new Set(treinamentosFiltrados.map(t => t.id));
    return todasPresencas.filter(p => {
      if (!validTreinamentoIds.has(p.treinamentoId)) return false;
      let d = p.dataRaw;
      if (!d) return false;
      d = String(d).split('T')[0];
      return d === dataSelecionada;
    });
  }, [todasPresencas, dataSelecionada, treinamentosFiltrados]);

  const presencasPorPeriodo = useMemo(() => {
    const map: Record<string, number> = {};
    
    // Filtra presenças garantindo que o treinamentoId da presença pertence aos treinamentosFiltrados (para respeitar o filtro de Curso/Turma no topo)
    const validTreinamentoIds = new Set(treinamentosFiltrados.map(t => t.id));
    
    todasPresencas.forEach(p => {
      if (!validTreinamentoIds.has(p.treinamentoId)) return;
      
      let d = p.dataRaw;
      if (!d) return;
      d = String(d).split('T')[0]; 
      
      map[d] = (map[d] || 0) + 1;
    });

    const today = new Date();
    today.setHours(0,0,0,0);
    
    const result = [];

    if (visaoGrafico === 'semana') {
      for(let i = 6; i >= 0; i--) {
         const d = new Date(today);
         d.setDate(d.getDate() - (periodoOffset * 7) - i);
         const iso = d.toISOString().split('T')[0];
         
         const parts = iso.split('-');
         result.push({
           dataRaw: iso,
           label: `${parts[2]}/${parts[1]}`,
           pessoas: map[iso] || 0
         });
      }
    } else {
      // Visão Mensal (últimos 30 dias do offset)
      for(let i = 29; i >= 0; i--) {
         const d = new Date(today);
         d.setDate(d.getDate() - (periodoOffset * 30) - i);
         const iso = d.toISOString().split('T')[0];
         
         const parts = iso.split('-');
         result.push({
           dataRaw: iso,
           label: `${parts[2]}/${parts[1]}`,
           pessoas: map[iso] || 0
         });
      }
    }

    return result;
  }, [treinamentosFiltrados, todasPresencas, visaoGrafico, periodoOffset]);

  const cursosDisponiveis = Array.from(new Set(treinamentos.map(t => t.nome))).filter(Boolean);
  const turmasDisponiveis = Array.from(new Set(treinamentos.filter(t => !filtroCurso || t.nome === filtroCurso).map(t => t.turma || t.subpasta))).filter(Boolean);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{t.dashboard}</h2>
          <p className="text-slate-400 mt-2">{t.dashSubtitle}</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={filtroCurso}
            onChange={(e) => { setFiltroCurso(e.target.value); setFiltroTurma(""); }}
            className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500 text-sm text-slate-200"
          >
            <option value="">Todos os Cursos</option>
            {cursosDisponiveis.map(c => <option key={String(c)} value={String(c)}>{String(c)}</option>)}
          </select>
          <select
            value={filtroTurma}
            onChange={(e) => setFiltroTurma(e.target.value)}
            disabled={!filtroCurso}
            className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500 text-sm text-slate-200 disabled:opacity-50"
          >
            <option value="">Todas as Turmas</option>
            {turmasDisponiveis.map(t => <option key={String(t)} value={String(t)}>{String(t)}</option>)}
          </select>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Card 1 */}
        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700 shadow-sm backdrop-blur-sm">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium text-slate-300">Total de Turmas</h3>
            <Activity className="h-4 w-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-2">
            {loading ? "..." : treinamentosFiltrados.length}
          </div>
          <p className="text-xs text-slate-400 mt-1">Todas as turmas (Gantt + Avulsas)</p>
        </div>

        {/* Card 2 */}
        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700 shadow-sm backdrop-blur-sm">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium text-slate-300">Turmas Concluídas</h3>
            <BarChart3 className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-2">
            {loading ? "..." : turmasConcluidas}
          </div>
          <p className="text-xs text-slate-400 mt-1">Treinamentos já realizados</p>
        </div>

        {/* Card 3 */}
        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700 shadow-sm backdrop-blur-sm">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium text-slate-300">{t.presenceRead}</h3>
            <FileCheck2 className="h-4 w-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-2">
            {loading ? "..." : totalPresencas}
          </div>
          <p className="text-xs text-slate-400 mt-1">{t.signaturesCaptured}</p>
        </div>
      </div>

      {/* Gráfico de Capacitados por Dia */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
          <div className="flex flex-col space-y-1.5">
            <h3 className="font-semibold leading-none tracking-tight text-lg">Pessoas Capacitadas por Dia</h3>
            <p className="text-sm text-slate-400">
              Evolução das presenças {visaoGrafico === 'semana' ? 'na semana' : 'no mês'} {periodoOffset === 0 ? "(Atual)" : periodoOffset === 1 ? "(Anterior)" : `(-${periodoOffset})`}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="flex items-center p-1 bg-slate-900 rounded-lg border border-slate-700">
              <button 
                onClick={() => { setVisaoGrafico('semana'); setPeriodoOffset(0); }}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${visaoGrafico === 'semana' ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
              >
                7 Dias
              </button>
              <button 
                onClick={() => { setVisaoGrafico('mes'); setPeriodoOffset(0); }}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${visaoGrafico === 'mes' ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
              >
                30 Dias
              </button>
            </div>
            
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setPeriodoOffset(prev => prev + 1)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-bold transition-colors"
              >
                &larr; Anterior
              </button>
              <button 
                onClick={() => setPeriodoOffset(0)}
                disabled={periodoOffset === 0}
                className="px-3 py-1.5 bg-sky-500/20 hover:bg-sky-500 disabled:opacity-30 disabled:hover:bg-sky-500/20 text-sky-300 disabled:text-sky-300 hover:text-white border border-sky-500/30 rounded-lg text-xs font-bold transition-colors"
              >
                Atual
              </button>
              <button 
                onClick={() => setPeriodoOffset(prev => Math.max(0, prev - 1))}
                disabled={periodoOffset === 0}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 border border-slate-700 rounded-lg text-xs font-bold transition-colors"
              >
                Próximo &rarr;
              </button>
            </div>
          </div>
        </div>
        
        <div className="h-[250px] w-full">
          {loading ? (
            <div className="flex items-center justify-center h-full bg-slate-900/50 rounded-lg border border-slate-800 border-dashed">
              <p className="text-slate-500 text-sm">{t.loading}</p>
            </div>
          ) : presencasPorPeriodo.length === 0 ? (
            <div className="flex items-center justify-center h-full bg-slate-900/50 rounded-lg border border-slate-800 border-dashed">
              <p className="text-slate-500 text-sm">Sem dados suficientes para o gráfico</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart 
                data={presencasPorPeriodo} 
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                onClick={(e: any) => {
                  if (e && e.activePayload && e.activePayload.length > 0) {
                    const dateClicked = e.activePayload[0].payload.dataRaw;
                    console.log("Chart clicked on date:", dateClicked);
                    setDataSelecionada(dateClicked);
                  }
                }}
                style={{ cursor: 'pointer' }}
              >
                <defs>
                  <linearGradient id="colorPessoas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="label" stroke="#94a3b8" fontSize={12} tickMargin={10} axisLine={false} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }}
                  itemStyle={{ color: '#60a5fa', fontWeight: 'bold' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="pessoas" 
                  name="Capacitados" 
                  stroke="#3b82f6" 
                  strokeWidth={3} 
                  fillOpacity={1} 
                  fill="url(#colorPessoas)" 
                  activeDot={{ 
                    onClick: (event: any, payload: any) => { 
                      console.log("Dot clicked:", payload);
                      if (payload && payload.payload) {
                        setDataSelecionada(payload.payload.dataRaw); 
                      }
                    },
                    cursor: 'pointer',
                    r: 6,
                    strokeWidth: 0
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Tabela de Presenças do Dia Selecionado */}
      {dataSelecionada && (
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6 animate-in slide-in-from-top-4 duration-300">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4">
            <div>
              <h3 className="font-semibold leading-none tracking-tight text-lg text-sky-400">
                Pessoas Capacitadas em {dataSelecionada.split('-').reverse().join('/')}
              </h3>
              <p className="text-sm text-slate-400 mt-1">
                {presencasDoDiaSelecionado.length} registros encontrados para esta data
              </p>
            </div>
            <button 
              onClick={() => setDataSelecionada(null)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-bold transition-colors"
            >
              ✕ Fechar Lista
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-400 uppercase bg-slate-900/50 border-b border-slate-700">
                <tr>
                  <th className="px-4 py-3">Matrícula/RUT</th>
                  <th className="px-4 py-3">Colaborador</th>
                  <th className="px-4 py-3">Capacitação</th>
                  <th className="px-4 py-3">Empresa</th>
                  <th className="px-4 py-3">Data / Hora</th>
                </tr>
              </thead>
              <tbody>
                {presencasDoDiaSelecionado.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                      Nenhum colaborador encontrado para este dia com os filtros atuais.
                    </td>
                  </tr>
                ) : (
                  presencasDoDiaSelecionado.map((p, i) => {
                    const t = treinamentos.find(tr => tr.id === p.treinamentoId);
                    const cursoNome = t ? t.nome : 'Desconhecido';
                    const dataFormatada = p.dataRaw 
                      ? new Date(p.dataRaw).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) 
                      : '';
                    return (
                      <tr key={i} className="border-b border-slate-700/50 hover:bg-slate-800/50 transition-colors">
                        <td className="px-4 py-3 font-mono text-emerald-400">{p.identificador_lido}</td>
                        <td className="px-4 py-3 font-medium text-slate-200">{p.nome}</td>
                        <td className="px-4 py-3 font-medium text-sky-300 text-xs">{cursoNome}</td>
                        <td className="px-4 py-3 text-slate-400">{p.empresa}</td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-400">{dataFormatada}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Seção de Treinamentos Recentes */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <div className="col-span-4 bg-slate-800/50 rounded-xl border border-slate-700 p-6">
          <div className="flex flex-col space-y-1.5 mb-4">
            <h3 className="font-semibold leading-none tracking-tight">Status da Agenda</h3>
            <p className="text-sm text-slate-400">Turmas mais recentes da linha do tempo</p>
          </div>
          <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
            {loading ? (
              <div className="flex items-center justify-center p-8 bg-slate-900/50 rounded-lg border border-slate-800 border-dashed">
                <p className="text-slate-500 text-sm">{t.loading}</p>
              </div>
            ) : treinamentosFiltrados.length === 0 ? (
              <div className="flex items-center justify-center p-8 bg-slate-900/50 rounded-lg border border-slate-800 border-dashed">
                <p className="text-slate-500 text-sm">{t.noRecent}</p>
              </div>
            ) : (
              [...treinamentosFiltrados].sort((a, b) => new Date(b.data_agendada || 0).getTime() - new Date(a.data_agendada || 0).getTime()).map(t => (
                <div key={t.id} className="flex items-center justify-between p-4 bg-slate-900/50 rounded-lg border border-slate-800 hover:border-slate-700 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${t.status_agenda === 'CONCLUIDO' ? 'bg-emerald-900/30' : 'bg-blue-900/30'}`}>
                      <PlayCircle className={`h-5 w-5 ${t.status_agenda === 'CONCLUIDO' ? 'text-emerald-400' : 'text-blue-400'}`} />
                    </div>
                    <div>
                      <p className="font-medium text-slate-200">{t.nome}</p>
                      <p className="text-xs text-slate-500 font-mono">
                        {t.data_agendada ? t.data_agendada.split('-').reverse().join('/') : 'Sem data'} • {t.facilitador_nome || 'Sem Facilitador'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full bg-opacity-20 ${
                      t.status_agenda === 'CONCLUIDO' ? 'bg-emerald-500 text-emerald-400' :
                      t.status_agenda === 'EM ANDAMENTO' ? 'bg-blue-500 text-blue-400' :
                      t.status_agenda === 'ATRASADO' ? 'bg-rose-500 text-rose-400' :
                      'bg-indigo-500 text-indigo-400'
                    }`}>
                      {t.status_agenda || 'AGENDADO'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="col-span-3 bg-slate-800/50 rounded-xl border border-slate-700 p-6">
          <div className="flex flex-col space-y-1.5 mb-4">
            <h3 className="font-semibold leading-none tracking-tight">Ranking de Facilitadores</h3>
            <p className="text-sm text-slate-400">Classificação por turmas concluídas</p>
          </div>
          <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <p className="text-slate-500 text-sm">{t.loading}</p>
              </div>
            ) : !rankingFacilitadores || rankingFacilitadores.length === 0 ? (
              <div className="flex items-center justify-center p-8 bg-slate-900/50 rounded-lg border border-slate-800 border-dashed">
                <p className="text-slate-500 text-sm">Nenhum dado ainda.</p>
              </div>
            ) : (
              rankingFacilitadores.map((fac, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 bg-slate-900/40 rounded-lg border border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-800 text-sm font-bold text-slate-400">
                      {idx + 1}
                    </div>
                    <div>
                      <p className="font-bold text-slate-200 text-sm">{fac.nome}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        <span className="text-emerald-400 font-bold">{fac.turmas_concluidas || 0}</span> Turmas concluídas
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-amber-400">{fac.total_capacitados || 0}</p>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider">Assinaturas</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
