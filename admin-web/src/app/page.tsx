"use client";
import { Activity, Users, FileCheck2, BarChart3, PlayCircle } from "lucide-react";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useTranslation } from "@/lib/useTranslation";

export default function Home() {
  const { t } = useTranslation();
  const [treinamentos, setTreinamentos] = useState<any[]>([]);
  const [colabStats, setColabStats] = useState<{ total: number, porPlanta: Record<string, number> } | null>(null);
  const [rankingFacilitadores, setRankingFacilitadores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [resTreinamentos, resColabs, resRanking] = await Promise.all([
          fetch("/api/treinamentos"),
          fetch("/api/colaboradores/stats"),
          fetch("/api/facilitadores/stats")
        ]);

        const jsonTreinamentos = await resTreinamentos.json();
        const jsonColabs = await resColabs.json();
        const jsonRanking = await resRanking.json();

        if (jsonTreinamentos.success) setTreinamentos(jsonTreinamentos.data);
        if (jsonColabs.success) setColabStats(jsonColabs.data);
        if (jsonRanking.success) setRankingFacilitadores(jsonRanking.ranking);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const totalPresencas = treinamentos.reduce((acc, t) => acc + (t._count?.registros || 0), 0);
  const turmasConcluidas = treinamentos.filter(t => t.status_agenda === 'CONCLUIDO').length;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">{t.dashboard}</h2>
        <p className="text-slate-400 mt-2">{t.dashSubtitle}</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Card 1 */}
        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700 shadow-sm backdrop-blur-sm">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium text-slate-300">Total de Turmas</h3>
            <Activity className="h-4 w-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-2">
            {loading ? "..." : treinamentos.length}
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

      {/* Seção de Treinamentos Recentes (Mock) */}
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
            ) : treinamentos.length === 0 ? (
              <div className="flex items-center justify-center p-8 bg-slate-900/50 rounded-lg border border-slate-800 border-dashed">
                <p className="text-slate-500 text-sm">{t.noRecent}</p>
              </div>
            ) : (
              [...treinamentos].sort((a, b) => new Date(b.data_agendada || 0).getTime() - new Date(a.data_agendada || 0).getTime()).map(t => (
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
