"use client";

import { useState, useEffect, useRef } from "react";
import { Users, Target, Plus, Search, Loader2, Trash2, Edit, X, Check, ChevronDown, Building2, MapPin, Briefcase, UserCircle } from "lucide-react";

const CustomSelect = ({ value, onChange, options, placeholder, icon: Icon, disabled = false }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={`relative w-full ${disabled ? "opacity-50 cursor-not-allowed" : ""}`} ref={selectRef}>
      <div 
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm outline-none hover:border-blue-500 cursor-pointer flex items-center justify-between transition-colors"
      >
        <div className="flex items-center gap-2 truncate">
          {Icon && <Icon className="h-4 w-4 text-slate-400 shrink-0" />}
          <span className="truncate">{value || placeholder}</span>
        </div>
        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </div>
      
      {isOpen && !disabled && (
        <div className="absolute top-full left-0 mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          <ul className="max-h-60 overflow-y-auto py-1 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent">
            <li 
              onClick={() => { onChange(""); setIsOpen(false); }}
              className={`px-3 py-2.5 text-sm cursor-pointer hover:bg-slate-700 text-slate-300 ${!value ? "bg-slate-700/50 text-white font-medium" : ""}`}
            >
              {placeholder}
            </li>
            {options.map((opt: string) => (
              <li 
                key={opt}
                onClick={() => { onChange(opt); setIsOpen(false); }}
                className={`px-3 py-2.5 text-sm cursor-pointer hover:bg-slate-700 transition-colors truncate ${value === opt ? "bg-blue-600/20 text-blue-400 font-medium" : "text-slate-300"}`}
              >
                {opt}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default function PublicosAlvoPage() {
  const [publicos, setPublicos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [editId, setEditId] = useState<string | null>(null);

  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  
  // New States for Search & Select UI
  const [selectedColaboradores, setSelectedColaboradores] = useState<any[]>([]);
  const [pesquisa, setPesquisa] = useState("");
  const [filtroEmpresa, setFiltroEmpresa] = useState("");
  const [filtroPlanta, setFiltroPlanta] = useState("");
  const [filtroCargo, setFiltroCargo] = useState("");
  const [filtroGestor, setFiltroGestor] = useState("");
  const [resultadosColab, setResultadosColab] = useState<any[]>([]);
  const [buscandoColab, setBuscandoColab] = useState(false);
  const [empresasOptions, setEmpresasOptions] = useState<string[]>([]);
  const [plantasOptions, setPlantasOptions] = useState<string[]>([]);
  const [cargosOptions, setCargosOptions] = useState<string[]>([]);
  const [gestoresOptions, setGestoresOptions] = useState<string[]>([]);

  useEffect(() => {
    carregarPublicos();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (filtroEmpresa) params.append('empresa', filtroEmpresa);
    if (filtroPlanta) params.append('planta', filtroPlanta);

    fetch(`/api/colaboradores/filtros?${params.toString()}`)
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setEmpresasOptions(d.empresas);
          
          // Reordena plantas para priorizar Guaiba, Santa Fe, Laja, Pacifico
          const topPlantas = ["GUAÍBA", "GUAIBA", "SANTA FE", "LAJA", "PACIFICO"];
          const sortedPlantas = [...d.plantas].sort((a, b) => {
            const aTop = topPlantas.includes(a.toUpperCase()) ? 1 : 0;
            const bTop = topPlantas.includes(b.toUpperCase()) ? 1 : 0;
            if (aTop !== bTop) return bTop - aTop;
            return a.localeCompare(b);
          });
          setPlantasOptions(sortedPlantas);
          setCargosOptions(d.cargos);
          setGestoresOptions(d.gestores);
        }
      })
      .catch(() => {});
  }, [filtroEmpresa, filtroPlanta]);

  useEffect(() => {
    if (isModalOpen) {
      const timeoutId = setTimeout(() => {
        buscarColaboradores();
      }, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [pesquisa, filtroEmpresa, filtroPlanta, filtroCargo, filtroGestor, isModalOpen]);

  const carregarPublicos = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/publicos-alvo");
      const data = await res.json();
      if (data.success) {
        setPublicos(data.data);
      }
    } catch (error) {
      alert("Erro ao carregar públicos-alvo");
    } finally {
      setIsLoading(false);
    }
  };

  const buscarColaboradores = async () => {
    setBuscandoColab(true);
    try {
      const params = new URLSearchParams();
      if (pesquisa) params.append('busca', pesquisa);
      if (filtroEmpresa) params.append('empresa', filtroEmpresa);
      if (filtroPlanta) params.append('planta', filtroPlanta);
      if (filtroCargo) params.append('cargo', filtroCargo);
      if (filtroGestor) params.append('gestor', filtroGestor);
      
      const res = await fetch(`/api/colaboradores?${params.toString()}`);
      const json = await res.json();
      if (json.success) setResultadosColab(json.data);
    } catch (e) {
      console.error(e);
    } finally {
      setBuscandoColab(false);
    }
  };

  const handleSalvar = async () => {
    if (!nome) {
      alert("O nome é obrigatório");
      return;
    }
    
    const matriculasArray = selectedColaboradores.map(c => c._id);

    setIsSaving(true);
    try {
      const url = editId ? `/api/publicos-alvo/${editId}` : "/api/publicos-alvo";
      const method = editId ? "PUT" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, descricao, matriculas: matriculasArray })
      });
      
      const data = await res.json();
      if (data.success) {
        alert(editId ? "Público-Alvo atualizado!" : "Público-Alvo criado com sucesso!");
        setIsModalOpen(false);
        setEditId(null);
        setNome("");
        setDescricao("");
        setSelectedColaboradores([]);
        carregarPublicos();
      } else {
        alert(data.error || "Erro ao salvar");
      }
    } catch (error) {
      alert("Erro de conexão");
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
        alert("Público-Alvo excluído!");
        carregarPublicos();
      } else {
        alert(data.error || "Você não tem permissão.");
      }
    } catch (e) {
      alert("Erro ao excluir.");
    }
  };

  const abrirEdicao = (pub: any) => {
    setEditId(pub.id);
    setNome(pub.nome);
    setDescricao(pub.descricao || "");
    setSelectedColaboradores(pub.matriculas.map((m: string) => ({ _id: m, nome: "Matrícula: " + m })));
    setPesquisa("");
    setFiltroEmpresa("");
    setFiltroPlanta("");
    setFiltroCargo("");
    setFiltroGestor("");
    setIsModalOpen(true);
  };

  const abrirCriacao = () => {
    setEditId(null);
    setNome("");
    setDescricao("");
    setSelectedColaboradores([]);
    setPesquisa("");
    setFiltroEmpresa("");
    setFiltroPlanta("");
    setFiltroCargo("");
    setFiltroGestor("");
    setIsModalOpen(true);
  };

  const toggleColaborador = (colab: any) => {
    if (selectedColaboradores.find(c => c._id === colab._id)) {
      setSelectedColaboradores(selectedColaboradores.filter(c => c._id !== colab._id));
    } else {
      setSelectedColaboradores([...selectedColaboradores, colab]);
    }
  };

  const adicionarTodosResultados = () => {
    const novos = resultadosColab.filter(r => !selectedColaboradores.find(c => c._id === r._id));
    setSelectedColaboradores([...selectedColaboradores, ...novos]);
  };

  const removerTodos = () => {
    if(confirm("Remover todos os selecionados?")) setSelectedColaboradores([]);
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
          onClick={abrirCriacao}
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
            <div 
              key={pub.id} 
              onClick={() => abrirEdicao(pub)}
              className="bg-slate-800/50 backdrop-blur-md border border-slate-700/50 rounded-2xl p-6 hover:bg-slate-800 hover:border-slate-600 transition-all group cursor-pointer relative"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl">
                  <Users className="h-6 w-6" />
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); excluirPublico(pub.id); }} 
                  className="p-2 text-slate-500 hover:text-red-400 hover:bg-slate-700 rounded-lg transition-colors opacity-0 group-hover:opacity-100 z-10"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <h3 className="text-xl font-bold text-white mb-1 truncate group-hover:text-blue-400 transition-colors flex items-center gap-2">
                {pub.nome} <Edit className="h-4 w-4 opacity-0 group-hover:opacity-100" />
              </h3>
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
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-6xl w-full max-h-[95vh] flex flex-col shadow-2xl">
            
            {/* Header Modal */}
            <div className="p-6 border-b border-slate-700 flex justify-between items-center shrink-0">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Target className="h-6 w-6 text-blue-400" />
                {editId ? "Editar Público-Alvo" : "Novo Público-Alvo"}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white text-2xl leading-none p-2">&times;</button>
            </div>
            
            {/* Corpo do Modal - Layout em Colunas */}
            <div className="flex flex-col lg:flex-row flex-1 min-h-0 overflow-hidden">
              
              {/* Coluna da Esquerda: Config e Busca */}
              <div className="w-full lg:w-1/2 border-b lg:border-b-0 lg:border-r border-slate-700 flex flex-col min-h-0">
                <div className="p-6 space-y-4 shrink-0 border-b border-slate-700/50">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Nome do Público / Turma *</label>
                      <input 
                        type="text"
                        value={nome}
                        onChange={e => setNome(e.target.value)}
                        placeholder="Ex: Operadores de Caldeira"
                        className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:border-blue-500 outline-none text-sm"
                      />
                    </div>
                  </div>

                  {/* Filtros de Busca */}
                  <div className="pt-2">
                    <label className="block text-xs font-bold text-blue-400 uppercase mb-2 flex items-center gap-2">
                      <Search className="h-4 w-4" /> Buscar Colaboradores no Banco
                    </label>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <CustomSelect 
                        value={filtroEmpresa}
                        onChange={setFiltroEmpresa}
                        options={empresasOptions}
                        placeholder="Todas as Empresas"
                        icon={Building2}
                      />
                      <CustomSelect 
                        value={filtroPlanta}
                        onChange={setFiltroPlanta}
                        options={plantasOptions}
                        placeholder="Todas as Plantas"
                        icon={MapPin}
                      />
                      <CustomSelect 
                        value={filtroCargo}
                        onChange={setFiltroCargo}
                        options={cargosOptions}
                        placeholder="Todos os Cargos"
                        icon={Briefcase}
                      />
                      <CustomSelect 
                        value={filtroGestor}
                        onChange={setFiltroGestor}
                        options={gestoresOptions}
                        placeholder="Todos os Gestores"
                        icon={UserCircle}
                        disabled={gestoresOptions.length === 0}
                      />
                    </div>
                    <input 
                      type="text"
                      value={pesquisa}
                      onChange={e => setPesquisa(e.target.value)}
                      placeholder="Buscar por nome ou matrícula..."
                      className="w-full bg-slate-900 border border-blue-500/30 focus:border-blue-500 rounded-lg px-4 py-3 text-white text-sm outline-none"
                    />
                  </div>
                </div>

                {/* Resultados da Busca */}
                <div className="flex-1 overflow-y-auto p-4 bg-slate-950/30">
                  <div className="flex justify-between items-center mb-3 px-2">
                    <span className="text-xs text-slate-400 font-medium">Resultados encontrados: {resultadosColab.length}</span>
                    {resultadosColab.length > 0 && (
                      <button onClick={adicionarTodosResultados} className="text-xs text-blue-400 hover:text-blue-300 font-bold">
                        + Adicionar Todos
                      </button>
                    )}
                  </div>
                  
                  {buscandoColab ? (
                    <div className="flex items-center justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-blue-500" /></div>
                  ) : resultadosColab.length === 0 ? (
                    <div className="text-center text-slate-500 text-sm py-10">Nenhum resultado encontrado</div>
                  ) : (
                    <div className="space-y-2">
                      {resultadosColab.map(colab => {
                        const isSelected = !!selectedColaboradores.find(c => c._id === colab._id);
                        return (
                          <div 
                            key={colab._id}
                            onClick={() => toggleColaborador(colab)}
                            className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${isSelected ? 'bg-blue-900/20 border-blue-500/50' : 'bg-slate-900 border-slate-800 hover:border-slate-600'}`}
                          >
                            <div>
                              <p className="text-sm font-bold text-white">{colab.nome}</p>
                              <p className="text-xs text-slate-400 font-mono mt-0.5">{colab._id} • {colab.planta}</p>
                            </div>
                            <div className={`w-6 h-6 rounded-md flex items-center justify-center border ${isSelected ? 'bg-blue-500 border-blue-400 text-white' : 'border-slate-600 text-transparent'}`}>
                              <Check className="h-4 w-4" />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Coluna da Direita: Selecionados */}
              <div className="w-full lg:w-1/2 flex flex-col min-h-0 bg-slate-900/20">
                <div className="p-5 border-b border-slate-700/50 flex justify-between items-center shrink-0">
                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <Users className="h-5 w-5 text-emerald-400" />
                      Pessoas Selecionadas
                    </h3>
                    <p className="text-xs text-slate-400">{selectedColaboradores.length} colaboradores na lista</p>
                  </div>
                  {selectedColaboradores.length > 0 && (
                    <button onClick={removerTodos} className="text-xs text-red-400 hover:text-red-300 font-bold px-3 py-1.5 bg-red-500/10 rounded-lg">
                      Limpar Tudo
                    </button>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                  {selectedColaboradores.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center p-6">
                      <Target className="h-12 w-12 text-slate-700 mb-3" />
                      <p className="text-slate-400 text-sm">Nenhuma pessoa selecionada ainda.<br/>Busque na coluna ao lado e clique para adicionar.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-2">
                      {selectedColaboradores.map(colab => (
                        <div key={colab._id} className="bg-slate-800 border border-slate-700 p-2.5 rounded-lg flex items-center justify-between group">
                          <div className="flex items-center gap-3 overflow-hidden">
                            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 font-bold text-xs shrink-0">
                              {colab.nome?.charAt(0) || "U"}
                            </div>
                            <div className="truncate">
                              <p className="text-sm font-bold text-slate-200 truncate">{colab.nome}</p>
                              <p className="text-[10px] text-slate-400 font-mono truncate">{colab._id}</p>
                            </div>
                          </div>
                          <button 
                            onClick={() => toggleColaborador(colab)}
                            className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Footer Modal */}
            <div className="p-5 border-t border-slate-700 flex justify-end gap-3 shrink-0 bg-slate-800 rounded-b-2xl">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-6 py-2.5 rounded-xl font-medium text-slate-300 hover:bg-slate-700 transition-colors"
                disabled={isSaving}
              >
                Cancelar
              </button>
              <button 
                onClick={handleSalvar}
                disabled={isSaving || !nome}
                className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-2.5 rounded-xl font-medium shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                {isSaving ? "Salvando..." : (editId ? "Salvar Alterações" : "Concluir Lista (" + selectedColaboradores.length + ")")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
