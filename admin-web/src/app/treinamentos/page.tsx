"use client";
import { useState, useEffect, useRef } from "react";
import ConfirmModal from '@/components/ConfirmModal';
import toast from 'react-hot-toast';
import { Plus, Download, CheckCircle2, PlayCircle, Smartphone, ScanLine, QrCode, Trash2, UserPlus, PenTool, Link as LinkIcon, Folder, FolderOpen, ChevronDown, FolderPlus, Sparkles, PlusCircle, Target, Clock, ListChecks, X, FileText } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import SignatureCanvas from "react-signature-canvas";

export default function Treinamentos() {
  const [treinamentos, setTreinamentos] = useState<any[]>([]);
  const [confirmModal, setConfirmModal] = useState<{isOpen: boolean, title: string, message: string, onConfirm: () => void, variant: 'danger'|'warning'}>({isOpen: false, title: '', message: '', onConfirm: () => {}, variant: 'danger'});
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expandedPastas, setExpandedPastas] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [nomeTreinamento, setNomeTreinamento] = useState("");
  const [turmaTreinamento, setTurmaTreinamento] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createMode, setCreateMode] = useState<'EXISTING' | 'NEW'>('EXISTING');
  const [createPais, setCreatePais] = useState<'BRASIL' | 'CHILE'>('BRASIL');
  const [createPlanta, setCreatePlanta] = useState("GUAÍBA (RAINBOW)");
  const [filterPais, setFilterPais] = useState<'TODOS' | 'BRASIL' | 'CHILE'>('TODOS');
  const [empresasDict, setEmpresasDict] = useState<{ brasil: string[], chile: string[], todas: string[] }>({ brasil: [], chile: [], todas: [] });
  const [nomeAvulso, setNomeAvulso] = useState("");
  const [empresaAvulsa, setEmpresaAvulsa] = useState("");
  const [publicosAlvo, setPublicosAlvo] = useState<any[]>([]);
  const [createPublicoAlvoId, setCreatePublicoAlvoId] = useState("");
  const [showPending, setShowPending] = useState(false);

  // States para assinatura manual
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [manualId, setManualId] = useState("");
  const [isManualSubmitting, setIsManualSubmitting] = useState(false);
  const [colabResults, setColabResults] = useState<any[]>([]);
  const [selectedColab, setSelectedColab] = useState<any>(null);
  const [isSearchingId, setIsSearchingId] = useState(false);
  const [userRole, setUserRole] = useState("admin");
  
  // Signature
  const sigCanvas = useRef<any>(null);
  const [hasSignature, setHasSignature] = useState(false);
  const [signatureView, setSignatureView] = useState<string | null>(null);

  // States para a lista de presenças
  const [presencas, setPresencas] = useState<any[]>([]);
  const [loadingPresencas, setLoadingPresencas] = useState(false);

  // States para Checklist
  const [isChecklistModalOpen, setIsChecklistModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [checklist, setChecklist] = useState<any[]>([]);
  const [selectedPresencas, setSelectedPresencas] = useState<string[]>([]);
  const [isRolesModalOpen, setIsRolesModalOpen] = useState(false);
  const [rolesDisponiveis, setRolesDisponiveis] = useState<string[]>([]);
  const [novoRol, setNovoRol] = useState("");
  const [selectedRoleToAssign, setSelectedRoleToAssign] = useState("");
  const [checklistTemplates, setChecklistTemplates] = useState<any[]>([]);
  const [createChecklistId, setCreateChecklistId] = useState("");
  const [assignChecklistId, setAssignChecklistId] = useState("");

  useEffect(() => {
    carregarTreinamentos();
    fetch("/api/auth").then(res => res.json()).then(json => {
      if (json.success && json.session) {
        setUserRole(json.session.role || "leitor");
      }
    }).catch(() => {});
    fetch("/api/empresas").then(res => res.json()).then(json => {
      if (json.success) {
        setEmpresasDict({
          brasil: json.brasil || json.data || [],
          chile: json.chile || json.data || [],
          todas: json.data || []
        });
      }
    }).catch(() => {});
    fetch("/api/publicos-alvo").then(res => res.json()).then(json => {
      if (json.success) setPublicosAlvo(json.data);
    }).catch(() => {});
    fetch("/api/checklists").then(res => res.json()).then(json => {
      if (json.success) setChecklistTemplates(json.data);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (selectedId) {
      const tr = treinamentos.find(t => t.id === selectedId);
      if (tr && tr.checklist_dinamico) {
        setChecklist(tr.checklist_dinamico);
      } else {
        setChecklist([]);
      }
      if (tr && tr.roles_disponiveis) {
        setRolesDisponiveis(tr.roles_disponiveis);
      } else {
        setRolesDisponiveis([]);
      }
      setSelectedPresencas([]);
      setSelectedRoleToAssign("");
      carregarPresencas(selectedId);
      const interval = setInterval(() => {
        carregarPresencas(selectedId, true);
        carregarTreinamentos();
      }, 4000);
      return () => clearInterval(interval);
    } else {
      setPresencas([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
          // Auto-seleciona se for o único resultado e for ID/RUT (contém número)
          if (json.data.length === 1 && /\d/.test(manualId)) {
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

  const handleAddRol = () => {
    if (!novoRol.trim()) return;
    const formatado = novoRol.trim().toUpperCase();
    if (!rolesDisponiveis.includes(formatado)) {
      setRolesDisponiveis([...rolesDisponiveis, formatado]);
    }
    setNovoRol("");
  };

  const handleRemoveRol = (rol: string) => {
    setRolesDisponiveis(rolesDisponiveis.filter(r => r !== rol));
  };

  const handleSalvarRoles = async () => {
    if (!selectedId) return;
    setIsSubmitting(true);
    try {
      await fetch(`/api/treinamentos/${selectedId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roles_disponiveis: rolesDisponiveis })
      });
      setTreinamentos(prev => prev.map(t => t.id === selectedId ? { ...t, roles_disponiveis: rolesDisponiveis } : t));
      carregarTreinamentos();
      toast.success("Roles configurados com sucesso!");
      setIsRolesModalOpen(false);
    } catch(e) {
      toast.error("Erro ao salvar roles.");
    }
    setIsSubmitting(false);
  };

  const togglePresencaSelection = (id: string) => {
    setSelectedPresencas(prev => 
      prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]
    );
  };

  const toggleAllPresencas = () => {
    if (selectedPresencas.length === presencas.length && presencas.length > 0) {
      setSelectedPresencas([]);
    } else {
      setSelectedPresencas(presencas.map(p => p.id));
    }
  };

  const handleAssignRoleBatch = async () => {
    if (!selectedId || selectedPresencas.length === 0 || !selectedRoleToAssign) return;
    try {
      const res = await fetch(`/api/presencas/batch`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          treinamentoId: selectedId,
          presencasIds: selectedPresencas,
          rol: selectedRoleToAssign
        })
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`${selectedPresencas.length} roles atualizados!`);
        setSelectedPresencas([]);
        setSelectedRoleToAssign("");
        carregarPresencas(selectedId);
      } else {
        toast.error(json.error || "Erro ao atribuir roles.");
      }
    } catch(e) {
      toast.error("Erro de conexão.");
    }
  };

  const carregarPresencas = async (id: string, silent = false) => {
    if (!silent) setLoadingPresencas(true);
    try {
      const res = await fetch(`/api/presencas?treinamentoId=${id}`);
      const json = await res.json();
      if (json.success) setPresencas(json.data);
    } catch (e) {}
    if (!silent) setLoadingPresencas(false);
  };

  const handleSalvarChecklist = async () => {
    if (!selectedId) return;
    setIsSubmitting(true);
    try {
      await fetch(`/api/treinamentos/${selectedId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checklist_dinamico: checklist })
      });
      setTreinamentos(prev => prev.map(t => t.id === selectedId ? { ...t, checklist_dinamico: checklist } : t));
      carregarTreinamentos();
      setIsChecklistModalOpen(false);
    } catch(e) {}
    setIsSubmitting(false);
  };

  const handleAssignChecklistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId || !assignChecklistId) return;
    
    setIsSubmitting(true);
    try {
      const template = checklistTemplates.find(t => t.id === assignChecklistId);
      if (template && template.items) {
        const checklist_dinamico = template.items.map((item: any) => ({
          ...item,
          checado: false
        }));

        await fetch(`/api/treinamentos/${selectedId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ checklist_dinamico })
        });
        
        setChecklist(checklist_dinamico);
        setTreinamentos(prev => prev.map(t => t.id === selectedId ? { ...t, checklist_dinamico } : t));
        carregarTreinamentos();
      }
      setIsAssignModalOpen(false);
      setAssignChecklistId("");
    } catch(e) {}
    setIsSubmitting(false);
  };

  const carregarTreinamentos = async () => {
    const res = await fetch(`/api/treinamentos?t=${Date.now()}`);
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
      body: JSON.stringify({ 
        nome: nomeTreinamento, 
        turma: turmaTreinamento, 
        pais: createPais, 
        planta: createPlanta, 
        instrutor_email: "Admin Local",
        publico_alvo_id: createPublicoAlvoId || undefined,
        checklistTemplateId: createChecklistId || undefined
      })
    });
    
    setIsSubmitting(false);
    setIsModalOpen(false);
    setNomeTreinamento("");
    setTurmaTreinamento("");
    setCreatePublicoAlvoId("");
    setCreateChecklistId("");
    carregarTreinamentos();
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualId.trim() || !selectedId) return;
    if (!hasSignature) {
      toast.error("Por favor, colete a assinatura antes de confirmar.");
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
        assinaturaBase64,
        nome: nomeAvulso.trim() || undefined,
        empresa: empresaAvulsa.trim() || undefined
      })
    });
    
    const json = await res.json();
    if (!json.success) {
      toast.error(json.error);
    } else {
      setManualId("");
      setNomeAvulso("");
      setEmpresaAvulsa("");
      setIsManualModalOpen(false);
      setHasSignature(false);
      sigCanvas.current?.clear();
      carregarTreinamentos();
    }
    setIsManualSubmitting(false);
  };

  const excluirPresenca = async (presencaId: string) => {
    if (!selectedId) return;
    setConfirmModal({
      isOpen: true,
      title: "Remover Presença",
      message: "Tem certeza que deseja remover esta presença permanentemente?",
      variant: "danger",
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        
    
    try {
      const res = await fetch(`/api/presencas?treinamentoId=${selectedId}&presencaId=${presencaId}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) toast.error(json.error || "Erro ao excluir presença.");
      carregarPresencas(selectedId);
      carregarTreinamentos();
    } catch (e) {
      toast.error("Erro ao excluir.");
    }
      }
    });
  };

  const excluirTreinamento = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmModal({
      isOpen: true,
      title: "Excluir Turma",
      message: "Tem certeza que deseja excluir esta turma permanentemente?",
      variant: "danger",
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        
    
    const res = await fetch(`/api/treinamentos?id=${id}`, { method: "DELETE" });
    const json = await res.json();
    if (!json.success) toast.error(json.error || "Erro ao excluir turma.");
    if (selectedId === id) setSelectedId(null);
    carregarTreinamentos();
      }
    });
  };

  const excluirPasta = async (nomeCurso: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmModal({
      isOpen: true,
      title: "Excluir Curso Inteiro",
      message: `ATENÇÃO: Tem certeza que deseja excluir TODO o curso '${nomeCurso}' e TODAS as suas turmas permanentemente?`,
      variant: "danger",
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        
    
    const res = await fetch(`/api/treinamentos?nome=${encodeURIComponent(nomeCurso)}`, { method: "DELETE" });
    const json = await res.json();
    if (!json.success) toast.error(json.error || "Erro ao excluir curso.");
    setSelectedId(null);
    carregarTreinamentos();
      }
    });
  };

  const exportarCSV = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(`/api/exportar?id=${id}`, '_blank');
  };

  const exportarAderenciaCSV = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(`/api/exportar/aderencia?id=${id}`, '_blank');
  };

  const exportarAderenciaPDF = async (id: string, nomeTreinamento: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const loadingToast = toast.loading("Gerando PDF...");
    try {
      const { jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");
      
      const res = await fetch(`/api/exportar/aderencia?id=${id}&formato=json`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Erro ao buscar dados");

      const doc = new jsPDF("landscape");
      
      // Cabeçalho
      doc.setFontSize(18);
      doc.text("Relatório de Aderência", 14, 22);
      doc.setFontSize(11);
      doc.setTextColor(100);
      doc.text(`Treinamento: ${nomeTreinamento}`, 14, 30);
      doc.text(`Data de Emissão: ${new Date().toLocaleDateString('pt-BR')}`, 14, 36);

      const tableData = json.data.map((r: any) => [
        r.nomeColaborador,
        r.matricula,
        r.cargo,
        r.planta,
        r.empresa,
        r.rol,
        r.status,
        r.dataPresenca ? new Date(r.dataPresenca).toLocaleString('pt-BR') : "-"
      ]);

      autoTable(doc, {
        startY: 45,
        head: [['Nome', 'Matrícula', 'Cargo', 'Planta', 'Empresa', 'Papel', 'Status', 'Data Presença']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185], textColor: 255, fontSize: 9 },
        bodyStyles: { fontSize: 8 },
        didParseCell: function(data) {
          if (data.section === 'body' && data.column.index === 6) {
            if (data.cell.raw === 'CAPACITADO') {
              data.cell.styles.textColor = [39, 174, 96]; // Verde
              data.cell.styles.fontStyle = 'bold';
            } else if (data.cell.raw === 'FALTANTE / PENDENTE') {
              data.cell.styles.textColor = [192, 57, 43]; // Vermelho
              data.cell.styles.fontStyle = 'bold';
            } else if (data.cell.raw === 'CAPACITADO (EXTRA)') {
              data.cell.styles.textColor = [243, 156, 18]; // Laranja
              data.cell.styles.fontStyle = 'bold';
            }
          }
        }
      });

      doc.save(`aderencia_${nomeTreinamento.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`);
      toast.success("PDF gerado com sucesso!", { id: loadingToast });
    } catch(err) {
      toast.error("Erro ao gerar PDF de aderência", { id: loadingToast });
    }
  };

  const selectedTreinamento = treinamentos.find(t => t.id === selectedId);

  const renderProgress = () => {
    if (!selectedTreinamento?.publico_alvo_id) return null;
    const publico = publicosAlvo.find(p => p.id === selectedTreinamento.publico_alvo_id);
    if (!publico || !publico.matriculas) return null;
    
    const presencasMatriculas = presencas.map(p => p.identificador_lido);
    
    const checkIsPresente = (m: string) => {
      const det = publico.matriculas_detalhes?.find((d:any) => d._id === m);
      return presencasMatriculas.some(p => {
        const cleanP = String(p).replace(/^0+/, '');
        const id1 = String(m).replace(/^0+/, '');
        const id2 = det ? String(det.identificador || '').replace(/^0+/, '') : '';
        const id3 = det ? String(det.cod_cracha || '').replace(/^0+/, '') : '';
        return (cleanP && cleanP === id1) || 
               (cleanP && id1 && cleanP.endsWith(id1)) || 
               (id1 && cleanP && id1.endsWith(cleanP)) ||
               (id2 && cleanP === id2) || 
               (id3 && cleanP === id3);
      });
    };

    const pendentes = publico.matriculas.filter((m: string) => !checkIsPresente(m));
    const capacitados = publico.matriculas.filter((m: string) => checkIsPresente(m));
    const total = publico.matriculas.length;
    const progresso = total > 0 ? Math.round((capacitados.length / total) * 100) : 0;
    
    return (
      <div className="w-full md:w-96 bg-slate-950/50 rounded-xl border border-slate-700 p-5 flex flex-col">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Target className="h-4 w-4 text-blue-400" />
              Progresso do Público-Alvo
            </h4>
            <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider">{publico.nome}</p>
          </div>
          <span className="text-2xl font-black text-white">{progresso}%</span>
        </div>
        
        <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden mb-4">
          <div 
            className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 transition-all duration-1000"
            style={{ width: `${progresso}%` }}
          />
        </div>
        
        <div className="flex justify-between text-xs font-medium mb-4">
          <span className="text-emerald-400 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> {capacitados.length} Capacitados</span>
          <span className="text-amber-400 flex items-center gap-1"><Clock className="h-3 w-3" /> {pendentes.length} Pendentes</span>
        </div>
        
        <button 
          onClick={() => setShowPending(!showPending)}
          className="mt-auto w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-lg transition-colors border border-slate-700"
        >
          {showPending ? 'Ocultar Lista de Participantes' : 'Ver Lista de Participantes'}
        </button>

        {showPending && publico.matriculas_detalhes && (
          <div className="mt-4 max-h-60 overflow-y-auto pr-2 space-y-2 scrollbar-thin scrollbar-thumb-slate-700">
            {publico.matriculas_detalhes.map((detalhe: any) => {
              const isCapacitado = checkIsPresente(detalhe._id);
              return (
                <div key={detalhe._id} className="flex justify-between items-center p-2 bg-slate-900 rounded-lg border border-slate-800">
                  <div className="flex flex-col overflow-hidden pr-2">
                    <span className="text-[11px] font-bold text-white truncate">{detalhe.nome}</span>
                    {detalhe.rol && <span className="text-[9px] text-emerald-400 font-bold truncate uppercase">{detalhe.rol}</span>}
                    <span className="text-[9px] text-slate-500 font-mono">{detalhe._id}</span>
                  </div>
                  {isCapacitado ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  ) : (
                    <Clock className="h-4 w-4 text-slate-600 shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

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
          {/* Filtro por País (Brasil vs Chile) */}
          <div className="flex flex-wrap items-center gap-2 bg-slate-900/90 p-1.5 rounded-xl border border-slate-800 w-fit shadow-md">
            <button
              onClick={() => setFilterPais('TODOS')}
              className={`px-3.5 py-2 rounded-lg text-xs font-extrabold transition-all ${filterPais === 'TODOS' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
            >
              🌐 Todos os Países
            </button>
            <button
              onClick={() => setFilterPais('BRASIL')}
              className={`px-3.5 py-2 rounded-lg text-xs font-extrabold transition-all flex items-center gap-1.5 ${filterPais === 'BRASIL' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
            >
              <span>🇧🇷</span> Brasil (Rainbow / Guaíba)
            </button>
            <button
              onClick={() => setFilterPais('CHILE')}
              className={`px-3.5 py-2 rounded-lg text-xs font-extrabold transition-all flex items-center gap-1.5 ${filterPais === 'CHILE' ? 'bg-red-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
            >
              <span>🇨🇱</span> Chile (SAT / Laja / Pacífico)
            </button>
          </div>

          {loading ? (
            <div className="p-12 text-center bg-slate-800/50 rounded-xl border border-slate-700 text-slate-400">
              Carregando pastas de treinamento...
            </div>
          ) : treinamentos.filter(t => filterPais === 'TODOS' || t.pais === filterPais).length === 0 ? (
            <div className="p-12 text-center bg-slate-800/50 rounded-xl border border-slate-700 text-slate-400">
              Nenhum treinamento encontrado para este filtro.
            </div>
          ) : (
            Object.entries(
              treinamentos
                .filter(t => filterPais === 'TODOS' || t.pais === filterPais)
                .reduce((acc: { [key: string]: any[] }, curr: any) => {
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
                          <span>{turmasList[0]?.pais === 'CHILE' ? '🇨🇱' : '🇧🇷'}</span>
                          <span>{nomeCurso}</span>
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
                      {userRole === 'admin' && (
                        <button 
                          type="button"
                          onClick={(e) => excluirPasta(nomeCurso, e)}
                          className="p-2 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white rounded-lg transition-all border border-red-500/30 flex items-center justify-center shadow-sm"
                          title={`Excluir curso completo (${nomeCurso}) e todas as turmas`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
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
                            <th className="px-4 py-3 font-semibold">Checklist</th>
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
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span>{t.turma || "Turma Principal / Única"}</span>
                                  <span className="text-[10px] font-mono font-normal px-2 py-0.5 rounded bg-slate-800 text-sky-400 border border-slate-700">
                                    🏢 {t.planta || (t.pais === 'CHILE' ? 'CHILE (SAT)' : 'GUAÍBA (RAINBOW)')}
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-3.5 text-slate-400 font-mono text-xs">{t.id}</td>
                              <td className="px-4 py-3.5">
                                <span className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full text-xs font-medium bg-emerald-900/30 text-emerald-400 border border-emerald-800">
                                  <PlayCircle className="h-3 w-3" /> Ativo
                                </span>
                              </td>
                              <td className="px-4 py-3.5">
                                {t.checklist_dinamico && t.checklist_dinamico.length > 0 ? (
                                  t.checklist_dinamico.every((item: any) => item.checado) ? (
                                    <span className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full text-xs font-medium bg-emerald-900/30 text-emerald-400 border border-emerald-800" title="Checklist concluído">
                                      <CheckCircle2 className="h-3 w-3" /> Realizado
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full text-xs font-medium bg-amber-900/30 text-amber-400 border border-amber-800" title={`${t.checklist_dinamico.filter((i:any)=>i.checado).length} de ${t.checklist_dinamico.length} itens concluídos`}>
                                      <Clock className="h-3 w-3" /> Pendente
                                    </span>
                                  )
                                ) : (
                                  <span className="text-slate-600 text-xs">-</span>
                                )}
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
                                {t.publico_alvo_id && (
                                  <>
                                    <button 
                                      onClick={(e) => exportarAderenciaCSV(t.id, e)}
                                      className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-amber-300 hover:text-white bg-amber-900/30 hover:bg-amber-800/50 rounded-lg transition-colors border border-amber-800/50"
                                      title="Relatório de Aderência (Excel)"
                                    >
                                      <Target className="h-3.5 w-3.5" />
                                      <span className="hidden sm:inline">Aderência CSV</span>
                                    </button>
                                    <button 
                                      onClick={(e) => exportarAderenciaPDF(t.id, t.nome, e)}
                                      className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-rose-300 hover:text-white bg-rose-900/30 hover:bg-rose-800/50 rounded-lg transition-colors border border-rose-800/50"
                                      title="Relatório de Aderência (PDF)"
                                    >
                                      <FileText className="h-3.5 w-3.5" />
                                      <span className="hidden sm:inline">Aderência PDF</span>
                                    </button>
                                  </>
                                )}
                                {userRole === 'admin' && (
                                  <button 
                                    onClick={(e) => excluirTreinamento(t.id, e)}
                                    className="flex items-center p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
                                    title="Excluir Turma (Apenas Admin)"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                )}
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
                  <span>Compartilhar / QR Code</span>
                </button>

                {checklist && checklist.length > 0 ? (
                  <button 
                    onClick={() => setIsChecklistModalOpen(true)}
                    className="flex items-center space-x-2 px-6 py-3 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 border border-emerald-600/50 rounded-xl font-bold transition-colors shadow-lg shadow-emerald-900/10"
                  >
                    <CheckCircle2 className="h-5 w-5" />
                    <span>Checklist do Instrutor</span>
                  </button>
                ) : (
                  <button 
                    onClick={() => setIsAssignModalOpen(true)}
                    className="flex items-center space-x-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600 rounded-xl font-bold transition-colors shadow-lg shadow-slate-900/10"
                  >
                    <PlusCircle className="h-5 w-5" />
                    <span>Atribuir Checklist</span>
                  </button>
                )}
                
                <button 
                  onClick={() => setIsRolesModalOpen(true)}
                  className="flex items-center space-x-2 px-6 py-3 bg-indigo-900/40 hover:bg-indigo-800/60 text-indigo-300 border border-indigo-700/50 rounded-xl font-bold transition-colors shadow-lg shadow-indigo-900/10"
                >
                  <PlusCircle className="h-5 w-5" />
                  <span>Configurar Roles</span>
                </button>
              </div>
            </div>
            
            {renderProgress()}
          </div>
          
          {showPending && selectedTreinamento?.publico_alvo_id && (
            <div className="bg-slate-900/80 rounded-xl border border-amber-900/50 p-6 animate-in slide-in-from-top-4">
              <h3 className="font-bold text-amber-400 text-lg mb-4 flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Matrículas Pendentes de Capacitação
              </h3>
              <div className="flex flex-wrap gap-2">
                {publicosAlvo.find(p => p.id === selectedTreinamento.publico_alvo_id)?.matriculas
                  .filter((m: string) => {
                     const publico = publicosAlvo.find(p => p.id === selectedTreinamento.publico_alvo_id);
                     const det = publico?.matriculas_detalhes?.find((d:any) => d._id === m);
                     const presencasMatriculas = presencas.map(p => p.identificador_lido);
                     return !presencasMatriculas.some(p => {
                       const cleanP = String(p).replace(/^0+/, '');
                       const id1 = String(m).replace(/^0+/, '');
                       const id2 = det ? String(det.identificador || '').replace(/^0+/, '') : '';
                       const id3 = det ? String(det.cod_cracha || '').replace(/^0+/, '') : '';
                       return (cleanP && cleanP === id1) || 
                              (cleanP && id1 && cleanP.endsWith(id1)) || 
                              (id1 && cleanP && id1.endsWith(cleanP)) ||
                              (id2 && cleanP === id2) || 
                              (id3 && cleanP === id3);
                     });
                  })
                  .map((m: string) => (
                  <span key={m} className="px-3 py-1 bg-amber-950/40 border border-amber-900/50 text-amber-300 rounded-lg text-sm font-mono">
                    {m}
                  </span>
                ))}
                {publicosAlvo.find(p => p.id === selectedTreinamento.publico_alvo_id)?.matriculas
                  .filter((m: string) => {
                     const publico = publicosAlvo.find(p => p.id === selectedTreinamento.publico_alvo_id);
                     const det = publico?.matriculas_detalhes?.find((d:any) => d._id === m);
                     const presencasMatriculas = presencas.map(p => p.identificador_lido);
                     return !presencasMatriculas.some(p => {
                       const cleanP = String(p).replace(/^0+/, '');
                       const id1 = String(m).replace(/^0+/, '');
                       const id2 = det ? String(det.identificador || '').replace(/^0+/, '') : '';
                       const id3 = det ? String(det.cod_cracha || '').replace(/^0+/, '') : '';
                       return (cleanP && cleanP === id1) || 
                              (cleanP && id1 && cleanP.endsWith(id1)) || 
                              (id1 && cleanP && id1.endsWith(cleanP)) ||
                              (id2 && cleanP === id2) || 
                              (id3 && cleanP === id3);
                     });
                  }).length === 0 && (
                  <span className="text-emerald-400 text-sm font-bold flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" /> Todos os convocados foram capacitados!
                  </span>
                )}
              </div>
            </div>
          )}


            <div className="bg-slate-900/80 rounded-xl border border-slate-700 p-6">
              <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <h3 className="font-bold text-white text-lg">Lista de Presenças ({presencas.length})</h3>
                <span className="flex items-center gap-1 text-[10px] bg-emerald-950 text-emerald-400 font-bold px-2.5 py-0.5 rounded-full border border-emerald-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-ping"></span> Ao vivo
                </span>
              </div>
              <button 
                onClick={() => { carregarPresencas(selectedTreinamento.id); carregarTreinamentos(); }}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-bold transition-all border border-slate-700 flex items-center gap-1.5 shadow-sm"
                title="Forçar atualização da lista agora"
              >
                🔄 Atualizar Agora
              </button>
            </div>
            
            {loadingPresencas ? (
              <p className="text-slate-400 text-sm py-4">Carregando presenças...</p>
            ) : presencas.length === 0 ? (
              <p className="text-slate-400 text-sm py-4">Nenhuma presença registrada ainda.</p>
            ) : (
              <div className="overflow-x-auto space-y-4">
                
                {selectedPresencas.length > 0 && rolesDisponiveis.length > 0 && (
                  <div className="flex items-center gap-4 bg-indigo-950/30 border border-indigo-900/50 p-3 rounded-xl animate-in fade-in slide-in-from-top-2">
                    <span className="text-indigo-300 font-bold text-sm px-2">
                      {selectedPresencas.length} selecionado(s)
                    </span>
                    <select
                      value={selectedRoleToAssign}
                      onChange={(e) => setSelectedRoleToAssign(e.target.value)}
                      className="bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-1.5 text-sm outline-none focus:border-indigo-500"
                    >
                      <option value="">Selecione um Rol...</option>
                      {rolesDisponiveis.map(rol => (
                        <option key={rol} value={rol}>{rol}</option>
                      ))}
                    </select>
                    <button
                      onClick={handleAssignRoleBatch}
                      disabled={!selectedRoleToAssign || isSubmitting}
                      className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold rounded-lg transition-colors"
                    >
                      Atribuir Rol
                    </button>
                  </div>
                )}

                <table className="w-full text-left text-sm">
                  <thead className="text-slate-400 border-b border-slate-700/50">
                    <tr>
                      {userRole === 'admin' && (
                        <th className="px-4 pb-3 font-medium w-10">
                          <input 
                            type="checkbox" 
                            checked={selectedPresencas.length === presencas.length && presencas.length > 0}
                            onChange={toggleAllPresencas}
                            className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-slate-900"
                          />
                        </th>
                      )}
                      <th className="px-4 pb-3 font-medium">Matrícula / RUT</th>
                      <th className="px-4 pb-3 font-medium">Colaborador</th>
                      <th className="px-4 pb-3 font-medium hidden md:table-cell">Empresa</th>
                      <th className="px-4 pb-3 font-medium hidden md:table-cell">Modo</th>
                      <th className="px-4 pb-3 font-medium text-center">Assinatura</th>
                      <th className="px-4 pb-3 font-medium text-right">Data / Hora</th>
                      {userRole === 'admin' && <th className="px-4 pb-3 font-medium text-right">Ações</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50 text-slate-300">
                    {presencas.map(p => (
                      <tr key={p.id} className={`hover:bg-slate-800/30 transition-colors ${selectedPresencas.includes(p.id) ? 'bg-indigo-900/20' : ''}`}>
                        {userRole === 'admin' && (
                          <td className="px-4 py-3">
                            <input 
                              type="checkbox"
                              checked={selectedPresencas.includes(p.id)}
                              onChange={() => togglePresencaSelection(p.id)}
                              className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-slate-900"
                            />
                          </td>
                        )}
                        <td className="px-4 py-3 font-mono text-emerald-400">{p.identificador_lido}</td>
                        <td className="px-4 py-3">
                          <p className="font-bold text-white text-sm">{p.nome}</p>
                          {p.rol && (
                            <span className="inline-block mt-1 px-2 py-0.5 bg-indigo-950 border border-indigo-800 text-indigo-300 text-[10px] font-bold rounded-full uppercase tracking-wider">
                              {p.rol}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell text-sm text-slate-300">
                          {p.planta}
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            p.modo_registro === 'MANUAL' ? 'bg-blue-900/40 text-blue-400' :
                            p.modo_registro === 'NFC' ? 'bg-purple-900/40 text-purple-400' :
                            p.modo_registro === 'QR_CODE' ? 'bg-amber-900/40 text-amber-400' :
                            'bg-slate-800 text-slate-300'
                          }`}>
                            {p.modo_registro}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
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
                        <td className="px-4 py-3 text-right text-slate-500 text-sm font-medium">
                          {p.data_registro ? new Date(p.data_registro).toLocaleString('pt-BR', {day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute:'2-digit'}) : '--/--/---- --:--'}
                        </td>
                        {userRole === 'admin' && (
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={(e) => { e.stopPropagation(); excluirPresenca(p.id); }}
                              className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
                              title="Remover Presença"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        )}
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
            
            {/* Seletor de Planta / Unidade */}
            <div className="mb-5 space-y-2">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">1. Selecione a Planta / Unidade do Treinamento *</label>
              <select
                value={createPlanta}
                onChange={(e) => {
                  const val = e.target.value;
                  setCreatePlanta(val);
                  const isCh = ['LAJA (SAT)', 'SANTA FE (SAT)', 'PACIFICO (SAT)'].includes(val);
                  const novoPais = isCh ? 'CHILE' : 'BRASIL';
                  setCreatePais(novoPais);
                  const cursos = Array.from(new Set(treinamentos.filter(t => t.pais === novoPais || t.planta === val).map(t => t.nome))).filter(Boolean);
                  if (createMode === 'EXISTING' && cursos.length > 0) setNomeTreinamento(cursos[0] as string);
                }}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl focus:outline-none focus:border-sky-500 text-white font-bold text-sm shadow-inner cursor-pointer"
              >
                <optgroup label="🇧🇷 Plantas Brasil (Rainbow)">
                  <option value="GUAÍBA (RAINBOW)">🏢 Guaíba (Brasil)</option>
                </optgroup>
                <optgroup label="🇨🇱 Plantas Chile (SAT)">
                  <option value="SANTA FE (SAT)">🏭 Santa Fe (Chile)</option>
                  <option value="LAJA (SAT)">🏭 Laja (Chile)</option>
                  <option value="PACIFICO (SAT)">🏭 Pacífico (Chile)</option>
                </optgroup>
              </select>
            </div>

            {/* Seletor de Tipo (Curso Existente vs Novo Curso) */}
            <div className="flex bg-slate-950 p-1 rounded-xl mb-6 border border-slate-800">
              <button 
                type="button"
                onClick={() => {
                  setCreateMode('EXISTING');
                  const cursos = Array.from(new Set(treinamentos.filter(t => t.pais === createPais).map(t => t.nome))).filter(Boolean);
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
                      {Array.from(new Set(treinamentos.filter(t => t.pais === createPais).map(t => t.nome))).filter(Boolean).map((nome: any) => (
                        <option key={nome} value={nome} className="bg-slate-900 py-2 text-white">
                          📁 {nome}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                      <ChevronDown className="h-4 w-4" />
                    </div>
                  </div>
                  {Array.from(new Set(treinamentos.filter(t => t.pais === createPais).map(t => t.nome))).filter(Boolean).length === 0 && (
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

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                  <span>Público-Alvo (Opcional)</span>
                  <span className="text-[10px] font-normal text-slate-400">Vincular lista de convocação</span>
                </label>
                <div className="relative">
                  <select
                    value={createPublicoAlvoId}
                    onChange={e => setCreatePublicoAlvoId(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl focus:outline-none focus:border-sky-500 text-white font-medium appearance-none cursor-pointer pr-10 shadow-inner"
                  >
                    <option value="">Nenhum (Treinamento Aberto)</option>
                    {publicosAlvo.filter(p => !p.treinamento_vinculado).map(p => (
                      <option key={p.id} value={p.id}>{p.nome}</option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                    <ChevronDown className="h-4 w-4" />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                  <span>Atribuir Checklist (Opcional)</span>
                  <span className="text-[10px] font-normal text-slate-400">Modelo de checklist para o instrutor</span>
                </label>
                <div className="relative">
                  <select
                    value={createChecklistId}
                    onChange={e => setCreateChecklistId(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl focus:outline-none focus:border-emerald-500 text-white font-medium appearance-none cursor-pointer pr-10 shadow-inner"
                  >
                    <option value="">Nenhum (Sem checklist obrigatório)</option>
                    {checklistTemplates.map(template => (
                      <option key={template.id} value={template.id}>{template.nome} ({template.items?.length || 0} itens)</option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                    <ChevronDown className="h-4 w-4" />
                  </div>
                </div>
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
                  <div className="mt-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-3 animate-in fade-in">
                    <p className="text-xs text-amber-300 font-semibold flex items-center gap-1.5">
                      <span>⚠️ Colaborador não localizado no banco. Preencha os dados manualmente abaixo:</span>
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-bold text-slate-300 uppercase block mb-1">Nome Completo *</label>
                        <input
                          type="text"
                          required
                          value={nomeAvulso}
                          onChange={e => setNomeAvulso(e.target.value)}
                          placeholder="Digite o nome completo"
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:border-amber-400"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-300 uppercase block mb-1">Empresa / Planta *</label>
                        <input
                          type="text"
                          required
                          list="admin-empresas-list"
                          value={empresaAvulsa}
                          onChange={e => setEmpresaAvulsa(e.target.value)}
                          placeholder="Selecione ou digite"
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:border-amber-400"
                        />
                        <datalist id="admin-empresas-list">
                          {(treinamentos.find(t => t.id === selectedId)?.pais === 'CHILE' ? (empresasDict.chile.length > 0 ? empresasDict.chile : empresasDict.todas) : (empresasDict.brasil.length > 0 ? empresasDict.brasil : empresasDict.todas)).map(emp => (
                            <option key={emp} value={emp} />
                          ))}
                        </datalist>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Assinatura */}
              <div className="mt-5 animate-in fade-in zoom-in-95">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 mb-2">
                  <span className="text-sm font-bold text-slate-200 flex items-center gap-2">
                    <PenTool className="h-4 w-4 text-sky-400" />
                    Assinatura do Colaborador (Faça no quadro abaixo):
                  </span>
                  <button 
                    type="button" 
                    onClick={() => { sigCanvas.current?.clear(); setHasSignature(false); }}
                    className="self-end sm:self-auto px-3 py-1 text-xs font-semibold text-red-400 hover:text-white bg-red-950/40 hover:bg-red-900/60 rounded-lg border border-red-900/50 transition-colors"
                  >
                    🧹 Limpar Assinatura
                  </button>
                </div>
                <div className="bg-slate-950 rounded-xl overflow-hidden border-2 border-sky-500/60 shadow-inner">
                  <SignatureCanvas 
                    ref={sigCanvas} 
                    penColor="white"
                    clearOnResize={false}
                    canvasProps={{className: 'w-full h-80 cursor-crosshair'}}
                    onEnd={() => setHasSignature(true)}
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end space-x-3">
                <button 
                  type="button"
                  onClick={() => { setIsManualModalOpen(false); setNomeAvulso(""); setEmpresaAvulsa(""); }}
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
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 md:p-8 w-full max-w-4xl shadow-2xl animate-in fade-in zoom-in-95 duration-200 flex flex-col md:flex-row gap-8">
            <div className="flex-1 space-y-4 flex flex-col justify-between">
              <div>
                <h3 className="text-2xl font-bold text-white flex items-center gap-2 mb-2">
                  <UserPlus className="h-7 w-7 text-blue-400" />
                  Opções de Presença
                </h3>
                <p className="text-sm text-slate-400">Escolha como deseja registrar os alunos desta turma.</p>
              </div>
              
              <div className="flex flex-col gap-4 my-4">
                <button 
                  onClick={() => { setIsShareModalOpen(false); setIsManualModalOpen(true); }}
                  className="flex items-center gap-4 p-5 bg-slate-800/80 hover:bg-slate-800 rounded-2xl border border-slate-700 hover:border-blue-500/50 transition-all shadow-lg text-left group"
                >
                  <div className="bg-blue-600/20 group-hover:bg-blue-600/30 p-3 rounded-xl border border-blue-500/30 transition-colors"><UserPlus className="h-6 w-6 text-blue-400" /></div>
                  <div>
                    <h4 className="font-bold text-white text-base">Registro Manual (Pelo PC)</h4>
                    <p className="text-xs text-slate-400 mt-0.5">Buscar pelo nome, CPF ou matrícula e assinar na tela</p>
                  </div>
                </button>

                <a 
                  href={`/registrar/${selectedTreinamento.id}?nome=${encodeURIComponent(selectedTreinamento.nome)}&turma=${encodeURIComponent(selectedTreinamento.turma || "")}&pais=${selectedTreinamento.pais || "BRASIL"}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 p-5 bg-slate-800/80 hover:bg-slate-800 rounded-2xl border border-slate-700 hover:border-emerald-500/50 transition-all shadow-lg text-left group"
                >
                  <div className="bg-emerald-600/20 group-hover:bg-emerald-600/30 p-3 rounded-xl border border-emerald-500/30 transition-colors"><ScanLine className="h-6 w-6 text-emerald-400" /></div>
                  <div>
                    <h4 className="font-bold text-white text-base">Abrir Tela de Auto-Registro</h4>
                    <p className="text-xs text-slate-400 mt-0.5">Abre a página em uma nova aba do navegador no seu PC</p>
                  </div>
                </a>
              </div>

              <button 
                onClick={() => setIsShareModalOpen(false)}
                className="w-full py-3.5 text-slate-300 hover:text-white bg-slate-800/60 hover:bg-slate-700 rounded-xl transition-colors font-semibold"
              >
                Fechar Modal
              </button>
            </div>

            <div className="w-full md:w-96 bg-slate-950 rounded-2xl border-2 border-slate-800 p-6 flex flex-col items-center justify-center text-center shadow-inner">
              <h4 className="font-extrabold text-emerald-400 mb-1 text-lg uppercase tracking-wider">QR Code para Alunos</h4>
              <div className="bg-slate-900 border border-slate-800 px-3 py-1 rounded-lg text-white font-bold text-xs mb-3 max-w-full truncate text-blue-300">
                📚 {selectedTreinamento.nome} {selectedTreinamento.turma ? `(${selectedTreinamento.turma})` : ''}
              </div>
              <p className="text-xs text-slate-400 mb-5">Peça aos alunos ou instrutores para escanearem a tela</p>
              
              <div className="bg-white p-5 rounded-2xl shadow-2xl border-4 border-emerald-500/30">
                {/* QR Code gigante com a URL real do ambiente e parâmetros de turma embutidos */}
                <QRCodeSVG value={`${typeof window !== 'undefined' ? window.location.origin : ''}/registrar/${selectedTreinamento.id}?nome=${encodeURIComponent(selectedTreinamento.nome)}&turma=${encodeURIComponent(selectedTreinamento.turma || "")}&pais=${selectedTreinamento.pais || "BRASIL"}`} size={260} level="H" />
              </div>
              
              <div className="mt-5 bg-blue-950/40 border border-blue-500/30 rounded-xl p-3.5 text-xs text-blue-200/90 text-left w-full shadow-sm">
                <strong className="block text-blue-400 mb-1 font-bold flex items-center gap-1.5">
                  <Smartphone className="h-4 w-4 inline" /> Como Funciona:
                </strong>
                Os alunos escaneiam com a câmera do celular para assinar no próprio celular. O instrutor pode escanear com o APP Android para ler crachás NFC!
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

          {/* MODAL CHECKLIST DO INSTRUTOR */}
          {isChecklistModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
              <div className="bg-slate-900 rounded-2xl w-full max-w-3xl overflow-hidden border border-slate-700 shadow-2xl flex flex-col max-h-[90vh]">
                <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-900 sticky top-0 z-10">
                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-emerald-400" /> Checklist do Instrutor
                    </h3>
                    <p className="text-xs text-slate-400">Marque as etapas concluídas para esta turma.</p>
                  </div>
                </div>
                
                <div className="p-6 overflow-y-auto flex flex-col md:flex-row gap-8">
                  
                  <div className="flex-1 space-y-6">
                    {checklist.length === 0 ? (
                      <div className="text-center p-8 text-slate-400 border border-dashed border-slate-700 rounded-xl bg-slate-800/30">
                        Nenhum modelo de checklist foi atribuído a esta turma.
                      </div>
                    ) : (
                      Array.from(new Set(checklist.map(i => i.categoria || 'GERAL'))).map(categoria => (
                        <div key={categoria} className="bg-slate-800/50 p-4 rounded-xl border border-blue-900/50">
                          <h4 className="text-blue-400 font-bold mb-4 flex items-center gap-2">
                            <Clock className="h-4 w-4"/> {categoria}
                          </h4>
                          <div className="space-y-3">
                            {checklist.filter(i => (i.categoria || 'GERAL') === categoria).map((item, index) => (
                              <label key={item.id || index} className="flex items-center gap-3 cursor-pointer group">
                                <input 
                                  type="checkbox" 
                                  checked={item.checado || false} 
                                  onChange={e => {
                                    const novo = [...checklist];
                                    const idx = novo.findIndex(n => n.id === item.id);
                                    if(idx > -1) {
                                      novo[idx] = { ...novo[idx], checado: e.target.checked };
                                      setChecklist(novo);
                                    }
                                  }} 
                                  className="w-5 h-5 rounded border-slate-600 bg-slate-900 text-blue-500 focus:ring-blue-500 focus:ring-offset-slate-900" 
                                />
                                <span className="text-sm text-slate-300 group-hover:text-white transition-colors">{item.texto}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
                
                <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/50 flex justify-end gap-3 sticky bottom-0">
                  <button type="button" onClick={() => setIsChecklistModalOpen(false)} className="px-4 py-2 text-slate-300 hover:text-white font-medium transition-colors">
                    Cancelar
                  </button>
                  <button type="button" onClick={handleSalvarChecklist} disabled={isSubmitting} className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold shadow-lg transition-colors flex items-center gap-2">
                    {isSubmitting ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "Salvar Checklist"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* MODAL ATRIBUIR CHECKLIST A TURMA EXISTENTE */}
          {isAssignModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
              <div className="bg-slate-900 rounded-2xl w-full max-w-md overflow-hidden border border-slate-700 shadow-2xl flex flex-col">
                <div className="px-6 py-4 border-b border-slate-800 bg-slate-900">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <ListChecks className="h-5 w-5 text-sky-400" /> Atribuir Checklist
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">Escolha um modelo de checklist para esta turma.</p>
                </div>
                
                <form onSubmit={handleAssignChecklistSubmit} className="p-6 space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Modelo de Checklist
                    </label>
                    <select
                      required
                      value={assignChecklistId}
                      onChange={e => setAssignChecklistId(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl focus:outline-none focus:border-sky-500 text-white font-medium appearance-none cursor-pointer"
                    >
                      <option value="">Selecione um modelo...</option>
                      {checklistTemplates.map(template => (
                        <option key={template.id} value={template.id}>{template.nome} ({template.items?.length || 0} itens)</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="pt-4 flex justify-end gap-3">
                    <button 
                      type="button" 
                      onClick={() => setIsAssignModalOpen(false)} 
                      className="px-4 py-2 text-slate-300 hover:text-white font-medium transition-colors"
                    >
                      Cancelar
                    </button>
                    <button 
                      type="submit" 
                      disabled={isSubmitting || !assignChecklistId} 
                      className="px-6 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg font-bold shadow-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                      {isSubmitting ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "Atribuir"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* MODAL CONFIGURAR ROLES */}
          {isRolesModalOpen && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
              <div className="bg-slate-900 rounded-2xl w-full max-w-md overflow-hidden border border-slate-700 shadow-2xl flex flex-col">
                <div className="px-6 py-4 border-b border-slate-800 bg-slate-900">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <PlusCircle className="h-5 w-5 text-indigo-400" /> Configurar Roles (Papéis)
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">Crie a lista de roles disponíveis para atribuir às pessoas desta turma.</p>
                </div>
                
                <div className="p-6 space-y-6">
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={novoRol}
                        onChange={(e) => setNovoRol(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddRol()}
                        placeholder="Ex: ELETRICISTA, SOLDADOR..."
                        className="flex-1 px-4 py-2 bg-slate-950 border border-slate-700 rounded-xl focus:outline-none focus:border-indigo-500 text-white font-medium uppercase text-sm"
                      />
                      <button
                        type="button"
                        onClick={handleAddRol}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-colors shadow-lg"
                      >
                        Adicionar
                      </button>
                    </div>

                    <div className="bg-slate-950/50 rounded-xl border border-slate-800 p-4 min-h-[120px]">
                      {rolesDisponiveis.length === 0 ? (
                        <p className="text-slate-500 text-center text-sm mt-8">Nenhum rol cadastrado. Digite acima e adicione.</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {rolesDisponiveis.map(rol => (
                            <span key={rol} className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-900/30 border border-indigo-700 text-indigo-300 rounded-lg text-sm font-bold tracking-wide">
                              {rol}
                              <button onClick={() => handleRemoveRol(rol)} className="text-indigo-400 hover:text-red-400 transition-colors">
                                <X className="w-4 h-4" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="pt-4 flex justify-end gap-3 border-t border-slate-800">
                    <button 
                      type="button" 
                      onClick={() => setIsRolesModalOpen(false)} 
                      className="px-4 py-2 text-slate-300 hover:text-white font-medium transition-colors"
                    >
                      Cancelar
                    </button>
                    <button 
                      type="button" 
                      onClick={handleSalvarRoles}
                      disabled={isSubmitting} 
                      className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold shadow-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                      {isSubmitting ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "Salvar Roles"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

      <ConfirmModal {...confirmModal} onCancel={() => setConfirmModal(prev => ({...prev, isOpen: false}))} />
    </div>
  );
}
