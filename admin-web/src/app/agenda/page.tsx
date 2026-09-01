"use client";
import { useState, useEffect, useMemo, useRef } from "react";
import { Calendar as CalendarIcon, Upload, RefreshCw, CalendarDays, Edit3, ArrowRight, Sparkles, ChevronLeft, ChevronRight, Check, RotateCcw, LayoutGrid, List, MessageSquare, X, Send, Bot } from "lucide-react";
import toast from "react-hot-toast";

export default function AgendaPage() {
  const [treinamentos, setTreinamentos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [editingTreinamento, setEditingTreinamento] = useState<any>(null);
  const [predictShift, setPredictShift] = useState("A");
  
  // Controle do calendário (Mês Atual)
  const [currentDate, setCurrentDate] = useState(new Date(2026, 7, 1)); // Agosto de 2026 (Mês 7 base 0)
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');

  const [facilitadoresList, setFacilitadoresList] = useState<any[]>([]);
  const [userName, setUserName] = useState("");
  const [userRole, setUserRole] = useState("leitor");
  const [filterFacilitador, setFilterFacilitador] = useState("");
  const [filterCurso, setFilterCurso] = useState("");
  
  // AI Chat States
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<{role: 'ai'|'user', content: string}[]>([
    { role: 'ai', content: 'Ola! Sou seu Assistente de Agenda. Como posso ajudar a criar ou excluir treinamentos hoje?' }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isChatOpen && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isChatOpen]);

  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = chatInput.trim();
    setChatInput("");
    setChatMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsChatLoading(true);

    try {
      const res = await fetch('/api/ai-agenda', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: userMsg,
          history: chatMessages
        })
      });
      const data = await res.json();
      
      if (data.reply) {
        setChatMessages(prev => [...prev, { role: 'ai', content: data.reply }]);
      }
      
      if (data.refreshNeeded) {
        carregarAgendas();
      }
    } catch (e) {
      setChatMessages(prev => [...prev, { role: 'ai', content: 'Desculpe, ocorreu um erro de conexao.' }]);
    } finally {
      setIsChatLoading(false);
    }
  };


  useEffect(() => {
    carregarAgendas();
    carregarFacilitadores();
    fetch("/api/auth").then(res => res.json()).then(json => {
      if (json.success && json.session) {
        setUserRole(json.session.role || "leitor");
        setUserName(json.session.nome || "");
      }
    }).catch(() => {});
  }, []);

  const carregarFacilitadores = async () => {
    try {
      const res = await fetch("/api/facilitadores");
      const json = await res.json();
      if (json.success) {
        setFacilitadoresList(json.data);
      }
    } catch (e) {
      console.error("Erro ao carregar facilitadores", e);
    }
  };

  const carregarAgendas = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/treinamentos");
      const json = await res.json();
      if (json.success) {
        const agendados = json.data.filter((t: any) => t.data_agendada);
        setTreinamentos(agendados);
      }
    } catch (e) {
      toast.error("Erro ao carregar agenda.");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/importar/gantt", {
        method: "POST",
        body: formData
      });
      const json = await res.json();
      if (json.success) {
        toast.success(json.message);
        carregarAgendas();
      } else {
        toast.error(json.error || "Erro na importação.");
      }
    } catch (err) {
      toast.error("Falha na conexão.");
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handlePredictDate = async () => {
    try {
      const start = editingTreinamento.data_agendada || new Date().toISOString().split('T')[0];
      const time = editingTreinamento.horario_agendado || '';
      const facilitador = editingTreinamento.facilitador_nome || '';
      const id = editingTreinamento.id;
      
      const res = await fetch(`/api/turnos/predict?shift=${predictShift}&startDate=${start}&targetTime=${time}&facilitador=${encodeURIComponent(facilitador)}&excludeId=${id}`);
      const json = await res.json();
      if (json.success) {
        const newDate = json.date.split('T')[0];
        setEditingTreinamento({ ...editingTreinamento, data_agendada: newDate });
        
        if (json.conflict) {
          toast.error(`⚠️ ATENÇÃO: O facilitador ${facilitador} já tem uma turma neste dia!`, { duration: 6000 });
        } else {
          toast.success(`Data sugerida para Turno ${predictShift}: ${newDate.split('-').reverse().join('/')}`);
        }
      }
    } catch (e) {
      toast.error("Erro ao prever turno.");
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingTreinamento.data_agendada) {
        const { validateShiftSchedule } = await import('@/lib/shiftPredictor');
        const validation = validateShiftSchedule(
          editingTreinamento.turma || '',
          editingTreinamento.data_agendada,
          editingTreinamento.horario_agendado || ''
        );
        if (!validation.valid) {
          toast.error(
            <div>
              <p className="font-bold">{validation.message}</p>
              <p className="text-xs mt-1">Sugestão de data: {validation.suggestion}</p>
            </div>,
            { duration: 6000 }
          );
          return; // Stop the save
        }
      }

      const { db } = await import('@/lib/firebase');
      const { doc, updateDoc } = await import('firebase/firestore');
      
      await updateDoc(doc(db, "treinamentos", editingTreinamento.id), {
        data_agendada: editingTreinamento.data_agendada,
        horario_agendado: editingTreinamento.horario_agendado,
        status_agenda: editingTreinamento.status_agenda,
        nome: editingTreinamento.nome,
        turma: editingTreinamento.turma || '',
        facilitador_nome: editingTreinamento.facilitador_nome,
        comentarios: editingTreinamento.comentarios || ''
      });
      
      toast.success("Agenda atualizada!");
      setEditingTreinamento(null);
      carregarAgendas();
    } catch (err) {
      toast.error("Erro ao atualizar.");
    }
  };

  // --- LÓGICA DO CALENDÁRIO ---
  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    // Espaços vazios no início do mês
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(null);
    }
    // Dias reais
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  }, [currentDate]);

  // Agrupar treinamentos por data (YYYY-MM-DD)
  const uniqueCursos = useMemo(() => {
    return Array.from(new Set(treinamentos.map(t => t.nome))).filter(Boolean).sort();
  }, [treinamentos]);

  const trainingsByDate = useMemo(() => {
    const map: Record<string, any[]> = {};
    treinamentos.forEach(t => {
      if (filterCurso && t.nome !== filterCurso) return;
      if (filterFacilitador) {
        if (filterFacilitador === 'MEUS') {
          if (t.facilitador_nome !== userName && t.instrutor_email !== userName) return;
        } else {
          if (t.facilitador_nome !== filterFacilitador && t.instrutor_email !== filterFacilitador) return;
        }
      }
      if (t.data_agendada) {
        if (!map[t.data_agendada]) map[t.data_agendada] = [];
        map[t.data_agendada].push(t);
      }
    });
    return map;
  }, [treinamentos, filterFacilitador, filterCurso, userName]);

  const filteredList = useMemo(() => {
    let list = [...treinamentos];
    if (filterCurso) {
      list = list.filter(t => t.nome === filterCurso);
    }
    if (filterFacilitador) {
      if (filterFacilitador === 'MEUS') {
        list = list.filter(t => t.facilitador_nome === userName || t.instrutor_email === userName);
      } else {
        list = list.filter(t => t.facilitador_nome === filterFacilitador || t.instrutor_email === filterFacilitador);
      }
    }
    return list.sort((a, b) => new Date(a.data_agendada).getTime() - new Date(b.data_agendada).getTime());
  }, [treinamentos, filterFacilitador, filterCurso, userName]);

  const sortedTrainings = useMemo(() => {
    return [...filteredList].sort((a, b) => {
      if (!a.data_agendada) return 1;
      if (!b.data_agendada) return -1;
      const d1 = new Date(a.data_agendada + "T" + (a.horario_agendado || "00:00"));
      const d2 = new Date(b.data_agendada + "T" + (b.horario_agendado || "00:00"));
      return d1.getTime() - d2.getTime();
    });
  }, [treinamentos]);

  const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'EM ANDAMENTO': return 'bg-blue-600 text-white';
      case 'CONCLUIDO': return 'bg-emerald-600 text-white';
      case 'ATRASADO': return 'bg-rose-600 text-white';
      default: return 'bg-indigo-600 text-white'; // AGENDADO
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <CalendarDays className="h-8 w-8 text-indigo-500" /> Agenda de Turmas
          </h2>
          <p className="text-slate-400 mt-1">Gerencie a linha do tempo de treinamentos, re-agendamentos e status.</p>
        </div>
        
        <div className="flex gap-3 relative">
            <div className="relative">
              <select
                value={filterCurso}
                onChange={(e) => setFilterCurso(e.target.value)}
                className="px-4 py-2 bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-300 rounded-xl text-sm font-bold shadow-lg focus:outline-none focus:border-indigo-500 appearance-none pr-8 cursor-pointer h-full"
              >
                <option value="">📁 Todos os Cursos</option>
                {uniqueCursos.map(c => (
                  <option key={c as string} value={c as string}>{c as string}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </div>
            </div>
            
            <div className="relative">
              <select
                value={filterFacilitador}
                onChange={(e) => setFilterFacilitador(e.target.value)}
                className="px-4 py-2 bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-300 rounded-xl text-sm font-bold shadow-lg focus:outline-none focus:border-indigo-500 appearance-none pr-8 cursor-pointer h-full"
              >
                <option value="">👤 Todos os Facilitadores</option>
                <option value="MEUS">⭐ Meus Treinamentos</option>
                {facilitadoresList.map(f => (
                  <option key={f.id} value={f.nome}>{f.nome}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </div>
            </div>
            <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-700">
            <button 
              onClick={() => setViewMode('calendar')}
              className={`p-2 rounded-md transition flex items-center justify-center ${viewMode === 'calendar' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
              title="Visão Calendário"
            >
              <LayoutGrid className="h-5 w-5" />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition flex items-center justify-center ${viewMode === 'list' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
              title="Visão Lista"
            >
              <List className="h-5 w-5" />
            </button>
          </div>
          <label className={`cursor-pointer px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold shadow-lg transition-colors flex items-center gap-2 ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
            {isUploading ? <RefreshCw className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
            {isUploading ? "Importando Gantt..." : "Importar Gantt"}
            <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleFileUpload} />
          </label>
        </div>
      </div>

      <div className="bg-slate-900 rounded-xl border border-slate-700 shadow-lg p-6">
        {loading ? (
          <div className="py-20 text-center text-slate-500">
            <RefreshCw className="h-10 w-10 animate-spin mx-auto mb-4 text-indigo-500" />
            <p className="text-lg">Carregando calendário...</p>
          </div>
        ) : (
          <>
            {viewMode === 'calendar' ? (
              <>
                {/* Header do Calendário */}
                <div className="flex items-center justify-between mb-6">
                  <button onClick={prevMonth} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-full text-slate-300 transition">
                    <ChevronLeft className="h-6 w-6" />
                  </button>
                  <h3 className="text-2xl font-bold text-white">
                    {monthNames[currentDate.getMonth()]} <span className="text-indigo-400">{currentDate.getFullYear()}</span>
                  </h3>
                  <button onClick={nextMonth} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-full text-slate-300 transition">
                    <ChevronRight className="h-6 w-6" />
                  </button>
                </div>

                {/* Grid do Calendário */}
                <div className="grid grid-cols-7 gap-2 mb-2">
                  {weekDays.map(day => (
                    <div key={day} className="text-center text-sm font-bold text-slate-500 uppercase tracking-wider py-2">
                      {day}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-2">
                  {calendarDays.map((dateObj, index) => {
                    if (!dateObj) {
                      return <div key={`empty-${index}`} className="min-h-[120px] bg-slate-950/30 rounded-xl border border-transparent"></div>;
                    }

                    // Formatar data YYYY-MM-DD
                    const yyyy = dateObj.getFullYear();
                    const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
                    const dd = String(dateObj.getDate()).padStart(2, '0');
                    const dateKey = `${yyyy}-${mm}-${dd}`;
                    
                    const todayTrainings = trainingsByDate[dateKey] || [];
                    const isToday = new Date().toDateString() === dateObj.toDateString();

                    return (
                      <div key={dateKey} className={`min-h-[120px] rounded-xl border ${isToday ? 'bg-slate-800/80 border-indigo-500/50 ring-1 ring-indigo-500' : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'} p-2 transition flex flex-col`}>
                        <div className="flex justify-between items-start mb-2">
                          <span className={`text-sm font-bold flex items-center justify-center h-7 w-7 rounded-full ${isToday ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>
                            {dateObj.getDate()}
                          </span>
                          {todayTrainings.length > 0 && (
                            <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-bold">
                              {todayTrainings.length}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex-1 space-y-1.5 overflow-y-auto max-h-[100px] scrollbar-thin scrollbar-thumb-slate-700">
                          {todayTrainings.map(t => (
                            <div 
                              key={t.id} 
                              className={`group text-xs p-1.5 rounded-md hover:opacity-80 transition flex items-center justify-between gap-1 ${getStatusColor(t.status_agenda)} shadow-sm relative`}
                              title={`${t.nome}\nHora: ${t.horario_agendado || '--'}\nFacilitador: ${t.facilitador_nome}`}
                            >
                              <div className="flex-1 truncate cursor-pointer" onClick={() => setEditingTreinamento(t)}>
                                <span className="font-bold truncate">{t.horario_agendado || ''} {t.turma}</span>
                              </div>
                              {t.status_agenda !== 'CONCLUIDO' ? (
                                <button
                                  type="button"
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    try {
                                      const { db } = await import('@/lib/firebase');
                                      const { doc, updateDoc } = await import('firebase/firestore');
                                      await updateDoc(doc(db, "treinamentos", t.id), { status_agenda: 'CONCLUIDO' });
                                      toast.success("Turma concluída com sucesso!");
                                      carregarAgendas();
                                    } catch (err) {
                                      toast.error("Erro ao concluir.");
                                    }
                                  }}
                                  className="opacity-0 group-hover:opacity-100 p-1 bg-black/20 hover:bg-black/40 rounded transition-opacity"
                                  title="Marcar como Concluído"
                                >
                                  <Check className="h-3 w-3" />
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    try {
                                      const { db } = await import('@/lib/firebase');
                                      const { doc, updateDoc } = await import('firebase/firestore');
                                      await updateDoc(doc(db, "treinamentos", t.id), { status_agenda: 'AGENDADO' });
                                      toast.success("Status revertido para Agendado!");
                                      carregarAgendas();
                                    } catch (err) {
                                      toast.error("Erro ao reverter.");
                                    }
                                  }}
                                  className="opacity-0 group-hover:opacity-100 p-1 bg-black/20 hover:bg-black/40 rounded transition-opacity text-emerald-200"
                                  title="Desmarcar / Voltar para Agendado"
                                >
                                  <RotateCcw className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="text-xs uppercase bg-slate-800 text-slate-400">
                    <tr>
                      <th className="px-4 py-3 rounded-l-lg">Data</th>
                      <th className="px-4 py-3">Horário</th>
                      <th className="px-4 py-3">Turma</th>
                      <th className="px-4 py-3">Facilitador</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 rounded-r-lg">Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedTrainings.map((t) => (
                      <tr key={t.id} className="border-b border-slate-800 hover:bg-slate-800/50 transition">
                        <td className="px-4 py-4 font-bold">{t.data_agendada ? t.data_agendada.split('-').reverse().join('/') : '--'}</td>
                        <td className="px-4 py-4 font-mono">{t.horario_agendado || '--'}</td>
                        <td className="px-4 py-4 max-w-[200px] truncate" title={t.nome}>{t.nome}</td>
                        <td className="px-4 py-4 font-bold text-indigo-300">{t.facilitador_nome || 'N/A'}</td>
                        <td className="px-4 py-4">
                          <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${getStatusColor(t.status_agenda)} bg-opacity-20 text-current`}>
                            {t.status_agenda || 'AGENDADO'}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <button
                            onClick={() => setEditingTreinamento(t)}
                            className="p-2 bg-slate-700 hover:bg-indigo-600 rounded-lg text-white transition-colors flex items-center gap-2 text-xs font-bold"
                          >
                            <Edit3 className="h-3 w-3" /> Ajustar
                          </button>
                        </td>
                      </tr>
                    ))}
                    {sortedTrainings.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-slate-500">Nenhum treinamento encontrado.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {/* MODAL REAGENDAR */}
      {editingTreinamento && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95">
            <form onSubmit={handleSaveEdit}>
              <div className="p-6 border-b border-slate-800">
                <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
                  <CalendarIcon className="h-5 w-5 text-indigo-500" /> Editar Turma
                </h3>
                
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Pasta (Curso)</label>
                    <input 
                      type="text" 
                      value={editingTreinamento.nome || ''} 
                      onChange={(e) => setEditingTreinamento({...editingTreinamento, nome: e.target.value})}
                      className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Nome da Turma</label>
                    <input 
                      type="text" 
                      value={editingTreinamento.turma || ''} 
                      onChange={(e) => setEditingTreinamento({...editingTreinamento, turma: e.target.value})}
                      className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Facilitador</label>
                    <select 
                      value={editingTreinamento.facilitador_nome || ''} 
                      onChange={(e) => setEditingTreinamento({...editingTreinamento, facilitador_nome: e.target.value})}
                      className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="">Selecione um facilitador...</option>
                      {facilitadoresList.map(f => (
                        <option key={f.id} value={f.nome}>{f.nome}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-300 uppercase block">Nova Data</label>
                    <input
                      type="date"
                      required
                      value={editingTreinamento.data_agendada || ''}
                      onChange={(e) => setEditingTreinamento({...editingTreinamento, data_agendada: e.target.value})}
                      className="w-full px-4 py-2 bg-slate-950 border border-slate-700 rounded-xl focus:outline-none focus:border-indigo-500 text-white"
                      style={{ colorScheme: 'dark' }}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-300 uppercase block">Horário</label>
                    <input
                      type="time"
                      required
                      value={editingTreinamento.horario_agendado || ''}
                      onChange={(e) => setEditingTreinamento({...editingTreinamento, horario_agendado: e.target.value})}
                      className="w-full px-4 py-2 bg-slate-950 border border-slate-700 rounded-xl focus:outline-none focus:border-indigo-500 text-white"
                      style={{ colorScheme: 'dark' }}
                    />
                  </div>
                </div>

                <div className="p-4 bg-indigo-950/30 border border-indigo-900/50 rounded-xl space-y-3">
                  <label className="text-xs font-bold text-indigo-300 uppercase flex items-center gap-1">
                    <Sparkles className="h-3 w-3" /> Sugerir Nova Data (Turno IA)
                  </label>
                  <div className="flex gap-2">
                    <select 
                      value={predictShift}
                      onChange={(e) => setPredictShift(e.target.value)}
                      className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-bold"
                    >
                      <option value="A">Turno A</option>
                      <option value="B">Turno B</option>
                      <option value="C">Turno C</option>
                      <option value="D">Turno D</option>
                      <option value="E">Turno E</option>
                    </select>
                    <button
                      type="button"
                      onClick={handlePredictDate}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold text-sm transition-colors"
                    >
                      Encontrar Dia Útil
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300 uppercase block">Comentários / Observações</label>
                    <textarea
                      value={editingTreinamento.comentarios || ''}
                      onChange={(e) => setEditingTreinamento({...editingTreinamento, comentarios: e.target.value})}
                      rows={2}
                      className="w-full px-4 py-2 bg-slate-950 border border-slate-700 rounded-xl focus:outline-none focus:border-indigo-500 text-white resize-none"
                      placeholder="Justifique atrasos, liste pendências..."
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300 uppercase block">Status da Agenda</label>
                    <select
                      value={editingTreinamento.status_agenda || 'AGENDADO'}
                      onChange={(e) => setEditingTreinamento({...editingTreinamento, status_agenda: e.target.value})}
                      className="w-full px-4 py-2 bg-slate-950 border border-slate-700 rounded-xl focus:outline-none focus:border-indigo-500 text-white font-bold"
                    >
                      <option value="AGENDADO">🗓️ Agendado</option>
                      <option value="EM ANDAMENTO">▶️ Em Andamento</option>
                      <option value="CONCLUIDO">✅ Concluído</option>
                      <option value="ATRASADO">❌ Atrasado / Cancelado</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 bg-slate-900 border-t border-slate-800 flex justify-between gap-3">
                <a
                  href={`/treinamentos?id=${editingTreinamento.id}`}
                  className="px-4 py-2 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-900/30 rounded-lg font-bold flex items-center gap-1 transition"
                >
                  Ir para a Turma <ArrowRight className="h-4 w-4" />
                </a>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingTreinamento(null)}
                    className="px-4 py-2 text-slate-300 hover:text-white font-medium"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold shadow-lg"
                  >
                    Salvar
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Bot Button */}
      <button
        onClick={() => setIsChatOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full shadow-[0_0_20px_rgba(79,70,229,0.5)] flex items-center justify-center transition-transform hover:scale-110 z-40"
      >
        <Bot className="w-7 h-7" />
      </button>

      {/* Chat Drawer/Modal */}
      {isChatOpen && (
        <div className="fixed inset-y-0 right-0 w-full md:w-[400px] bg-slate-900 border-l border-slate-700 shadow-2xl z-50 flex flex-col animate-in slide-in-from-right-full">
          {/* Header */}
          <div className="px-5 py-4 bg-indigo-600 flex items-center justify-between shadow-md">
            <div className="flex items-center gap-3 text-white">
              <Bot className="w-6 h-6" />
              <h2 className="font-bold text-lg">Assistente IA</h2>
            </div>
            <button onClick={() => setIsChatOpen(false)} className="text-indigo-200 hover:text-white transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-900/50">
            {chatMessages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                  msg.role === 'user' 
                    ? 'bg-sky-600 text-white rounded-br-sm shadow-md' 
                    : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-bl-sm shadow-md'
                }`}>
                  {msg.content.split('\n').map((line, i) => (
                    <span key={i}>{line}<br/></span>
                  ))}
                </div>
              </div>
            ))}
            {isChatLoading && (
              <div className="flex justify-start">
                <div className="bg-slate-800 text-slate-400 border border-slate-700 rounded-2xl rounded-bl-sm px-4 py-3 text-sm flex gap-1 items-center shadow-md">
                  <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce"></div>
                  <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input Area */}
          <form onSubmit={handleSendChatMessage} className="p-4 bg-slate-900 border-t border-slate-800">
            <div className="relative">
              <input
                type="text"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                placeholder="Ex: Crie turmas para amanha..."
                className="w-full bg-slate-950 border border-slate-700 rounded-full pl-5 pr-12 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 shadow-inner"
                disabled={isChatLoading}
              />
              <button 
                type="submit" 
                disabled={!chatInput.trim() || isChatLoading}
                className="absolute right-2 top-2 p-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-full transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

