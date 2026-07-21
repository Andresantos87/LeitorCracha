"use client";
import { useState } from "react";
import { Database, RefreshCw, AlertCircle, CheckCircle2 } from "lucide-react";

export default function Colaboradores() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchBigQuery = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/colaboradores");
      const json = await res.json();
      
      if (json.success) {
        setData(json.data || []);
      } else {
        setError(json.error || "Erro desconhecido ao consultar a API.");
      }
    } catch (e: any) {
      setError(e.message || "Falha na conexão com o servidor local.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Base de Dados (BigQuery)</h2>
          <p className="text-slate-400 mt-2">Sincronização em tempo real com o banco de dados corporativo da CMPC.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={fetchBigQuery}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-600/50 text-white rounded-lg font-medium transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? "Consultando..." : "Testar Conexão BigQuery"}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-400 mt-0.5" />
          <div>
            <h3 className="text-red-400 font-medium">Falha na Autenticação com o Google Cloud</h3>
            <p className="text-sm text-red-300/80 mt-1">{error}</p>
            <p className="text-xs text-red-300/60 mt-2">
              Dica: O seu computador precisa estar autenticado no Google Cloud. 
              Tente abrir o terminal e rodar: <code>gcloud auth application-default login</code>
            </p>
          </div>
        </div>
      )}

      {data.length > 0 && (
        <div className="bg-emerald-900/20 border border-emerald-500/50 rounded-lg p-4 flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-400" />
          <span className="text-emerald-400 font-medium">Conexão estabelecida com sucesso! {data.length} registros retornados.</span>
        </div>
      )}

      <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
        {data.length === 0 && !loading && !error ? (
          <div className="p-12 text-center flex flex-col items-center justify-center text-slate-400">
            <Database className="h-12 w-12 text-slate-600 mb-4" />
            <p>Clique no botão acima para consultar a tabela de contratistas do BigQuery.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-900/50 border-b border-slate-700 text-slate-300">
                <tr>
                  {data.length > 0 && Object.keys(data[0]).slice(0, 6).map((key) => (
                    <th key={key} className="px-6 py-4 font-medium uppercase text-xs">{key}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50 text-slate-300">
                {data.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-800/50 transition-colors">
                    {Object.values(row).slice(0, 6).map((val: any, j) => (
                      <td key={j} className="px-6 py-4 whitespace-nowrap">
                        {val !== null && val !== undefined ? String(val) : '-'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
