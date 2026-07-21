import { Plus, Link2, CheckCircle2, PlayCircle, Ban } from "lucide-react";

export default function Treinamentos() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Treinamentos</h2>
          <p className="text-slate-400 mt-2">Crie e gerencie as sessões de treinamento.</p>
        </div>
        <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-lg shadow-blue-900/20">
          <Plus className="h-4 w-4" />
          <span>Novo Treinamento</span>
        </button>
      </div>

      <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-900/50 border-b border-slate-700 text-slate-300">
            <tr>
              <th className="px-6 py-4 font-medium">Nome do Treinamento</th>
              <th className="px-6 py-4 font-medium">Data</th>
              <th className="px-6 py-4 font-medium">Instrutor / Planta</th>
              <th className="px-6 py-4 font-medium">Status</th>
              <th className="px-6 py-4 font-medium">Presenças</th>
              <th className="px-6 py-4 font-medium text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50 text-slate-300">
            {/* Linha 1 */}
            <tr className="hover:bg-slate-800/50 transition-colors">
              <td className="px-6 py-4 font-medium text-white">Integração de Segurança</td>
              <td className="px-6 py-4 text-slate-400">Hoje, 14:00</td>
              <td className="px-6 py-4 text-slate-400">Carlos M. <br/><span className="text-xs text-slate-500">Guaíba</span></td>
              <td className="px-6 py-4">
                <span className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full text-xs font-medium bg-emerald-900/30 text-emerald-400 border border-emerald-800">
                  <PlayCircle className="h-3.5 w-3.5" /> Em Andamento
                </span>
              </td>
              <td className="px-6 py-4 font-medium">45</td>
              <td className="px-6 py-4 text-right space-x-2">
                <button className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-900/30 rounded-lg transition-colors" title="Copiar Link Remoto">
                  <Link2 className="h-4 w-4" />
                </button>
                <button className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-900/30 rounded-lg transition-colors" title="Encerrar Sessão">
                  <Ban className="h-4 w-4" />
                </button>
              </td>
            </tr>

            {/* Linha 2 */}
            <tr className="hover:bg-slate-800/50 transition-colors">
              <td className="px-6 py-4 font-medium text-white">Treinamento NR-10</td>
              <td className="px-6 py-4 text-slate-400">Hoje, 09:00</td>
              <td className="px-6 py-4 text-slate-400">Mariana P. <br/><span className="text-xs text-slate-500">Santa Fé</span></td>
              <td className="px-6 py-4">
                <span className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Encerrado
                </span>
              </td>
              <td className="px-6 py-4 font-medium">12</td>
              <td className="px-6 py-4 text-right space-x-2">
                <button className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors">
                  Ver Relatório
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
