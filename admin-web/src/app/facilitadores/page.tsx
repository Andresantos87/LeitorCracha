"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/Sidebar";
import { PlusCircle, Edit, Trash2, Users, Plus, X, UserCircle, CheckCircle2, XCircle } from "lucide-react";
import toast from "react-hot-toast";
import ConfirmModal from "@/components/ConfirmModal";

type Facilitador = {
  id: string;
  nome: string;
  matricula: string;
  ativo: boolean;
  criadoEm?: string;
};

export default function FacilitadoresPage() {
  const [facilitadores, setFacilitadores] = useState<Facilitador[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFacilitador, setEditingFacilitador] = useState<Facilitador | null>(null);
  const [confirmConfig, setConfirmConfig] = useState<{isOpen: boolean; id: string | null}>({ isOpen: false, id: null });
  
  // Form State
  const [nome, setNome] = useState("");
  const [matricula, setMatricula] = useState("");
  const [ativo, setAtivo] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const carregarFacilitadores = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/facilitadores");
      const json = await res.json();
      if (json.success) {
        setFacilitadores(json.data);
      }
    } catch (e) {
      console.error(e);
      toast.error("Erro ao carregar facilitadores");
    }
    setLoading(false);
  };

  useEffect(() => {
    carregarFacilitadores();
  }, []);

  const abrirModalNovo = () => {
    setEditingFacilitador(null);
    setNome("");
    setMatricula("");
    setAtivo(true);
    setIsModalOpen(true);
  };

  const abrirModalEditar = (facilitador: Facilitador) => {
    setEditingFacilitador(facilitador);
    setNome(facilitador.nome);
    setMatricula(facilitador.matricula || "");
    setAtivo(facilitador.ativo !== false);
    setIsModalOpen(true);
  };

  const salvarFacilitador = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) {
        toast.error("Nome é obrigatório");
        return;
    }

    setIsSubmitting(true);
    try {
      const url = editingFacilitador ? `/api/facilitadores/${editingFacilitador.id}` : "/api/facilitadores";
      const method = editingFacilitador ? "PUT" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, matricula, ativo })
      });
      
      if (res.ok) {
        toast.success(editingFacilitador ? "Facilitador atualizado!" : "Facilitador criado!");
        carregarFacilitadores();
        setIsModalOpen(false);
      } else {
        toast.error("Erro ao salvar facilitador");
      }
    } catch (e) {
      console.error(e);
      toast.error("Erro inesperado ao salvar");
    }
    setIsSubmitting(false);
  };

  const excluirFacilitador = async (id: string) => {
    try {
      await fetch(`/api/facilitadores/${id}`, { method: "DELETE" });
      carregarFacilitadores();
      toast.success("Facilitador excluído com sucesso!");
    } catch (e) {
      console.error(e);
      toast.error("Erro ao excluir facilitador.");
    } finally {
      setConfirmConfig({ isOpen: false, id: null });
    }
  };

  return (
    <div className="flex h-screen bg-slate-950">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-8">
        <div className="max-w-6xl mx-auto">
          
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
                <Users className="h-8 w-8 text-blue-500" /> Facilitadores (Instrutores)
              </h1>
              <p className="text-slate-400 mt-2">Cadastre as pessoas que ministram treinamentos para listá-las nos registros de presença.</p>
            </div>
            <button 
              onClick={abrirModalNovo}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all shadow-lg flex items-center gap-2"
            >
              <PlusCircle className="h-5 w-5" /> Novo Facilitador
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center p-12"><div className="w-8 h-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" /></div>
          ) : facilitadores.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
              <UserCircle className="h-16 w-16 text-slate-700 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Nenhum facilitador cadastrado</h3>
              <p className="text-slate-400 mb-6 max-w-md mx-auto">Crie um cadastro de Facilitador para poder atribuí-lo aos treinamentos ministrados.</p>
              <button onClick={abrirModalNovo} className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-all shadow-lg inline-flex items-center gap-2">
                <PlusCircle className="h-5 w-5" /> Cadastrar Primeiro Facilitador
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {facilitadores.map(facilitador => (
                <div key={facilitador.id} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-slate-700 transition-all flex flex-col">
                  <div className="p-6 flex-1">
                    <div className="flex justify-between items-start mb-2">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        {facilitador.nome}
                        </h3>
                        {facilitador.ativo ? (
                            <span className="flex items-center gap-1 text-xs font-bold text-green-400 bg-green-400/10 px-2 py-1 rounded">
                                <CheckCircle2 className="w-3 h-3" /> Ativo
                            </span>
                        ) : (
                            <span className="flex items-center gap-1 text-xs font-bold text-red-400 bg-red-400/10 px-2 py-1 rounded">
                                <XCircle className="w-3 h-3" /> Inativo
                            </span>
                        )}
                    </div>
                    {facilitador.matricula && (
                        <p className="text-sm text-slate-400 mb-4">Matrícula/ID: {facilitador.matricula}</p>
                    )}
                  </div>
                  <div className="bg-slate-800/50 p-4 border-t border-slate-800 flex gap-2">
                    <button onClick={() => abrirModalEditar(facilitador)} className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2">
                      <Edit className="h-4 w-4" /> Editar
                    </button>
                    <button onClick={() => setConfirmConfig({ isOpen: true, id: facilitador.id })} className="px-4 py-2 bg-slate-800 hover:bg-red-900/50 text-slate-400 hover:text-red-400 rounded-lg transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      </main>

      {/* Modal Criar/Editar */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 rounded-2xl w-full max-w-md overflow-hidden border border-slate-700 shadow-2xl flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-900 sticky top-0 z-10">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <UserCircle className="h-5 w-5 text-blue-400" /> {editingFacilitador ? 'Editar Facilitador' : 'Novo Facilitador'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <form id="form" onSubmit={salvarFacilitador} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-400 mb-2">Nome Completo</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="Ex: João da Silva"
                    value={nome} 
                    onChange={e => setNome(e.target.value)} 
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all" 
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-400 mb-2">Matrícula / ID (Opcional)</label>
                  <input 
                    type="text" 
                    placeholder="Ex: 123456"
                    value={matricula} 
                    onChange={e => setMatricula(e.target.value)} 
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all" 
                  />
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <input 
                    type="checkbox" 
                    id="ativo"
                    checked={ativo} 
                    onChange={e => setAtivo(e.target.checked)} 
                    className="w-5 h-5 rounded border-slate-700 text-blue-600 focus:ring-blue-500 bg-slate-950" 
                  />
                  <label htmlFor="ativo" className="text-sm font-bold text-white cursor-pointer">Facilitador Ativo</label>
                </div>
              </form>
            </div>
            
            <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/50 flex justify-end gap-3 sticky bottom-0">
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-300 hover:text-white font-medium transition-colors">
                Cancelar
              </button>
              <button type="submit" form="form" disabled={isSubmitting} className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold shadow-lg transition-colors flex items-center gap-2">
                {isSubmitting ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal 
        isOpen={confirmConfig.isOpen}
        title="Excluir Facilitador"
        message="Tem certeza que deseja excluir este cadastro? Isso não afetará os treinamentos antigos que já possuem este nome gravado, mas ele deixará de aparecer na lista para novos treinamentos."
        onConfirm={() => confirmConfig.id && excluirFacilitador(confirmConfig.id)}
        onCancel={() => setConfirmConfig({ isOpen: false, id: null })}
        confirmText="Sim, Excluir"
      />

    </div>
  );
}
