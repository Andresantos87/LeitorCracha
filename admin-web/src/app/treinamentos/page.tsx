"use client";
import { useState, useEffect, useRef } from "react";
import { Plus, Download, CheckCircle2, PlayCircle, Smartphone, ScanLine, QrCode, Trash2, UserPlus, PenTool, Link as LinkIcon, Folder, FolderOpen, ChevronDown, FolderPlus, Sparkles, PlusCircle } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import SignatureCanvas from "react-signature-canvas";

export default function Treinamentos() {
  const [treinamentos, setTreinamentos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expandedPastas, setExpandedPastas] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [nomeTreinamento, setNomeTreinamento] = useState("");
  const [turmaTreinamento, setTurmaTreinamento] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createMode, setCreateMode] = useState<'EXISTING' | 'NEW'>('EXISTING');

  // States para assinatura manual
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [manualId, setManualId] = useState("");
  const [isManualSubmitting, setIsManualSubmitting] = useState(false);
  const [colabResults, setColabResults] = useState<any[]>([]);
  const [selectedColab, setSelectedColab] = useState<any>(null);
  const [isSearchingId, setIsSearchingId] = useState(false);
  
  // Signature
  const sigCanvas = useRef<any>(null);
  const [hasSignature, setHasSignature] = useState(false);
  const [signatureView, setSignatureView] = useState<string | null>(null);

  // States para a lista de presenças
  const [presencas, setPresencas] = useState<any[]>([]);
  const [loadingPresencas, setLoadingPresencas] = useState(false);

  useEffect(() => {
    carregarTreinamentos();
  }, []);

  useEffect(() => {
    if (selectedId) {
      carregarPresencas(selectedId);
    } else {
      setPresencas([]);
    }
  }, [selectedId]);

  useEffect(() => {
    if (!manualId || manualId.length < 3) {
      setColabResults([]);
      setSelectedColab(null);
      return;
    }
    
    // Se o usuário acabou de selecionar na lista, não busca de novo
    if (selectedColab && (selectedColab.identificador === manualId || selectedColab.nome === manualId)) {
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsSearchingId(true);
      try {
        const res = await fetch(`/api/buscar-colaborador?id=${encodeURIComponent(manualId)}`);
        const json = await res.json();
        if (json.success && json.data) {
          setColabResults(json.data);
          // Auto-seleciona se for o único resultado e for exato
          if (json.data.length === 1 && /^\d+$/.test(manualId)) {
             setSelectedColab(json.data[0]);
             setManualId(json.data[0].identificador);
          }
        } else {
          setColabResults([]);
        }
      } catch (e) {
        setColabResults([]);
      } finally {
        setIsSearchingId(false);
      }
    }, 500); // 500ms de debounce
    
    return () => clearTimeout(timeoutId);
  }, [manualId]);

  const carregarPresencas = async (id: string) => {
    setLoadingPresencas(true);
    const res = await fetch(`/api/presencas?treinamentoId=${id}`);
    const json = await res.json();
    if (json.success) setPresencas(json.data);
    setLoadingPresencas(false);
  };

  const carregarTreinamentos = async () => {
    const res = await fetch("/api/treinamentos");
    const json = await res.json();
    if (json.success) setTreinamentos(json.data);
    setLoading(false);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomeTreinamento.trim()) return;
    
    setIsSubmitting(true);
    await fetch("/api/treinamentos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome: nomeTreinamento, turma: turmaTreinamento, instrutor_email: "Admin Local" })
    });
    
    setIsSubmitting(false);
    setIsModalOpen(false);
    setNomeTreinamento("");
    setTurmaTreinamento("");
    carregarTreinamentos();
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualId.trim() || !selectedId) return;
    if (!hasSignature) {
      alert("Por favor, colete a assinatura antes de confirmar.");
      return;
    }
    
    setIsManualSubmitting(true);
    const assinaturaBase64 = sigCanvas.current?.getCanvas().toDataURL("image/png");
    
    const res = await fetch("/api/presencas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        treinamentoId: selectedId, 
        identificador: manualId,
        assinaturaBase64 
      })
    });
    
    const json = await res.json();
    if (!json.success) {
      alert(json.error);
    } else {
      setManualId("");
      setIsManualModalOpen(false);
      setHasSignature(false);
      sigCanvas.current?.clear();
      carregarTreinamentos();
    }
    setIsManualSubmitting(false);
  };

  const excluirTreinamento = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Tem certeza que deseja excluir este treinamento permanentemente?")) return;
    
    await fetch(`/api/treinamentos?id=${id}`, { method: "DELETE" });
    if (selectedId === id) setSelectedId(null);
    carregarTreinamentos();
  };

  const exportarCSV = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(`/api/exportar?id=${id}`, '_blank');
  };

  const selectedTreinamento = treinamentos.find(t => t.id === selectedId);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Treinamentos</h2>
          <p className="text-slate-400 mt-2">Crie as sessões e exporte as presenças para o Excel.</p>
        </div>
        {!selectedTreinamento ? (
          <button 
            onClick={() => {
              const cursos = Array.from(new Set(treinamentos.map(t => t.nome))).filter(Boolean);
              if (cursos.length > 0) {
                setCreateMode('EXISTING');
                setNomeTreinamento(cursos[0] as string);
              } else {
                setCreateMode('NEW');
                setNomeTreinamento("");
              }
              setTurmaTreinamento("");
              setIsModalOpen(true);
            }}
            className="flex items-center space-x-2 px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-sky-600/30"
          >
            <FolderPlus className="h-4 w-4" />
            <span>+ Cadastrar Curso / Turma</span>
          </button>
        ) : (
          <button 
            onClick={() => setSelectedId(null)}
            className="flex items-center space-x-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors border border-slate-700"
          >
            <span className="font-bold">←</span>
            <span>Voltar para Lista</span>
          </button>
        )}
      </div>

      {!selectedTreinamento && (
        <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
          {loading ? (
            <div className="p-12 text-center bg-slate-800/50 rounded-xl border border-slate-700 text-slate-400">
              Carregando pastas de treinamento...
            </div>
          ) : treinamentos.length === 0 ? (
            <div className="p-12 text-center bg-slate-800/50 rounded-xl border border-slate-700 text-slate-400">
              Nenhum treinamento criado ainda. Clique em "Novo Treinamento" acima!
            </div>
          ) : (
            Object.entries(
              treinamentos.reduce((acc: { [key: string]: any[] }, curr: any) => {
                const nome = curr.nome || "Outros / Sem Nome";
                if (!acc[nome]) acc[nome] = [];
                acc[nome].push(curr);
                return acc;
              }, {})
            ).map(([nomeCurso, turmasList]) => {
              const isExpanded = expandedPastas.includes(nomeCurso);
              const totalPessoas = turmasList.reduce((sum, t) => sum + (t._count?.registros || 0), 0);

              return (
                <div key={nomeCurso} className="bg-slate-900/80 rounded-2xl border border-slate-700/80 overflow-hidden shadow-lg transition-all">
                  {/* Cabeçalho da Pasta (Acordeão) */}
                  <div 
                    onClick={() => {
                      if (isExpanded) {
                        setExpandedPastas(expandedPastas.filter(p => p !== nomeCurso));
                      } else {
                        setExpandedPastas([...expandedPastas, nomeCurso]);
                      }
                    }}
                    className="p-5 bg-slate-800/90 hover:bg-slate-800 cursor-pointer flex items-center justify-between transition-colors select-none border-b border-transparent hover:border-slate-700"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 shadow-inner">
                        {isExpanded ? <FolderOpen className="h-6 w-6" /> : <Folder className="h-6 w-6" />}
                      </div>
                      <div>
                        <h3 className="text-lg font-extrabold text-white tracking-wide flex items-center gap-2">
                          {nomeCurso}
                          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30">
                            {turmasList.length} {turmasList.length === 1 ? "turma" : "turmas"}
                          </span>
                        </h3>
                        <p className="text-xs text-slate-400 mt-1">
                          Total de {totalPessoas} presenças registradas nesta pasta
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCreateMode('EXISTING');
                          setNomeTreinamento(nomeCurso);
                          setTurmaTreinamento("");
                          setIsModalOpen(true);
                        }}
                        className="px-3 py-1.5 bg-sky-500/20 hover:bg-sky-500 text-sky-300 hover:text-white rounded-lg text-xs font-bold transition-all border border-sky-500/30 flex items-center gap-1.5 shadow-sm"
                        title="Adicionar nova turma dentro deste treinamento"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span className="hidden md:inline">Nova Turma aqui</span>
                      </button>
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider hidden sm:inline">
                        {isExpanded ? "Ocultar turmas" : "Ver turmas"}
                      </span>
                      <div className={`p-2 rounded-lg bg-slate-700/50 text-slate-300 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}>
                        <ChevronDown className="h-5 w-5" />
                      </div>
                    </div>
                  </div>

                  {/* Tabela Interna das Turmas daquela Pasta */}
                  {isExpanded && (
                    <div className="bg-slate-950/50 p-2 sm:p-4 border-t border-slate-700/60 animate-in slide-in-from-top-2 duration-200">
                      <table className="w-full text-left text-sm">
                        <thead className="text-xs uppercase text-slate-400 border-b border-slate-800">
                          <tr>
                            <th className="px-4 py-3 font-semibold">Turma / Identificador</th>
                            <th className="px-4 py-3 font-semibold">ID da Sessão</th>
                            <th className="px-4 py-3 font-semibold">Status</th>
                            <th className="px-4 py-3 font-semibold">Presenças</th>
                            <th className="px-4 py-3 font-semibold text-right">Ações</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 text-slate-300">
                          {turmasList.map(t => (
                            <tr 
                              key={t.id}
                              onClick={() => setSelectedId(t.id)}
                              className="transition-colors cursor-pointer hover:bg-slate-800/60 group"
                            >
                              <td className="px-4 py-3.5 font-bold text-white group-hover:text-sky-300 transition-colors">
                                {t.turma || "Turma Principal / Única"}
                              </td>
                              <td className="px-4 py-3.5 text-slate-400 font-mono text-xs">{t.id}</td>
                              <td className="px-4 py-3.5">
                                <span className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full text-xs font-medium bg-emerald-900/30 text-emerald-400 border border-emerald-800">
                                  <PlayCircle className="h-3 w-3" /> Ativo
                                </span>
                              </td>
                              <td className="px-4 py-3.5 font-bold text-sky-400">{t._count.registros} pessoas</td>
                              <td className="px-4 py-3.5 text-right flex items-center justify-end space-x-2" onClick={e => e.stopPropagation()}>
                                <button 
                                  onClick={(e) => exportarCSV(t.id, e)}
                                  className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-emerald-300 hover:text-white bg-emerald-900/30 hover:bg-emerald-800/50 rounded-lg transition-colors border border-emerald-800/50"
                                  title="Exportar para Excel (CSV)"
                                >
                                  <Download className="h-3.5 w-3.5" />
                                  <span>Excel</span>
                                </button>
                                <button 
                                  onClick={(e) => excluirTreinamento(t.id, e)}
                                  className="flex items-center p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
                                  title="Excluir Turma"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {selectedTreinamento && (
        <div className="space-y-6 animate-in slide-in-from-bottom-4">
          <div className="bg-slate-900/80 rounded-xl border border-slate-700 p-6 flex flex-col md:flex-row gap-8">
            <div className="flex-1 space-y-4">
              <div>
                <h3 className="text-xl font-bold text-white uppercase tracking-wider">{selectedTreinamento.nome}</h3>
                {selectedTreinamento.turma && (
                  <p className="text-sm font-black text-emerald-400 uppercase tracking-widest mt-1">{selectedTreinamento.turma}</p>
                )}
                <p className="text-slate-400 text-sm mt-1">Sessão em andamento. Instrua os colaboradores a registrarem presença.</p>
              </div>

              <div className="pt-4 flex flex-wrap items-center gap-4">
                <button 
                  onClick={() => setIsShareModalOpen(true)}
                  className="flex items-center space-x-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors shadow-lg shadow-blue-900/20"
                >
                  <UserPlus className="h-5 w-5" />
                  <span>Gerenciar Presenças</span>
                </button>

                <button 
                  onClick={() => {
                    const url = `${window.location.origin}/registrar/${selectedTreinamento.id}`;
                    navigator.clipboard.writeText(url);
                    alert('Link copiado: ' + url);
                  }}
                  className="flex items-center space-x-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-colors border border-slate-700"
                >
                  <LinkIcon className="h-5 w-5" />
                  <span>Copiar Link Externo</span>
                </button>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/80 rounded-xl border border-slate-700 p-6">
            <h3 className="font-bold text-white mb-4">Lista de Presenças ({presencas.length})</h3>
            
            {loadingPresencas ? (
              <p className="text-slate-400 text-sm py-4">Carregando presenças...</p>
            ) : presencas.length === 0 ? (
              <p className="text-slate-400 text-sm py-4">Nenhuma presença registrada ainda.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-slate-400 border-b border-slate-700/50">
                    <tr>
                      <th className="pb-3 font-medium">Matrícula / RUT</th>
                      <th className="pb-3 font-medium">Colaborador</th>
                      <th className="pb-3 font-medium hidden md:table-cell">Empresa</th>
                      <th className="pb-3 font-medium hidden md:table-cell">Modo</th>
                      <th className="pb-3 font-medium text-center">Assinatura</th>
                      <th className="pb-3 font-medium text-right">Data / Hora</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50 text-slate-300">
                    {presencas.map(p => (
                      <tr key={p.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 font-mono text-emerald-400">{p.identificador_lido}</td>
                        <td className="py-3">
                          <p className="font-bold text-white text-sm">{p.nome}</p>
                        </td>
                        <td className="py-3 hidden md:table-cell text-sm text-slate-300">
                          {p.planta}
                        </td>
                        <td className="py-3 hidden md:table-cell">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            p.modo_registro === 'MANUAL' ? 'bg-blue-900/40 text-blue-400' :
                            p.modo_registro === 'NFC' ? 'bg-purple-900/40 text-purple-400' :
                            p.modo_registro === 'QR_CODE' ? 'bg-amber-900/40 text-amber-400' :
                            'bg-slate-800 text-slate-300'
                          }`}>
                            {p.modo_registro}
                          </span>
                        </td>
                        <td className="py-3 text-center">
                          {p.assinaturaBase64 ? (
                            <button 
                              onClick={() => setSignatureView(p.assinaturaBase64)}
                              className="text-xs bg-blue-900/30 text-blue-400 hover:text-blue-300 px-2 py-1 rounded border border-blue-800 transition-colors"
                            >
                              Ver
                            </button>
                          ) : (
                            <span className="text-xs text-slate-600">-</span>
                          )}
                        </td>
                        <td className="py-3 text-right text-slate-500 text-sm font-medium">
                          {p.data_registro ? new Date(p.data_registro).toLocaleString('pt-BR', {day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute:'2-digit'}) : '--/--/---- --:--'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl p-6 sm:p-8 w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
                  <FolderPlus className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-white tracking-wide">Cadastrar Turma / Treinamento</h3>
                  <p className="text-xs text-slate-400">Organize em pastas ou crie um novo curso do zero</p>
                </div>
              </div>
            </div>
            
            {/* Seletor de Tipo (Curso Existente vs Novo Curso) */}
            <div className="flex bg-slate-950 p-1 rounded-xl mb-6 border border-slate-800">
              <button 
                type="button"
                onClick={() => {
                  setCreateMode('EXISTING');
                  const cursos = Array.from(new Set(treinamentos.map(t => t.nome))).filter(Boolean);
                  if (cursos.length > 0) setNomeTreinamento(cursos[0] as string);
                }}
                className={`flex-1 py-2.5 flex items-center justify-center gap-2 rounded-lg text-xs font-bold transition-all ${createMode === 'EXISTING' ? 'bg-sky-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
              >
                <Folder className="h-3.5 w-3.5" /> Pasta Existente
              </button>
              <button 
                type="button"
                onClick={() => {
                  setCreateMode('NEW');
                  setNomeTreinamento("");
                }}
                className={`flex-1 py-2.5 flex items-center justify-center gap-2 rounded-lg text-xs font-bold transition-all ${createMode === 'NEW' ? 'bg-sky-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
              >
                <Sparkles className="h-3.5 w-3.5" /> + Criar Novo Curso
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-5">
              {createMode === 'EXISTING' ? (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                    <span>Selecione a Pasta / Curso</span>
                    <span className="text-[10px] font-normal text-sky-400">Adicionando à pasta existente</span>
                  </label>
                  <div className="relative">
                    <select
                      value={nomeTreinamento}
                      onChange={e => setNomeTreinamento(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl focus:outline-none focus:border-sky-500 text-white font-medium appearance-none cursor-pointer pr-10 shadow-inner"
                    >
                      {Array.from(new Set(treinamentos.map(t => t.nome))).filter(Boolean).map((nome: any) => (
                        <option key={nome} value={nome} className="bg-slate-900 py-2 text-white">
                          📁 {nome}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                      <ChevronDown className="h-4 w-4" />
                    </div>
                  </div>
                  {Array.from(new Set(treinamentos.map(t => t.nome))).filter(Boolean).length === 0 && (
                    <p className="text-xs text-amber-400 mt-1">Nenhum curso cadastrado ainda. Clique na aba "+ Criar Novo Curso" acima!</p>
                  )}
                </div>
              ) : (
                <div className="space-y-2 animate-in fade-in zoom-in-95 duration-200">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                    <span>Nome do Novo Curso / Pasta</span>
                    <span className="text-[10px] font-normal text-emerald-400">Criando nova pasta</span>
                  </label>
                  <input 
                    type="text" 
                    required
                    autoFocus
                    value={nomeTreinamento}
                    onChange={e => setNomeTreinamento(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl focus:outline-none focus:border-sky-500 text-white font-medium placeholder:text-slate-600 shadow-inner"
                    placeholder="Ex: NR-10 Integração Elétrica"
                  />
                  <p className="text-[11px] text-slate-400">Este nome criará a pasta principal onde todas as turmas deste curso ficarão organizadas.</p>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                  <span>Nome / Código da Turma</span>
                  <span className="text-[10px] font-normal text-slate-400">Identificador da sessão</span>
                </label>
                <input 
                  type="text"
                  required
                  value={turmaTreinamento}
                  onChange={e => setTurmaTreinamento(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl focus:outline-none focus:border-sky-500 text-white font-medium placeholder:text-slate-600 shadow-inner"
                  placeholder="Ex: Turma A - Manhã (26/07), ou Turma 01"
                />
              </div>

              <div className="pt-4 flex items-center justify-end space-x-3 border-t border-slate-800/80 mt-6">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting || !nomeTreinamento.trim() || !turmaTreinamento.trim()}
                  className="px-6 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-sky-600/30 disabled:opacity-50 disabled:pointer-events-none flex items-center gap-2"
                >
                  <PlusCircle className="h-4 w-4" />
                  {isSubmitting ? 'Salvando...' : createMode === 'NEW' ? 'Cadastrar Novo Curso' : 'Adicionar Turma'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    {isManualModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 sm:p-8 w-full max-w-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <UserPlus className="h-6 w-6 text-blue-400" />
              Registro Manual
            </h3>
            
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">ID / Matrícula / CPF</label>
                <input 
                  type="text" 
                  required
                  autoFocus
                  value={manualId}
                  onChange={e => setManualId(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500 text-slate-200 font-mono"
                  placeholder="Digite para buscar automaticamente..."
                />
                
                {isSearchingId && (
                  <div className="text-xs text-blue-400 mt-2 animate-pulse">Buscando no banco de dados...</div>
                )}
                
                {/* Se há uma pessoa já selecionada, mostra em destaque */}
                {selectedColab && (
                  <div className="mt-3 p-3 bg-emerald-900/20 border border-emerald-900/50 rounded-lg animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-emerald-400 text-sm">{selectedColab.nome}</h4>
                        <p className="text-xs text-emerald-500 mt-1 font-mono">ID: {selectedColab.identificador}</p>
                      </div>
                      <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-1 bg-emerald-900/40 text-emerald-400 rounded-md">
                        {selectedColab.planta}
                      </span>
                    </div>
                    <button type="button" onClick={() => { setSelectedColab(null); setManualId(""); setColabResults([]); }} className="text-xs text-slate-400 mt-3 hover:text-white underline">Limpar Seleção</button>
                  </div>
                )}

                {/* Lista de resultados quando há mais de 1 ou quando ainda não selecionou */}
                {!selectedColab && colabResults.length > 0 && !isSearchingId && (
                  <div className="mt-3 max-h-48 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                    {colabResults.map((colab, i) => (
                      <div 
                        key={i} 
                        onClick={() => { setSelectedColab(colab); setManualId(colab.identificador); }}
                        className="p-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg cursor-pointer transition-colors"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-bold text-white text-sm">{colab.nome}</h4>
                            <p className="text-xs text-slate-400 mt-0.5"><span className="font-mono">{colab.identificador}</span></p>
                          </div>
                          <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-1 bg-slate-900 text-slate-300 rounded-md">
                            {colab.planta}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {colabResults.length === 0 && !isSearchingId && manualId.length >= 3 && !selectedColab && (
                  <div className="text-xs text-amber-500/70 mt-2">
                    Nenhum colaborador encontrado com esta chave, mas você ainda pode forçar o registro.
                  </div>
                )}
              </div>

              {/* Assinatura */}
              <div className="mt-4 bg-slate-950/80 border border-slate-700 rounded-xl p-4 animate-in fade-in zoom-in-95 shadow-lg">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm font-bold text-slate-200 flex items-center gap-2">
                    <PenTool className="h-4 w-4 text-sky-400" />
                    Assinatura do Colaborador (Faça no quadro abaixo)
                  </span>
                  <button 
                    type="button" 
                    onClick={() => { sigCanvas.current?.clear(); setHasSignature(false); }}
                    className="px-2.5 py-1 text-xs font-semibold text-red-400 hover:text-white bg-red-950/40 hover:bg-red-900/60 rounded-lg border border-red-900/50 transition-colors"
                  >
                    Limpar Assinatura
                  </button>
                </div>
                <div className="bg-slate-900 rounded-xl overflow-hidden border-2 border-slate-600/80 shadow-inner">
                  <SignatureCanvas 
                    ref={sigCanvas} 
                    penColor="white"
                    canvasProps={{className: 'w-full h-64 cursor-crosshair'}}
                    onEnd={() => setHasSignature(true)}
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end space-x-3">
                <button 
                  type="button"
                  onClick={() => setIsManualModalOpen(false)}
                  className="px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={isManualSubmitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {isManualSubmitting ? 'Registrando...' : 'Confirmar Presença'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isShareModalOpen && selectedTreinamento && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-200 flex flex-col md:flex-row gap-6">
            <div className="flex-1 space-y-4 flex flex-col">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <UserPlus className="h-6 w-6 text-blue-400" />
                Opções de Presença
              </h3>
              
              <div className="flex flex-col gap-3 flex-1 mt-4">
                <button 
                  onClick={() => { setIsShareModalOpen(false); setIsManualModalOpen(true); }}
                  className="flex items-center gap-4 p-4 bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 transition-colors text-left"
                >
                  <div className="bg-blue-900/30 p-2 rounded-lg"><UserPlus className="h-5 w-5 text-blue-400" /></div>
                  <div>
                    <h4 className="font-bold text-slate-200">Registro Manual</h4>
                    <p className="text-xs text-slate-400">Buscar pelo nome ou matrícula do aluno</p>
                  </div>
                </button>

                <a 
                  href={`/registrar/${selectedTreinamento.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 p-4 bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 transition-colors text-left"
                >
                  <div className="bg-emerald-900/30 p-2 rounded-lg"><ScanLine className="h-5 w-5 text-emerald-400" /></div>
                  <div>
                    <h4 className="font-bold text-slate-200">Abrir Auto-Registro</h4>
                    <p className="text-xs text-slate-400">Abre a página em uma nova aba no seu PC</p>
                  </div>
                </a>
              </div>

              <button 
                onClick={() => setIsShareModalOpen(false)}
                className="mt-auto w-full py-3 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors font-medium"
              >
                Fechar
              </button>
            </div>

            <div className="w-full md:w-64 bg-slate-950 rounded-xl border border-slate-800 p-6 flex flex-col items-center justify-center text-center">
              <h4 className="font-bold text-emerald-400 mb-2">QR Code da Sessão</h4>
              <p className="text-xs text-slate-400 mb-4">Peça aos alunos para escanearem a tela</p>
              
              <div className="bg-white p-3 rounded-lg shadow-inner">
                {/* QR Code com a URL real do ambiente (Netlify) */}
                <QRCodeSVG value={`${typeof window !== 'undefined' ? window.location.origin : ''}/registrar/${selectedTreinamento.id}`} size={150} level="H" />
              </div>
              
              <div className="mt-4 bg-amber-900/20 border border-amber-900/50 rounded-lg p-3 text-[10px] text-amber-200/80 text-left">
                <strong className="block text-amber-400 mb-1">Instrutor (Smartphone):</strong>
                O app de celular fará a leitura de crachás NFC automaticamente ao escanear este QR Code.
              </div>
            </div>
          </div>
        </div>
      )}
      {signatureView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 p-6 flex flex-col items-center">
            <h3 className="text-lg font-bold text-white mb-4">Assinatura do Colaborador</h3>
            <div className="bg-slate-800 border border-slate-600 rounded-lg p-2 mb-6 w-full">
              <img src={signatureView} alt="Assinatura" className="w-full h-auto" />
            </div>
            <button 
              onClick={() => setSignatureView(null)}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
