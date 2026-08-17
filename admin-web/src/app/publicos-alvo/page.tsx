"use client";

import { useState, useEffect, useRef } from "react";
import ConfirmModal from '@/components/ConfirmModal';
import PromptModal from '@/components/PromptModal';
import toast from 'react-hot-toast';
import { Users, Target, Plus, Search, Loader2, Trash2, Edit, X, Check, ChevronDown, Building2, MapPin, Briefcase, UserCircle, Save, Clock, CheckCircle2 } from "lucide-react";

const CustomSelect = ({ values, onChange, options, placeholder, icon: Icon, disabled = false }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
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

  const filteredOptions = options.filter((opt: string) => opt.toLowerCase().includes(search.toLowerCase()));

  const toggleOption = (opt: string) => {
    if (values.includes(opt)) {
      onChange(values.filter((v: string) => v !== opt));
    } else {
      onChange([...values, opt]);
    }
  };

  const displayText = values.length === 0 
    ? placeholder 
    : values.length === 1 
      ? values[0] 
      : `${values.length} selecionados`;

  return (
    <div className={`relative w-full ${disabled ? "opacity-50 cursor-not-allowed" : ""}`} ref={selectRef}>
      <div 
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm outline-none hover:border-blue-500 cursor-pointer flex items-center justify-between transition-colors"
      >
        <div className="flex items-center gap-2 truncate">
          {Icon && <Icon className="h-4 w-4 text-slate-400 shrink-0" />}
          <span className="truncate">{displayText}</span>
        </div>
        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </div>
      
      {isOpen && !disabled && (
        <div className="absolute top-full left-0 mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100 flex flex-col">
          <div className="p-2 border-b border-slate-700">
            <input 
              type="text" 
              placeholder="Pesquisar..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-1.5 text-white text-sm outline-none focus:border-blue-500"
            />
          </div>
          <ul className="max-h-60 overflow-y-auto py-1 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent">
            {filteredOptions.length === 0 ? (
              <li className="px-3 py-2 text-sm text-slate-500 text-center">Nenhum resultado</li>
            ) : (
              filteredOptions.map((opt: string) => {
                const isSelected = values.includes(opt);
                return (
                  <li 
                    key={opt}
                    onClick={() => toggleOption(opt)}
                    className={`px-3 py-2 text-sm cursor-pointer hover:bg-slate-700 transition-colors flex items-center gap-2 ${isSelected ? "bg-blue-600/20 text-blue-400 font-medium" : "text-slate-300"}`}
                  >
                    <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${isSelected ? "bg-blue-500 border-blue-500 text-white" : "border-slate-500"}`}>
                      {isSelected && <Check className="h-3 w-3" />}
                    </div>
                    <span className="truncate">{opt}</span>
                  </li>
                );
              })
            )}
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
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editTreinamentoVinculado, setEditTreinamentoVinculado] = useState<any>(null);
  const [editPresencas, setEditPresencas] = useState<string[]>([]);
  
  const [rolesDisponiveis, setRolesDisponiveis] = useState<string[]>([]);
  const [isRolesModalOpen, setIsRolesModalOpen] = useState(false);
  const [novoRol, setNovoRol] = useState("");

  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  
  const [confirmModal, setConfirmModal] = useState<{isOpen: boolean, title: string, message: string, onConfirm: () => void, variant: 'danger'|'warning'}>({isOpen: false, title: '', message: '', onConfirm: () => {}, variant: 'danger'});
  const [promptModal, setPromptModal] = useState<{isOpen: boolean, title: string, message: string, onConfirm: (v: string) => void}>({isOpen: false, title: '', message: '', onConfirm: () => {}});
  
  // New States for Search & Select UI
  const [selectedColaboradores, setSelectedColaboradores] = useState<any[]>([]);
  const [checkedColabs, setCheckedColabs] = useState<string[]>([]);
  const [pesquisa, setPesquisa] = useState("");
  const [filtroEmpresa, setFiltroEmpresa] = useState<string[]>([]);
  const [filtroPlanta, setFiltroPlanta] = useState<string[]>([]);
  const [filtroCargo, setFiltroCargo] = useState<string[]>([]);
  const [filtroGestor, setFiltroGestor] = useState<string[]>([]);
  const [resultadosColab, setResultadosColab] = useState<any[]>([]);
  const [totalEncontrados, setTotalEncontrados] = useState(0);
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
    filtroEmpresa.forEach(e => params.append('empresa', e));
    filtroPlanta.forEach(p => params.append('planta', p));

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
    if (isSearchModalOpen) {
      const timeoutId = setTimeout(() => {
        buscarColaboradores();
      }, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [pesquisa, filtroEmpresa, filtroPlanta, filtroCargo, filtroGestor, isSearchModalOpen]);

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

  const buscarColaboradores = async () => {
    setBuscandoColab(true);
    try {
      const params = new URLSearchParams();
      if (pesquisa) params.append('busca', pesquisa);
      filtroEmpresa.forEach(e => params.append('empresa', e));
      filtroPlanta.forEach(p => params.append('planta', p));
      filtroCargo.forEach(c => params.append('cargo', c));
      filtroGestor.forEach(g => params.append('gestor', g));
      params.append('limit', '2000'); // Limite alto para evitar sobrecarga excessiva no navegador, mas suficiente para a maioria dos pblicos-alvo
      
      const res = await fetch(`/api/colaboradores?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setResultadosColab(json.data);
        setTotalEncontrados(json.total || 0);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setBuscandoColab(false);
    }
  };

  const updateRol = (id: string, rol: string) => {
    setSelectedColaboradores(prev => prev.map(c => (c._id === id || c.matricula === id) ? { ...c, rol } : c));
  };

  const handleAddRol = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoRol.trim()) return;
    if (!rolesDisponiveis.includes(novoRol.trim())) {
      setRolesDisponiveis(prev => [...prev, novoRol.trim()]);
    }
    setNovoRol("");
  };

  const handleRemoveRol = (rolToRemove: string) => {
    setRolesDisponiveis(prev => prev.filter(r => r !== rolToRemove));
  };
  
  const aplicarRolEmMassa = () => {
    setPromptModal({
      isOpen: true,
      title: "Atribuir Rol",
      message: "Digite o papel (rol) para aplicar a todos da lista (ex: Operador, Brigadista):",
      onConfirm: (rol) => {
        setSelectedColaboradores(prev => prev.map(c => ({ ...c, rol })));
        setPromptModal(prev => ({...prev, isOpen: false}));
        toast.success("Rol aplicado aos selecionados!");
      }
    });
  };

  const copiarEmails = () => {
    const emails = selectedColaboradores.map(c => c.email).filter(e => e && e.trim() !== "");
    if (emails.length === 0) {
      toast.error("Nenhum e-mail encontrado na lista.");
      return;
    }
    navigator.clipboard.writeText(emails.join("; "));
    toast.success(`${emails.length} e-mail(s) copiado(s)!`);
  };

  const salvarPublico = async () => {
    if (!nome) {
      toast.error("O nome do público-alvo é obrigatório.");
      return;
    }
    
    setIsSaving(true);
    const matriculas = selectedColaboradores.map(c => c.matricula || c._id);
    const membros = selectedColaboradores.map(c => ({ matricula: c.matricula || c._id, rol: c.rol || "" }));
    
    try {
      const url = editId ? `/api/publicos-alvo/${editId}` : "/api/publicos-alvo";
      const method = editId ? "PUT" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, descricao, matriculas, membros, roles_disponiveis: rolesDisponiveis })
      });
      
      const data = await res.json();
      if (data.success) {
        toast.success(editId ? "Público-Alvo atualizado!" : "Público-Alvo criado!");
        setIsModalOpen(false);
        setEditId(null);
        setNome("");
        setDescricao("");
        setSelectedColaboradores([]);
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
    setConfirmModal({
      isOpen: true,
      title: "Excluir Público-Alvo",
      message: "Tem certeza que deseja excluir este Público-Alvo? Isso não apagará as presenças, apenas a lista de convocação.",
      variant: "danger",
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          const res = await fetch(`/api/publicos-alvo/${id}`, { method: "DELETE" });
          const data = await res.json();
          if (data.success) {
            toast.success("Público-Alvo excluído!");
            carregarPublicos();
          } else {
            toast.error(data.error || "Erro ao salvar");
          }
        } catch (e) {
          toast.error("Erro ao excluir.");
        }
      }
    });
  };

  const abrirEdicao = async (pub: any) => {
    setEditId(pub.id);
    setEditTreinamentoVinculado(pub.treinamento_vinculado || null);
    setEditPresencas(pub.presencas_matriculas || []);
    setNome(pub.nome);
    setDescricao(pub.descricao || "");
    setRolesDisponiveis(pub.roles_disponiveis || []);
    setCheckedColabs([]);
    
    setIsModalOpen(true);
    setBuscandoColab(true);
    
    try {
        const matriculasUnicasReq = Array.from(new Set(pub.matriculas || []));
        const res = await fetch("/api/colaboradores/batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ matriculas: matriculasUnicasReq })
        });
        const json = await res.json();
        if (json.success) {
          const encontrados = json.data.map((c: any) => {
           const det = pub.matriculas_detalhes?.find((md: any) => md._id === (c.matricula || c._id));
           return { ...c, rol: det?.rol || "" };
        });
        
        const encontradosIds = new Set(encontrados.map((c: any) => c.matricula || c._id));
        const matriculasUnicas = Array.from(new Set(pub.matriculas)) as string[];
        const naoEncontrados = matriculasUnicas
          .filter((m: string) => {
             const cleanM = String(m).replace(/^0+/, '');
             const noZeroM = cleanM.length > 0 ? cleanM : m;
             return !encontradosIds.has(m) && !encontradosIds.has(cleanM) && !encontradosIds.has(noZeroM);
          })
          .map((m: string) => {
             const det = pub.matriculas_detalhes?.find((md: any) => md._id === m);
             return { 
               _id: m, 
               nome: "Matrícula/ID: " + m, 
               cargo: "Não localizado no banco", 
               planta: "-",
               rol: det?.rol || ""
             };
          });
          
          const combinados = [...encontrados, ...naoEncontrados];
          const unicosMap = new Map();
          combinados.forEach(c => {
             const key = c._id || c.matricula;
             if (!unicosMap.has(key)) {
                unicosMap.set(key, c);
             }
          });
          
          setSelectedColaboradores(Array.from(unicosMap.values()));
      } else {
        setSelectedColaboradores(pub.matriculas.map((m: string) => {
           const det = pub.matriculas_detalhes?.find((md: any) => md._id === m);
           return { _id: m, nome: "Matrícula: " + m, cargo: "-", planta: "-", rol: det?.rol || "" };
        }));
      }
    } catch (e) {
      setSelectedColaboradores(pub.matriculas.map((m: string) => {
           const det = pub.matriculas_detalhes?.find((md: any) => md._id === m);
           return { _id: m, nome: "Matrícula: " + m, cargo: "-", planta: "-", rol: det?.rol || "" };
      }));
    } finally {
      setBuscandoColab(false);
    }

    setPesquisa("");
    setFiltroEmpresa([]);
    setFiltroPlanta([]);
    setFiltroCargo([]);
    setFiltroGestor([]);
  };

  const abrirCriacao = () => {
    setEditId(null);
    setEditTreinamentoVinculado(null);
    setEditPresencas([]);
    setNome("");
    setDescricao("");
    setSelectedColaboradores([]);
    setPesquisa("");
    setFiltroEmpresa([]);
    setFiltroPlanta([]);
    setFiltroCargo([]);
    setFiltroGestor([]);
    setRolesDisponiveis([]);
    setCheckedColabs([]);
    setIsModalOpen(true);
  };

  const toggleColaborador = (colab: any) => {
    if (selectedColaboradores.find(c => c._id === colab._id)) {
      setSelectedColaboradores(selectedColaboradores.filter(c => c._id !== colab._id));
      setCheckedColabs(prev => prev.filter(id => id !== colab._id));
    } else {
      setSelectedColaboradores([...selectedColaboradores, colab]);
    }
  };

  const toggleColabCheck = (id: string) => {
    setCheckedColabs(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
  };

  const toggleAllColabsCheck = () => {
    if (checkedColabs.length === selectedColaboradores.length) {
      setCheckedColabs([]);
    } else {
      setCheckedColabs(selectedColaboradores.map(c => c._id));
    }
  };

  const adicionarTodosResultados = () => {
    const novos = resultadosColab.filter(r => !selectedColaboradores.find(c => c._id === r._id));
    setSelectedColaboradores([...selectedColaboradores, ...novos]);
  };

  const removerTodos = () => {
    setConfirmModal({
      isOpen: true,
      title: "Remover Selecionados",
      message: "Remover todos os selecionados da lista?",
      variant: "danger",
      onConfirm: () => {
        setSelectedColaboradores([]);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        toast.success("Selecionados removidos.");
      }
    });
  };
    
  const removerInvalidos = () => {
    setSelectedColaboradores(prev => prev.filter(c => c.cargo !== "Não localizado no banco"));
  };

  const filtrados = publicos.filter(p => p.nome.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-500">
      
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
                  <div className="flex gap-3">
                    <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl shrink-0">
                      <Users className="h-6 w-6" />
                    </div>
                    {pub.treinamento_vinculado ? (
                       <div className="flex flex-col justify-center">
                          <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Vinculado a:</span>
                          <span className="text-xs text-emerald-100 bg-emerald-900/40 px-2 py-0.5 rounded border border-emerald-700/50 line-clamp-1" title={pub.treinamento_vinculado.nome}>
                            {pub.treinamento_vinculado.nome}
                          </span>
                       </div>
                    ) : (
                       <div className="flex flex-col justify-center">
                          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Status:</span>
                          <span className="text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">Aguardando Vínculo</span>
                       </div>
                    )}
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); excluirPublico(pub.id); }} 
                    className="p-2 text-slate-500 hover:text-red-400 hover:bg-slate-700 rounded-lg transition-colors opacity-0 group-hover:opacity-100 z-10 shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              <h3 className="text-xl font-bold text-white mb-1 truncate group-hover:text-blue-400 transition-colors flex items-center gap-2">
                {pub.nome} <Edit className="h-4 w-4 opacity-0 group-hover:opacity-100" />
              </h3>
              <p className="text-sm text-slate-400 mb-4 line-clamp-2 min-h-[40px]">{pub.descricao || "Sem descrição"}</p>
              
              {pub.treinamento_vinculado && (
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Avanço da Turma</span>
                    <span className="text-[10px] font-bold text-blue-400">
                      {pub.matriculas?.length > 0 
                        ? Math.round(((pub.presencas_matriculas?.length || 0) / pub.matriculas.length) * 100) 
                        : 0}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden border border-slate-700">
                    <div 
                      className="bg-blue-500 h-1.5 rounded-full transition-all duration-500"
                      style={{ width: `${pub.matriculas?.length > 0 ? Math.round(((pub.presencas_matriculas?.length || 0) / pub.matriculas.length) * 100) : 0}%` }}
                    ></div>
                  </div>
                </div>
              )}
              
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

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-slate-800 border border-slate-700 rounded-xl max-w-6xl w-full h-[95vh] flex flex-col shadow-2xl overflow-hidden">
            
            <div className="px-5 py-3 border-b border-slate-700 flex flex-wrap gap-3 justify-between items-center bg-slate-900/80 shrink-0">
              <div className="flex items-center gap-3 flex-1 min-w-[300px]">
                <Target className="h-6 w-6 text-blue-400 shrink-0" />
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Digite o nome deste Público-Alvo..."
                  className="bg-slate-900/50 border border-slate-600 focus:border-blue-500 rounded-lg px-3 py-1.5 text-lg font-bold text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500/20 outline-none w-full max-w-md transition-all"
                />
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white bg-slate-700/50 hover:bg-slate-700 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={salvarPublico}
                  disabled={isSaving || !nome}
                  className="px-6 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors flex items-center gap-2 shadow-lg shadow-blue-500/20 disabled:opacity-50"
                >
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {isSaving ? "Salvando..." : (editId ? "Salvar Alterações" : "Concluir Lista")}
                </button>
              </div>
            </div>

            <div className="flex-1 flex flex-col min-h-0 bg-slate-900/30 p-4 sm:p-5">
               
               <div className="flex justify-between items-center mb-4 shrink-0">
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-emerald-400" />
                    <div>
                      <h3 className="text-base font-bold text-white leading-none">Pessoas Selecionadas</h3>
                      <p className="text-[13px] text-slate-400 mt-1">{selectedColaboradores.length} adicionados</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {selectedColaboradores.length > 0 && (
                      <>
                        <button 
                          onClick={copiarEmails}
                          className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-700/50 hover:bg-slate-600 rounded-md transition-colors border border-slate-600"
                          title="Copiar todos os e-mails da lista"
                        >
                          Copiar E-mails
                        </button>
                        <button 
                          onClick={() => setIsRolesModalOpen(true)}
                          className="px-3 py-1.5 text-xs font-medium text-indigo-300 hover:text-white bg-indigo-500/10 hover:bg-indigo-500/20 rounded-md transition-colors border border-indigo-500/20"
                        >
                          Configurar Roles
                        </button>
                        <div className="relative group">
                          <select
                            onChange={(e) => {
                              if (e.target.value) {
                                const role = e.target.value;
                                if (checkedColabs.length === 0) {
                                  toast.error("Selecione pessoas na caixa à esquerda primeiro.");
                                  e.target.value = "";
                                  return;
                                }
                                setSelectedColaboradores(prev => prev.map(c => checkedColabs.includes(c._id) ? { ...c, rol: role } : c));
                                toast.success(`Rol aplicado a ${checkedColabs.length} pessoa(s)!`);
                                setCheckedColabs([]);
                                e.target.value = "";
                              }
                            }}
                            disabled={checkedColabs.length === 0}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md outline-none appearance-none pr-8 transition-colors ${checkedColabs.length > 0 ? "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 cursor-pointer" : "text-slate-500 bg-slate-800/50 border border-slate-700 cursor-not-allowed"}`}
                          >
                            <option value="" className="bg-slate-800 text-slate-300">
                              {checkedColabs.length > 0 ? `Atribuir a ${checkedColabs.length} selecionado(s)...` : "Selecione pessoas para atribuir Rol..."}
                            </option>
                            {rolesDisponiveis.map(r => (
                              <option key={r} value={r} className="bg-slate-800 text-slate-200">{r}</option>
                            ))}
                          </select>
                          <ChevronDown className={`h-3 w-3 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none ${checkedColabs.length > 0 ? "text-emerald-400" : "text-slate-500"}`} />
                        </div>

                        {selectedColaboradores.some(c => c.cargo === "Não localizado no banco") && (
                          <button 
                            onClick={removerInvalidos}
                            className="px-3 py-1.5 text-xs font-medium text-orange-400 hover:text-white bg-orange-500/10 hover:bg-orange-500/20 rounded-md transition-colors border border-orange-500/20"
                          >
                            Limpar Inválidos
                          </button>
                        )}

                        <button 
                          onClick={removerTodos}
                          className="px-3 py-1.5 text-xs font-medium text-red-400 hover:text-white bg-red-500/10 hover:bg-red-500/20 rounded-md transition-colors"
                        >
                          Limpar Tudo
                        </button>
                      </>
                    )}
                    <button 
                      onClick={() => setIsSearchModalOpen(true)}
                      className="px-4 py-1.5 text-sm font-bold text-white bg-blue-500 hover:bg-blue-400 rounded-md transition-colors shadow-sm"
                    >
                      + Adicionar Pessoas
                    </button>
                  </div>
               </div>

               {buscandoColab && editId ? (
                 <div className="flex items-center justify-center py-20"><Loader2 className="h-10 w-10 animate-spin text-blue-500" /></div>
               ) : selectedColaboradores.length === 0 ? (
                 <div className="flex flex-col items-center justify-center flex-1 text-center p-12 bg-slate-800/30 rounded-xl border border-slate-700/50 border-dashed">
                   <Target className="h-16 w-16 text-slate-600 mb-4" />
                   <p className="text-slate-400 text-lg">Nenhuma pessoa selecionada ainda.<br/>Clique no botão acima para adicionar colaboradores do banco.</p>
                 </div>
               ) : (
                 <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-sm flex-1 flex flex-col min-h-0">
                   <div className="overflow-auto flex-1 relative">
                     <table className="w-full text-left text-sm text-slate-300 border-collapse">
                       <thead className="bg-slate-900/80 text-slate-400 font-bold uppercase text-[10px] border-b border-slate-700 sticky top-0 z-10 backdrop-blur-sm">
                         <tr>
                           <th className="px-2 py-2 text-center w-8">
                             <input 
                               type="checkbox" 
                               className="rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500/20 cursor-pointer"
                               checked={selectedColaboradores.length > 0 && checkedColabs.length === selectedColaboradores.length}
                               onChange={toggleAllColabsCheck}
                             />
                           </th>
                           <th className="px-2 py-2 whitespace-nowrap">Colaborador</th>
                           <th className="px-2 py-2 whitespace-nowrap">Matrícula</th>
                           <th className="px-2 py-2 whitespace-nowrap">Cargo</th>
                           <th className="px-2 py-2 whitespace-nowrap">Turno</th>
                           <th className="px-2 py-2 whitespace-nowrap">Área</th>
                           <th className="px-2 py-2 whitespace-nowrap">E-mail</th>
                           <th className="px-2 py-2 whitespace-nowrap">Planta / Empresa</th>
                           <th className="px-2 py-2 whitespace-nowrap w-24">Papel / Rol</th>
                           {editTreinamentoVinculado && <th className="px-2 py-2 text-center whitespace-nowrap w-20">Presença</th>}
                           <th className="px-2 py-2 text-center whitespace-nowrap w-12">Remover</th>
                         </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-700/50">
                         {selectedColaboradores.map(colab => {
                           const isPresente = editPresencas.some(p => {
                             const cleanP = String(p).replace(/^0+/, '');
                             const id1 = String(colab._id || '').replace(/^0+/, '');
                             const id2 = String(colab.matricula || '').replace(/^0+/, '');
                             const id3 = String(colab.identificador || '').replace(/^0+/, '');
                             const id4 = String(colab.cod_cracha || '').replace(/^0+/, '');
                             return (cleanP && cleanP === id1) || 
                                    (cleanP && cleanP === id2) || 
                                    (cleanP && id1 && cleanP.endsWith(id1)) || 
                                    (id1 && cleanP && id1.endsWith(cleanP)) ||
                                    (cleanP && id2 && cleanP.endsWith(id2)) || 
                                    (id2 && cleanP && id2.endsWith(cleanP)) ||
                                    (id3 && cleanP === id3) || 
                                    (id4 && cleanP === id4);
                           });
                           return (
                             <tr key={colab._id} className="hover:bg-slate-700/40 transition-colors group">
                               <td className="px-2 py-1 text-center">
                                 <input 
                                   type="checkbox" 
                                   className="rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500/20 cursor-pointer"
                                   checked={checkedColabs.includes(colab._id)}
                                   onChange={() => toggleColabCheck(colab._id)}
                                 />
                               </td>
                               <td className="px-2 py-1 text-white font-medium text-[11px] truncate max-w-[150px]" title={colab.nome}>
                                 {colab.nome}
                               </td>
                               <td className="px-2 py-1 font-mono text-[10px] text-slate-400">{colab.matricula || colab._id}</td>
                               <td className="px-2 py-1 text-blue-400 text-[10px] truncate max-w-[120px]" title={colab.cargo}>
                                 {(colab.cargo || "").replace(/^\d+\s*-\s*/, '')}
                               </td>
                               <td className="px-2 py-1 text-emerald-400 font-medium text-[10px] whitespace-nowrap">{colab.turno || "-"}</td>
                               <td className="px-2 py-1 text-indigo-400 text-[10px] truncate max-w-[120px]" title={colab.area}>{colab.area || "-"}</td>
                               <td className="px-2 py-1 text-slate-400 text-[10px] truncate max-w-[120px]" title={colab.email}>{colab.email || "-"}</td>
                               <td className="px-2 py-1 text-slate-300 text-[10px] truncate max-w-[120px]" title={`${colab.planta} - ${colab.empresa}`}>{colab.planta} - {colab.empresa}</td>
                               <td className="px-2 py-1">
                                 <div className="relative">
                                   <select
                                     value={colab.rol || ""}
                                     onChange={(e) => updateRol(colab._id, e.target.value)}
                                     className="w-full bg-slate-900 border border-slate-600 text-[10px] text-white px-1.5 py-0.5 rounded focus:outline-none focus:border-blue-500 appearance-none pr-5 cursor-pointer"
                                   >
                                     <option value="" className="bg-slate-800 text-slate-300">Nenhum</option>
                                     {rolesDisponiveis.map(r => (
                                       <option key={r} value={r} className="bg-slate-800 text-slate-200">{r}</option>
                                     ))}
                                   </select>
                                   <ChevronDown className="h-3 w-3 text-slate-400 absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none" />
                                 </div>
                               </td>
                               {editTreinamentoVinculado && (
                                 <td className="px-2 py-1 text-center">
                                   {isPresente ? (
                                      <CheckCircle2 className="h-4 w-4 text-emerald-400 inline-block" />
                                   ) : (
                                      <Clock className="h-4 w-4 text-slate-600 inline-block" />
                                   )}
                                 </td>
                               )}
                               <td className="px-2 py-1 text-center">
                                 <button 
                                   onClick={() => toggleColaborador(colab)}
                                   className="p-1 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors opacity-50 group-hover:opacity-100"
                                 >
                                   <X className="h-3 w-3" />
                                 </button>
                               </td>
                             </tr>
                           );
                         })}
                       </tbody>
                     </table>
                   </div>
                 </div>
               )}
            </div>
          </div>
        </div>
      )}

      {isSearchModalOpen && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-md flex items-center justify-center p-4 z-[60] animate-in fade-in zoom-in-95 duration-200">
           <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-5xl w-full max-h-[90vh] flex flex-col shadow-2xl">
             <div className="p-6 border-b border-slate-700 flex justify-between items-center shrink-0">
               <h2 className="text-xl font-bold text-white flex items-center gap-3">
                 <Search className="h-6 w-6 text-blue-400" />
                 Buscar Colaboradores no Banco
               </h2>
               <button onClick={() => setIsSearchModalOpen(false)} className="text-slate-400 hover:text-white text-3xl leading-none p-2">&times;</button>
             </div>
             
             <div className="p-6 border-b border-slate-700/50 bg-slate-900/30 shrink-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-5">
                  <CustomSelect values={filtroEmpresa} onChange={setFiltroEmpresa} options={empresasOptions} placeholder="Todas as Empresas" icon={Building2} />
                  <CustomSelect values={filtroPlanta} onChange={setFiltroPlanta} options={plantasOptions} placeholder="Todas as Plantas" icon={MapPin} />
                  <CustomSelect values={filtroCargo} onChange={setFiltroCargo} options={cargosOptions} placeholder="Todos os Cargos" icon={Briefcase} />
                  <CustomSelect values={filtroGestor} onChange={setFiltroGestor} options={gestoresOptions} placeholder="Todos os Gestores" icon={UserCircle} disabled={gestoresOptions.length === 0} />
                </div>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <input 
                    type="text"
                    value={pesquisa}
                    onChange={e => setPesquisa(e.target.value)}
                    placeholder="Buscar por nome ou matrícula..."
                    className="w-full bg-slate-900 border border-slate-700 focus:border-blue-500 rounded-xl py-3 pl-12 pr-4 text-white text-base outline-none transition-all shadow-inner"
                  />
                </div>
             </div>
             
             <div className="flex-1 overflow-y-auto p-6 bg-slate-950/50">
                <div className="flex justify-between items-center mb-5">
                  <span className="text-sm text-slate-400 font-medium">
                    {resultadosColab.length < totalEncontrados 
                      ? `Exibindo ${resultadosColab.length} de ${totalEncontrados} resultados encontrados (limite atingido)` 
                      : `Resultados encontrados: ${totalEncontrados}`}
                  </span>
                  {resultadosColab.length > 0 && (
                    <button onClick={adicionarTodosResultados} className="text-sm text-blue-400 hover:text-blue-300 font-bold px-4 py-2 bg-blue-500/10 rounded-lg transition-colors">
                      + Adicionar Todos Exibidos
                    </button>
                  )}
                </div>
                
                {buscandoColab ? (
                  <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                    <Loader2 className="h-10 w-10 animate-spin text-blue-500 mb-4" />
                    <p>Buscando colaboradores...</p>
                  </div>
                ) : resultadosColab.length === 0 ? (
                  <div className="text-center text-slate-500 py-20 bg-slate-900/50 rounded-2xl border border-slate-800 border-dashed">
                    <Search className="h-12 w-12 text-slate-700 mx-auto mb-3" />
                    <p>Nenhum resultado encontrado para os filtros atuais.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {resultadosColab.map(colab => {
                      const isSelected = !!selectedColaboradores.find(c => c._id === colab._id);
                      return (
                        <div 
                          key={colab._id}
                          onClick={() => toggleColaborador(colab)}
                          className={`p-4 rounded-xl border flex items-start justify-between cursor-pointer transition-all ${isSelected ? 'bg-blue-900/20 border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.15)]' : 'bg-slate-800 border-slate-700 hover:border-slate-500'}`}
                        >
                          <div className="flex items-start gap-3 overflow-hidden">
                             <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${isSelected ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-700 text-slate-300'}`}>
                               {colab.nome?.charAt(0) || "U"}
                             </div>
                             <div className="truncate">
                               <p className="text-sm font-bold text-white truncate">{colab.nome}</p>
                               <p className="text-[11px] text-blue-400 font-medium truncate mt-0.5" title={colab.cargo}>{colab.cargo}</p>
                               {colab.area && <p className="text-[10px] text-indigo-400 font-medium mt-0.5 truncate">{colab.area}</p>}
                               {colab.email && <p className="text-[10px] text-slate-400 mt-0.5 truncate">{colab.email}</p>}
                               <p className="text-[10px] text-emerald-400 font-medium mt-0.5 truncate">{colab.turno ? `Turno: ${colab.turno}` : ''}</p>
                               <p className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">{colab._id} • {colab.planta} - {colab.empresa}</p>
                             </div>
                          </div>
                          <div className={`w-6 h-6 mt-1 rounded-md flex items-center justify-center border shrink-0 transition-colors ${isSelected ? 'bg-blue-500 border-blue-400 text-white' : 'border-slate-600 text-transparent'}`}>
                            <Check className="h-4 w-4" />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
             </div>
             
             {/* Footer */}
             <div className="p-6 border-t border-slate-700 flex justify-between items-center shrink-0 bg-slate-800 rounded-b-2xl">
               <div className="text-slate-400 text-sm">
                 <strong className="text-white">{selectedColaboradores.length}</strong> pessoas selecionadas no total
               </div>
               <button 
                 onClick={() => setIsSearchModalOpen(false)}
                 className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2"
               >
                 Confirmar Seleção <Check className="h-5 w-5" />
               </button>
             </div>
           </div>
        </div>
      )}

      {/* MODAL CONFIGURAR ROLES */}
      {isRolesModalOpen && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-4 z-[60] animate-in fade-in duration-200">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-500/20 rounded-lg">
                    <Target className="h-5 w-5 text-indigo-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white">Configurar Papéis (Roles)</h3>
                </div>
                <button onClick={() => setIsRolesModalOpen(false)} className="text-slate-400 hover:text-white transition-colors p-1 hover:bg-slate-700 rounded-lg">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mb-6">
                <p className="text-sm text-slate-400 mb-4">
                  Crie os papéis (roles) disponíveis para este público-alvo. Depois você poderá atribuí-los às pessoas da lista usando a caixa de seleção.
                </p>
                <form onSubmit={handleAddRol} className="flex gap-2">
                  <input
                    type="text"
                    value={novoRol}
                    onChange={(e) => setNovoRol(e.target.value)}
                    placeholder="Ex: Operador, Brigadista..."
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                  />
                  <button
                    type="submit"
                    disabled={!novoRol.trim()}
                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-xl font-medium transition-colors flex items-center gap-2"
                  >
                    <Plus className="h-5 w-5" />
                    Criar
                  </button>
                </form>
              </div>

              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {rolesDisponiveis.length === 0 ? (
                  <div className="text-center py-8 bg-slate-900/50 rounded-xl border border-slate-800 border-dashed">
                    <p className="text-slate-500 text-sm">Nenhum papel criado ainda.</p>
                  </div>
                ) : (
                  rolesDisponiveis.map(rol => (
                    <div key={rol} className="flex items-center justify-between bg-slate-900/80 border border-slate-700/50 p-3 rounded-xl group hover:border-slate-600 transition-colors">
                      <span className="text-slate-200 font-medium">{rol}</span>
                      <button onClick={() => handleRemoveRol(rol)} className="text-slate-500 hover:text-red-400 p-1.5 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="p-4 border-t border-slate-700 bg-slate-900/50 flex justify-end">
              <button
                onClick={() => setIsRolesModalOpen(false)}
                className="px-6 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-medium transition-colors"
              >
                Concluído
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal {...confirmModal} onCancel={() => setConfirmModal(prev => ({...prev, isOpen: false}))} />
      <PromptModal {...promptModal} onCancel={() => setPromptModal(prev => ({...prev, isOpen: false}))} />
    </div>
  );
}
