"use client";
import { useState, useEffect, useRef } from "react";
import { Plus, Download, CheckCircle2, PlayCircle, Smartphone, ScanLine, QrCode, Trash2, UserPlus, PenTool, Link as LinkIcon } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import SignatureCanvas from "react-signature-canvas";

export default function Treinamentos() {
  const [treinamentos, setTreinamentos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [nomeTreinamento, setNomeTreinamento] = useState("");
  const [turmaTreinamento, setTurmaTreinamento] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
            onClick={() => setIsModalOpen(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-lg shadow-blue-900/20"
          >
            <Plus className="h-4 w-4" />
            <span>Novo Treinamento</span>
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
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden animate-in fade-in zoom-in-95 duration-300">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-900/50 border-b border-slate-700 text-slate-300">
              <tr>
                <th className="px-6 py-4 font-medium">Nome do Treinamento</th>
                <th className="px-6 py-4 font-medium">Turma</th>
                <th className="px-6 py-4 font-medium">ID da Sessão</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Presenças</th>
                <th className="px-6 py-4 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50 text-slate-300">
              {loading ? (
                <tr><td colSpan={5} className="p-8 text-center text-slate-400">Carregando...</td></tr>
              ) : treinamentos.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-slate-400">Nenhum treinamento criado ainda. Clique em Novo Treinamento!</td></tr>
              ) : treinamentos.map(t => (
                <tr 
                  key={t.id} 
                  onClick={() => setSelectedId(t.id)}
                  className={`transition-colors cursor-pointer hover:bg-slate-800/50 border-l-4 border-transparent`}
                >
                  <td className="px-6 py-4 font-medium text-white">{t.nome}</td>
                  <td className="px-6 py-4 text-slate-300 font-semibold">{t.turma || "-"}</td>
                  <td className="px-6 py-4 text-slate-400 font-mono text-xs">{t.id}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full text-xs font-medium bg-emerald-900/30 text-emerald-400 border border-emerald-800">
                      <PlayCircle className="h-3.5 w-3.5" /> Ativo
                    </span>
                  </td>
                  <td className="px-6 py-4 font-medium text-blue-400">{t._count.registros} pessoas</td>
                  <td className="px-6 py-4 text-right flex items-center justify-end space-x-2">
                    <button 
                      onClick={(e) => exportarCSV(t.id, e)}
                      className="flex items-center space-x-2 px-3 py-1.5 text-xs font-medium text-emerald-300 hover:text-white bg-emerald-900/30 hover:bg-emerald-800/50 rounded-lg transition-colors border border-emerald-800/50"
                      title="Exportar para Excel (CSV)"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Baixar Excel</span>
                    </button>
                    <button 
                      onClick={(e) => excluirTreinamento(t.id, e)}
                      className="flex items-center p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
                      title="Excluir Treinamento"
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
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold text-white mb-6">Criar Novo Treinamento</h3>
            
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Nome do Treinamento</label>
                <input 
                  type="text" 
                  required
                  autoFocus
                  value={nomeTreinamento}
                  onChange={e => setNomeTreinamento(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500 text-slate-200"
                  placeholder="Ex: NR-10 Integração"
                  list="treinamentos-existentes"
                />
                <datalist id="treinamentos-existentes">
                  {Array.from(new Set(treinamentos.map(t => t.nome))).map(nome => (
                    <option key={nome} value={nome} />
                  ))}
                </datalist>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Turma / Referência (Opcional)</label>
                <input 
                  type="text"
                  value={turmaTreinamento}
                  onChange={e => setTurmaTreinamento(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500 text-slate-200"
                  placeholder="Ex: Turma A - Manhã"
                />
              </div>

              <div className="pt-4 flex items-center justify-end space-x-3">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Criando...' : 'Criar Sala'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    {isManualModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-200">
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
              <div className="mt-4 bg-slate-900 border border-slate-700 rounded-lg p-3 animate-in fade-in zoom-in-95">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-slate-300 flex items-center gap-2">
                    <PenTool className="h-4 w-4 text-blue-400" />
                    Assinatura do Colaborador
                  </span>
                  <button 
                    type="button" 
                    onClick={() => { sigCanvas.current?.clear(); setHasSignature(false); }}
                    className="text-xs text-red-400 hover:text-red-300 underline"
                  >
                    Limpar
                  </button>
                </div>
                <div className="bg-slate-800 rounded-lg overflow-hidden border border-slate-600">
                  <SignatureCanvas 
                    ref={sigCanvas} 
                    penColor="white"
                    canvasProps={{className: 'w-full h-32 cursor-crosshair'}}
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
                {/* Aqui idealmente apontamos para a URL real de produção */}
                <QRCodeSVG value={`http://localhost:3000/registrar/${selectedTreinamento.id}`} size={150} level="H" />
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
