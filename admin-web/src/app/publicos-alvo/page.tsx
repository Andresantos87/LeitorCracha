"use client";

import { useState, useEffect } from "react";
import { Users, Target, Plus, Search, Loader2, Trash2, Edit } from "lucide-react";
import toast from "react-hot-toast";

export default function PublicosAlvoPage() {
  const [publicos, setPublicos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [matriculasInput, setMatriculasInput] = useState("");

  useEffect(() => {
    carregarPublicos();
  }, []);

  const carregarPublicos = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/publicos-alvo");
      const data = await res.json();
      if (data.success) {
        setPublicos(data.data);
      }
    } catch (error) {
      toast.error("Erro ao carregar públicos-alvo");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSalvar = async () => {
    if (!nome) return toast.error("O nome é obrigatório");
    
    // Process the text area input into an array of strings (removing empties)
    const matriculasArray = matriculasInput
      .split(/[\n,;]+/)
      .map(m => m.trim())
      .filter(m => m.length > 0);

    setIsSaving(true);
    try {
      const res = await fetch("/api/publicos-alvo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, descricao, matriculas: matriculasArray })
      });
      
      const data = await res.json();
      if (data.success) {
        toast.success("Público-Alvo criado com sucesso!");
        setIsModalOpen(false);
        setNome("");
        setDescricao("");
        setMatriculasInput("");
        carregarPublicos();
      } else {
        toast.error(data.error || "Erro ao salvar");
      }
    } catch (error) {
      toast.error("Erro de conexão");
    } finally {
      setIsSaving(false);
    }
  };

  const excluirPublico = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este Público-Alvo? Isso não apagará as presenças, apenas a lista de convocação.")) return;
    
    try {
      const res = await fetch(`/api/publicos-alvo/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        toast.success("Público-Alvo excluído!");
        carregarPublicos();
      } else {
        toast.error(data.error || "Você não tem permissão.");
      }
    } catch (e) {
      toast.error("Erro ao excluir.");
    }
  };

  const filtrados = publicos.filter(p => p.nome.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-500">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Target className="h-8 w-8 text-blue-400" />
            Gestão de Públicos-Alvo
          </h1>
          <p className="text-slate-400 mt-1">Crie listas de convocação para acompanhar o progresso das capacitações.</p>
        </div>
        
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-medium shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2 group"
        >
          <Plus className="h-5 w-5 group-hover:rotate-90 transition-transform" />
          Novo Público-Alvo
        </button>
      </div>

      {/* Busca */}
      <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 p-4 rounded-2xl">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input 
            type="text"
            placeholder="Buscar por nome da lista..."
            className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-3 pl-12 pr-4 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Loader2 className="h-10 w-10 animate-spin text-blue-500 mb-4" />
          <p>Carregando públicos-alvo...</p>
        </div>
      ) : filtrados.length === 0 ? (
        <div className="text-center py-20 bg-slate-800/20 rounded-3xl border border-slate-700/30 border-dashed">
          <Target className="h-16 w-16 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 text-lg">Nenhum público-alvo encontrado.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtrados.map((pub) => (
            <div key={pub.id} className="bg-slate-800/50 backdrop-blur-md border border-slate-700/50 rounded-2xl p-6 hover:bg-slate-800 hover:border-slate-600 transition-all group">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl">
                  <Users className="h-6 w-6" />
                </div>
                <button onClick={() => excluirPublico(pub.id)} className="p-2 text-slate-500 hover:text-red-400 hover:bg-slate-700 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <h3 className="text-xl font-bold text-white mb-1 truncate">{pub.nome}</h3>
              <p className="text-sm text-slate-400 mb-4 line-clamp-2 min-h-[40px]">{pub.descricao || "Sem descrição"}</p>
              
              <div className="pt-4 border-t border-slate-700/50 flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  Criado em: {new Date(pub.criado_em).toLocaleDateString()}
                </span>
                <span className="bg-slate-700 text-slate-200 text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1.5">
                  <Users className="h-3 w-3" />
                  {pub.matriculas.length} pessoas
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Cadastro */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6 border-b border-slate-700 flex justify-between items-center sticky top-0 bg-slate-800 z-10">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Target className="h-6 w-6 text-blue-400" />
                Novo Público-Alvo
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white text-2xl leading-none">&times;</button>
            </div>
            
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Nome do Público / Turma</label>
                <input 
                  type="text"
                  value={nome}
                  onChange={e => setNome(e.target.value)}
                  placeholder="Ex: Operadores de Caldeira - Turno B"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Descrição (Opcional)</label>
                <input 
                  type="text"
                  value={descricao}
                  onChange={e => setDescricao(e.target.value)}
                  placeholder="Ex: Colaboradores da nova caldeira da planta Laja"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Matrículas Convocadas
                  <span className="text-slate-500 text-xs ml-2 font-normal">(Cole do Excel, separadas por linha, vírgula ou ponto e vírgula)</span>
                </label>
                <textarea 
                  value={matriculasInput}
                  onChange={e => setMatriculasInput(e.target.value)}
                  placeholder="19802051&#10;18552309&#10;17442110"
                  rows={8}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm resize-none"
                />
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs text-slate-400">
                    O sistema limpará os espaços vazios automaticamente.
                  </span>
                  <span className="text-sm font-semibold text-blue-400">
                    {matriculasInput.split(/[\n,;]+/).filter(m => m.trim().length > 0).length} detectados
                  </span>
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t border-slate-700 flex justify-end gap-3 sticky bottom-0 bg-slate-800 z-10">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-6 py-2.5 rounded-xl font-medium text-slate-300 hover:bg-slate-700 transition-colors"
                disabled={isSaving}
              >
                Cancelar
              </button>
              <button 
                onClick={handleSalvar}
                disabled={isSaving}
                className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-2.5 rounded-xl font-medium shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                {isSaving ? "Salvando..." : "Criar Público-Alvo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
