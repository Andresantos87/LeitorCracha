"use client";
import { Activity, Users, FileCheck2, BarChart3, PlayCircle } from "lucide-react";
import { useState, useEffect } from "react";
import Link from "next/link";

export default function Home() {
  const [treinamentos, setTreinamentos] = useState<any[]>([]);
  const [colabStats, setColabStats] = useState<{ total: number, porPlanta: Record<string, number> } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [resTreinamentos, resColabs] = await Promise.all([
          fetch("/api/treinamentos"),
          fetch("/api/colaboradores/stats")
        ]);

        const jsonTreinamentos = await resTreinamentos.json();
        const jsonColabs = await resColabs.json();

        if (jsonTreinamentos.success) setTreinamentos(jsonTreinamentos.data);
        if (jsonColabs.success) setColabStats(jsonColabs.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const totalPresencas = treinamentos.reduce((acc, t) => acc + (t._count?.registros || 0), 0);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-slate-400 mt-2">Visão geral do sistema de treinamentos CMPC.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Card 1 */}
        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700 shadow-sm backdrop-blur-sm">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium text-slate-300">Treinamentos Ativos</h3>
            <Activity className="h-4 w-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-2">
            {loading ? "..." : treinamentos.length}
          </div>
          <p className="text-xs text-slate-400 mt-1">Salas criadas no sistema</p>
        </div>

        {/* Card 2 */}
        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700 shadow-sm backdrop-blur-sm">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium text-slate-300">Total Colaboradores</h3>
            <Users className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-2">
            {loading ? "..." : (colabStats?.total || 0).toLocaleString('pt-BR')}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Base importada
          </p>
        </div>

        {/* Card 3 */}
        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700 shadow-sm backdrop-blur-sm">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium text-slate-300">Presenças Lidas</h3>
            <FileCheck2 className="h-4 w-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-2">
            {loading ? "..." : totalPresencas}
          </div>
          <p className="text-xs text-slate-400 mt-1">Assinaturas capturadas</p>
        </div>

        {/* Card 4 */}
        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700 shadow-sm backdrop-blur-sm">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium text-slate-300">Taxa de Adesão</h3>
            <BarChart3 className="h-4 w-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-2">--%</div>
          <p className="text-xs text-slate-400 mt-1">Média dos treinamentos</p>
        </div>
      </div>

      {/* Seção de Treinamentos Recentes (Mock) */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <div className="col-span-4 bg-slate-800/50 rounded-xl border border-slate-700 p-6">
          <div className="flex flex-col space-y-1.5 mb-4">
            <h3 className="font-semibold leading-none tracking-tight">Treinamentos Recentes</h3>
            <p className="text-sm text-slate-400">Últimas salas abertas no sistema.</p>
          </div>
          <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
            {loading ? (
              <div className="flex items-center justify-center p-8 bg-slate-900/50 rounded-lg border border-slate-800 border-dashed">
                <p className="text-slate-500 text-sm">Carregando...</p>
              </div>
            ) : treinamentos.length === 0 ? (
              <div className="flex items-center justify-center p-8 bg-slate-900/50 rounded-lg border border-slate-800 border-dashed">
                <p className="text-slate-500 text-sm">Nenhum treinamento recente encontrado.</p>
              </div>
            ) : (
              treinamentos.map(t => (
                <div key={t.id} className="flex items-center justify-between p-4 bg-slate-900/50 rounded-lg border border-slate-800 hover:border-slate-700 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-900/30 rounded-lg">
                      <PlayCircle className="h-5 w-5 text-blue-400" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-200">{t.nome}</p>
                      <p className="text-xs text-slate-500 font-mono">ID: {t.id}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-emerald-400">{t._count?.registros || 0}</p>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider">Lidos</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="col-span-3 bg-slate-800/50 rounded-xl border border-slate-700 p-6">
          <div className="flex flex-col space-y-1.5 mb-4">
            <h3 className="font-semibold leading-none tracking-tight">Ações Rápidas</h3>
            <p className="text-sm text-slate-400">Atalhos para funções principais.</p>
          </div>
          <div className="flex flex-col space-y-3">
            <a href="/treinamentos" className="flex items-center justify-center p-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
              Criar Novo Treinamento
            </a>
            <a href="/colaboradores" className="flex items-center justify-center p-4 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors border border-slate-600">
              Importar Planilha Excel
            </a>
            <button className="flex items-center justify-center p-4 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 rounded-lg font-medium transition-colors border border-indigo-500/30">
              Testar Conexão BigQuery
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
