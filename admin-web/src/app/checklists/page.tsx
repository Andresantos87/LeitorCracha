"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/Sidebar";
import { PlusCircle, Edit, Trash2, CheckCircle2, ListChecks, Plus, X, GripVertical } from "lucide-react";
import toast from "react-hot-toast";
import ConfirmModal from "@/components/ConfirmModal";

type ChecklistItem = {
  id: string;
  texto: string;
  categoria: string;
};

type ChecklistTemplate = {
  id: string;
  nome: string;
  items: ChecklistItem[];
  criado_em?: string;
};

export default function ChecklistsPage() {
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ChecklistTemplate | null>(null);
  const [confirmConfig, setConfirmConfig] = useState<{isOpen: boolean; id: string | null}>({ isOpen: false, id: null });
  
  // Form State
  const [nome, setNome] = useState("");
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const CATEGORIAS = ["ANTES", "DURANTE", "DEPOIS", "GERAL"];

  const carregarTemplates = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/checklists");
      const json = await res.json();
      if (json.success) {
        setTemplates(json.data);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    carregarTemplates();
  }, []);

  const abrirModalNovo = () => {
    setEditingTemplate(null);
    setNome("");
    setItems([{ id: Date.now().toString(), texto: "", categoria: "GERAL" }]);
    setIsModalOpen(true);
  };

  const abrirModalEditar = (template: ChecklistTemplate) => {
    setEditingTemplate(template);
    setNome(template.nome);
    setItems(template.items || []);
    setIsModalOpen(true);
  };

  const adicionarItem = () => {
    setItems([...items, { id: Date.now().toString(), texto: "", categoria: "GERAL" }]);
  };

  const removerItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const atualizarItem = (id: string, field: keyof ChecklistItem, value: string) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const salvarTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || items.length === 0) return;
    
    // Filter out empty items
    const validItems = items.filter(i => i.texto.trim() !== "");
    if (validItems.length === 0) return;

    setIsSubmitting(true);
    try {
      const url = editingTemplate ? `/api/checklists/${editingTemplate.id}` : "/api/checklists";
      const method = editingTemplate ? "PUT" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, items: validItems })
      });
      
      if (res.ok) {
        carregarTemplates();
        setIsModalOpen(false);
      }
    } catch (e) {
      console.error(e);
    }
    setIsSubmitting(false);
  };

  const excluirTemplate = async (id: string) => {
    try {
      await fetch(`/api/checklists/${id}`, { method: "DELETE" });
      carregarTemplates();
      toast.success("Modelo excluído com sucesso!");
    } catch (e) {
      console.error(e);
      toast.error("Erro ao excluir modelo.");
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
                <ListChecks className="h-8 w-8 text-blue-500" /> Modelos de Checklist
              </h1>
              <p className="text-slate-400 mt-2">Crie templates para atribuir opcionalmente às turmas de treinamento.</p>
            </div>
            <button 
              onClick={abrirModalNovo}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all shadow-lg flex items-center gap-2"
            >
              <PlusCircle className="h-5 w-5" /> Novo Modelo
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center p-12"><div className="w-8 h-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" /></div>
          ) : templates.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
              <CheckCircle2 className="h-16 w-16 text-slate-700 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Nenhum modelo criado</h3>
              <p className="text-slate-400 mb-6 max-w-md mx-auto">Crie um modelo de checklist para poder atribuí-lo às suas futuras turmas de treinamento.</p>
              <button onClick={abrirModalNovo} className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-all shadow-lg inline-flex items-center gap-2">
                <PlusCircle className="h-5 w-5" /> Criar o Primeiro Modelo
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {templates.map(template => (
                <div key={template.id} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-slate-700 transition-all flex flex-col">
                  <div className="p-6 flex-1">
                    <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                      {template.nome}
                    </h3>
                    <p className="text-sm text-slate-400 mb-4">{template.items.length} itens no checklist</p>
                    
                    <div className="space-y-2">
                      {template.items.slice(0, 3).map((item, idx) => (
                        <div key={idx} className="flex gap-2 text-xs text-slate-500">
                          <CheckCircle2 className="h-3 w-3 mt-0.5 shrink-0" />
                          <span className="truncate">{item.texto}</span>
                        </div>
                      ))}
                      {template.items.length > 3 && (
                        <div className="text-xs text-slate-600 font-bold pl-5">+ {template.items.length - 3} itens</div>
                      )}
                    </div>
                  </div>
                  <div className="bg-slate-800/50 p-4 border-t border-slate-800 flex gap-2">
                    <button onClick={() => abrirModalEditar(template)} className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2">
                      <Edit className="h-4 w-4" /> Editar
                    </button>
                    <button onClick={() => setConfirmConfig({ isOpen: true, id: template.id })} className="px-4 py-2 bg-slate-800 hover:bg-red-900/50 text-slate-400 hover:text-red-400 rounded-lg transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      </main>

      {/* Modal Criar/Editar Template */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 rounded-2xl w-full max-w-3xl overflow-hidden border border-slate-700 shadow-2xl flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-900 sticky top-0 z-10">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <ListChecks className="h-5 w-5 text-blue-400" /> {editingTemplate ? 'Editar Modelo' : 'Novo Modelo de Checklist'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <form id="templateForm" onSubmit={salvarTemplate} className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-slate-400 mb-2">Nome do Modelo</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="Ex: Treinamento NR-10 Padrão"
                    value={nome} 
                    onChange={e => setNome(e.target.value)} 
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all" 
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-4">
                    <label className="block text-sm font-bold text-slate-400">Itens de Verificação</label>
                  </div>
                  
                  <div className="space-y-3">
                    {items.map((item, index) => (
                      <div key={item.id} className="flex gap-3 items-start bg-slate-800/50 p-3 rounded-xl border border-slate-700">
                        <div className="pt-2 cursor-grab text-slate-500 hover:text-white hidden md:block">
                          <GripVertical className="h-5 w-5" />
                        </div>
                        
                        <div className="flex-1 space-y-3">
                          <input 
                            type="text" 
                            required 
                            placeholder={`Item ${index + 1}... (Ex: Garantir que todos assinaram a lista)`}
                            value={item.texto} 
                            onChange={e => atualizarItem(item.id, 'texto', e.target.value)} 
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 outline-none" 
                          />
                          <div className="flex gap-2">
                            {CATEGORIAS.map(cat => (
                              <button
                                key={cat}
                                type="button"
                                onClick={() => atualizarItem(item.id, 'categoria', cat)}
                                className={`text-[10px] px-2 py-1 rounded-md font-bold transition-colors border ${item.categoria === cat ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-800'}`}
                              >
                                {cat}
                              </button>
                            ))}
                          </div>
                        </div>

                        <button 
                          type="button" 
                          onClick={() => removerItem(item.id)}
                          className="pt-2 text-slate-500 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <button 
                    type="button" 
                    onClick={adicionarItem}
                    className="w-full mt-4 py-3 border-2 border-dashed border-slate-700 hover:border-slate-500 text-slate-400 hover:text-white rounded-xl flex items-center justify-center gap-2 transition-colors font-medium text-sm"
                  >
                    <Plus className="h-4 w-4" /> Adicionar Novo Item
                  </button>
                </div>
              </form>
            </div>
            
            <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/50 flex justify-end gap-3 sticky bottom-0">
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-300 hover:text-white font-medium transition-colors">
                Cancelar
              </button>
              <button type="submit" form="templateForm" disabled={isSubmitting} className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold shadow-lg transition-colors flex items-center gap-2">
                {isSubmitting ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "Salvar Modelo"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal 
        isOpen={confirmConfig.isOpen}
        title="Excluir Modelo de Checklist"
        message="Tem certeza que deseja excluir este modelo? Treinamentos que já usam este modelo não serão afetados."
        onConfirm={() => confirmConfig.id && excluirTemplate(confirmConfig.id)}
        onCancel={() => setConfirmConfig({ isOpen: false, id: null })}
        confirmText="Sim, Excluir"
      />

    </div>
  );
}
