"use client";
import { useState, useEffect, useRef } from "react";
import { UserCheck, CheckCircle2, AlertCircle, Camera, Keyboard } from "lucide-react";
import { useParams } from "next/navigation";
import { Html5QrcodeScanner, Html5Qrcode } from "html5-qrcode";
import SignatureCanvas from "react-signature-canvas";
import { PenTool } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

export default function RegistrarPresenca() {
  const params = useParams();
  const id = params.id as string;

  const [mode, setMode] = useState<'MANUAL' | 'QR'>('MANUAL');
  const [manualId, setManualId] = useState("");
  const [colabResults, setColabResults] = useState<any[]>([]);
  const [selectedColab, setSelectedColab] = useState<any>(null);
  const [isSearchingId, setIsSearchingId] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [successName, setSuccessName] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [nomeTreinamento, setNomeTreinamento] = useState("Carregando Sessão...");
  const [turmaTreinamento, setTurmaTreinamento] = useState("");
  const [pageUrl, setPageUrl] = useState("");
  const [showGiantQR, setShowGiantQR] = useState(false);

  const [nomeAvulso, setNomeAvulso] = useState("");
  const [empresaAvulsa, setEmpresaAvulsa] = useState("");
  const [showAvulso, setShowAvulso] = useState(false);
  const [empresasList, setEmpresasList] = useState<string[]>([]);
  const [paisTreinamento, setPaisTreinamento] = useState<'BRASIL' | 'CHILE' | 'GERAL'>('BRASIL');
  const [empresasDict, setEmpresasDict] = useState<{ brasil: string[], chile: string[], todas: string[] }>({ brasil: [], chile: [], todas: [] });

  const sigCanvas = useRef<any>(null);
  const [hasSignature, setHasSignature] = useState(false);

  // Buscar nome do treinamento, pegar URL atual e carregar lista de empresas
  useEffect(() => {
    let paramNome = "";
    let paramTurma = "";
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      paramNome = url.searchParams.get('nome') || "";
      paramTurma = url.searchParams.get('turma') || "";
      const paramPais = url.searchParams.get('pais');
      
      if (paramNome) setNomeTreinamento(paramNome);
      if (paramTurma) setTurmaTreinamento(paramTurma);
      if (paramPais === 'CHILE' || paramPais === 'BRASIL') setPaisTreinamento(paramPais as any);
      
      setPageUrl(url.toString());
    }

    fetch('/api/empresas')
      .then(r => r.json())
      .then(data => { 
        if (data.success) {
          setEmpresasDict({
            brasil: data.brasil || data.data || [],
            chile: data.chile || data.data || [],
            todas: data.data || []
          });
          setEmpresasList(data.data || []);
        }
      })
      .catch(() => {});

    fetch('/api/treinamentos')
      .then(r => r.json())
      .then(data => {
        const t = data.data?.find((x: any) => x.id === id);
        if (t) {
          setNomeTreinamento(t.nome);
          setTurmaTreinamento(t.turma || "");
          if (t.pais) setPaisTreinamento(t.pais);
        } else if (!paramNome) {
          setNomeTreinamento("Treinamento Avulso");
        }
      })
      .catch(() => {
        if (!paramNome) setNomeTreinamento("Treinamento");
      });
  }, [id]);

  useEffect(() => {
    if (paisTreinamento === 'CHILE' && empresasDict.chile.length > 0) {
      setEmpresasList(empresasDict.chile);
    } else if (paisTreinamento === 'BRASIL' && empresasDict.brasil.length > 0) {
      setEmpresasList(empresasDict.brasil);
    } else if (empresasDict.todas.length > 0) {
      setEmpresasList(empresasDict.todas);
    }
  }, [paisTreinamento, empresasDict]);

  // Reset success timer
  useEffect(() => {
    if (success) {
      const t = setTimeout(() => {
        setSuccess(false);
        setManualId("");
        setSelectedColab(null);
        setColabResults([]);
        setNomeAvulso("");
        setEmpresaAvulsa("");
        setShowAvulso(false);
      }, 3000);
      return () => clearTimeout(t);
    }
  }, [success]);

  // Busca manual
  useEffect(() => {
    if (mode !== 'MANUAL') return;
    if (!manualId || manualId.length < 3) {
      setColabResults([]);
      setSelectedColab(null);
      setErrorMsg("");
      return;
    }
    
    if (selectedColab && (selectedColab.identificador === manualId || selectedColab.nome === manualId)) return;

    const timeoutId = setTimeout(async () => {
      setIsSearchingId(true);
      setErrorMsg("");
      try {
        const res = await fetch(`/api/buscar-colaborador?id=${encodeURIComponent(manualId)}`);
        const json = await res.json();
        if (json.success && json.data) {
          setColabResults(json.data);
          if (json.data.length === 1 && /\d/.test(manualId)) {
             setSelectedColab(json.data[0]);
             setManualId(json.data[0].identificador);
             if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
               document.activeElement.blur(); // Fecha o teclado virtual automaticamente!
             }
          }
        } else {
          setColabResults([]);
        }
      } catch (e) {
        setColabResults([]);
      } finally {
        setIsSearchingId(false);
      }
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [manualId, mode]);

  // QR Code Scanner effect
  useEffect(() => {
    if (mode === 'QR' && !success) {
      const html5QrCode = new Html5Qrcode("qr-reader");
      let isMounted = true;

      html5QrCode.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {
          if (!isMounted) return;
          if (html5QrCode.isScanning) {
            await html5QrCode.stop().catch(() => {});
          }
          await submitRegistro(decodedText, 'QR_CODE');
        },
        () => {}
      ).catch((err) => {
        console.warn("Início automático da câmera falhou ou sem permissão, carregando UI manual:", err);
        if (!isMounted) return;
        const scanner = new Html5QrcodeScanner("qr-reader", { qrbox: { width: 250, height: 250 }, fps: 5 }, false);
        scanner.render(async (decodedText) => {
          scanner.clear();
          await submitRegistro(decodedText, 'QR_CODE');
        }, () => {});
      });

      return () => {
        isMounted = false;
        if (html5QrCode.isScanning) {
          html5QrCode.stop().catch(() => {});
        }
      };
    }
  }, [mode, success]);

  const submitRegistro = async (identificadorLido: string, modoRegistro: string, assinaturaBase64?: string, nome?: string, empresa?: string) => {
    if (!identificadorLido.trim() || !id) return;
    
    setIsSubmitting(true);
    setErrorMsg("");
    
    try {
      const bodyData: any = {
        treinamentoId: id, 
        identificador: identificadorLido,
        modo_registro: modoRegistro
      };

      if (assinaturaBase64) bodyData.assinaturaBase64 = assinaturaBase64;
      if (nome) bodyData.nome = nome;
      if (empresa) {
        bodyData.planta = empresa;
        bodyData.empresa = empresa;
      }

      const res = await fetch("/api/presencas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyData)
      });
      
      const json = await res.json().catch(() => ({ success: res.ok, error: `Erro no servidor (${res.status}): Falha ao processar.` }));
      if (!res.ok || !json.success) {
        setErrorMsg(json.error || "Colaborador já registrado ou erro no servidor.");
        setIsSubmitting(false);
        return;
      }

      setSuccessName(json.nome || nome || selectedColab?.nome || identificadorLido);
      setManualId(identificadorLido); 
      setSuccess(true);
    } catch (e: any) {
      console.error("Erro no envio:", e);
      setErrorMsg(e?.message || "Erro de conexão ao comunicar com o servidor.");
    }
    setIsSubmitting(false);
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasSignature) {
      setErrorMsg("Você precisa assinar antes de confirmar a presença.");
      return;
    }
    let assinaturaBase64 = "";
    try {
      assinaturaBase64 = sigCanvas.current?.getTrimmedCanvas().toDataURL("image/png") || sigCanvas.current?.getCanvas().toDataURL("image/png") || "";
    } catch (err) {
      assinaturaBase64 = sigCanvas.current?.getCanvas().toDataURL("image/png") || "";
    }
    const idFinal = manualId.trim() || `VISITANTE_${Date.now().toString().slice(-6)}`;
    await submitRegistro(idFinal, 'AUTO_REGISTRO', assinaturaBase64, nomeAvulso || undefined, empresaAvulsa || undefined);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500">
        <div className="bg-emerald-900/20 p-6 rounded-full border border-emerald-500/30 mb-4 animate-bounce">
          <CheckCircle2 className="h-16 w-16 text-emerald-400" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white mb-2">Presença Registrada!</h1>
        <div className="bg-slate-900 border-2 border-emerald-500/40 rounded-2xl p-5 my-4 max-w-sm w-full shadow-2xl animate-in zoom-in-95">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-center gap-1">
            <span>👤 Colaborador Confirmado:</span>
          </p>
          <p className="text-xl font-black text-emerald-400 break-words">{successName}</p>
          <div className="mt-3 pt-3 border-t border-slate-800 text-[11px] font-mono text-slate-400 flex justify-between items-center">
            <span>ID / Matrícula:</span>
            <span className="text-white font-bold">{manualId}</span>
          </div>
        </div>
        <p className="text-slate-400 text-xs mt-2">Tela atualizando para o próximo registro em 3 segundos...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col p-2 sm:p-6 animate-in fade-in duration-500">
      <div className="w-full max-w-3xl mx-auto mt-2 sm:mt-8 flex-1">
        
        <div className="flex items-center justify-between gap-4 mb-6 px-1 sm:px-0">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600/20 p-3 rounded-xl border border-blue-500/30">
              <UserCheck className="h-6 w-6 text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white uppercase tracking-wider mb-2">REGISTRAR PRESENÇA</h1>
              <div className="flex flex-wrap items-center gap-2">
                <div className="bg-emerald-950/80 border border-emerald-500/50 px-2.5 py-1 rounded-lg text-emerald-300 font-bold text-xs uppercase tracking-wide flex items-center gap-1 shadow-sm">
                  📚 Treinamento: {nomeTreinamento}
                </div>
                {turmaTreinamento && (
                  <div className="bg-blue-950/80 border border-blue-500/50 px-2.5 py-1 rounded-lg text-blue-300 font-bold text-xs uppercase tracking-wide flex items-center gap-1 shadow-sm">
                    🏷️ Turma: {turmaTreinamento}
                  </div>
                )}
              </div>
            </div>
          </div>

          {pageUrl && (
            <div 
              onClick={() => setShowGiantQR(true)}
              className="hidden sm:flex flex-col items-center flex-shrink-0 bg-slate-900 border-2 border-emerald-500/60 hover:border-emerald-400 p-3 rounded-2xl shadow-xl cursor-pointer transition-all hover:scale-105 group"
              title="Clique para projetar o QR Code em tela cheia"
            >
              <div className="bg-white p-2.5 rounded-xl shadow-md">
                <QRCodeSVG value={pageUrl} size={130} level="H" />
              </div>
              <span className="text-[11px] font-black text-emerald-400 uppercase tracking-wider mt-2 flex items-center gap-1 group-hover:text-white transition-colors">
                🔍 Projetar na Tela
              </span>
            </div>
          )}
        </div>

        {pageUrl && (
          <div 
            onClick={() => setShowGiantQR(true)}
            className="sm:hidden flex items-center justify-between gap-3 mb-6 bg-slate-900 border-2 border-emerald-500/50 p-3.5 rounded-2xl cursor-pointer active:scale-95 transition-all shadow-lg"
          >
            <div className="flex items-center gap-3">
              <div className="bg-white p-1.5 rounded-lg flex-shrink-0">
                <QRCodeSVG value={pageUrl} size={64} level="H" />
              </div>
              <div className="text-left">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Acessar pelo Celular</h4>
                <p className="text-[11px] text-slate-300 mt-0.5">Toque aqui para ampliar o QR Code na tela</p>
              </div>
            </div>
            <span className="bg-emerald-600 text-white font-bold text-[10px] px-2.5 py-1.5 rounded-lg uppercase tracking-wider flex-shrink-0">
              🔍 Ampliar
            </span>
          </div>
        )}

        {showGiantQR && pageUrl && (
          <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-md z-50 flex flex-col items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200 text-center">
            <div className="max-w-lg w-full bg-slate-900 border-2 border-blue-500/50 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col items-center">
              <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-wider mb-2">{nomeTreinamento}</h2>
              {turmaTreinamento && (
                <span className="bg-blue-600 text-white px-4 py-1.5 rounded-full font-bold text-xs sm:text-sm uppercase tracking-wide mb-6 shadow-md">
                  🏷️ Turma: {turmaTreinamento}
                </span>
              )}
              <div className="bg-white p-5 sm:p-6 rounded-3xl shadow-2xl border-4 border-emerald-400 my-2">
                <QRCodeSVG value={pageUrl} size={320} level="H" />
              </div>
              <p className="text-xs sm:text-sm font-bold text-emerald-400 mt-6 uppercase tracking-wider">
                📱 Aponte a câmera do celular para registrar sua presença!
              </p>
              <button
                type="button"
                onClick={() => setShowGiantQR(false)}
                className="mt-6 px-8 py-3 bg-red-600 hover:bg-red-500 text-white font-bold text-sm rounded-xl uppercase tracking-wider transition-all shadow-lg"
              >
                ✕ Fechar Projeção
              </button>
            </div>
          </div>
        )}

        <div className="flex bg-slate-900 p-1.5 rounded-xl mb-6 border border-slate-800 gap-1.5">
          <button 
            onClick={() => setMode('MANUAL')}
            className={`flex-1 py-3 flex items-center justify-center gap-2 rounded-lg text-sm font-bold transition-all ${mode === 'MANUAL' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}
          >
            <Keyboard className="h-4 w-4 text-sky-300" /> Manual &amp; Assinar
          </button>
          <button 
            onClick={() => setMode('QR')}
            className={`flex-1 py-3 flex items-center justify-center gap-2 rounded-lg text-sm font-bold transition-all ${mode === 'QR' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}
          >
            <Camera className="h-4 w-4 text-emerald-300" /> Câmera QR Code
          </button>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-2xl min-h-[300px]">
          
          {mode === 'MANUAL' && (
            <form onSubmit={handleManualSubmit} className="space-y-6 animate-in fade-in">
              <div className="space-y-3">
                <label className="text-sm font-bold text-slate-200 block">Digite seu Nome, Documento ou Matrícula</label>
                <div className="flex flex-col sm:flex-row gap-2.5">
                  <input 
                    type="text" 
                    autoFocus
                    value={manualId}
                    onChange={e => setManualId(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); } }}
                    className="flex-1 px-4 py-3.5 bg-slate-950 border border-slate-700 rounded-xl focus:outline-none focus:border-blue-500 text-white font-mono text-base transition-colors shadow-inner placeholder:text-slate-500"
                    placeholder="Ex: 123456, CPF ou Nome..."
                  />
                  <button
                    type="button"
                    onClick={() => { if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) document.activeElement.blur(); }}
                    className="px-6 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-xl uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-1.5 flex-shrink-0 active:scale-95"
                  >
                    🔍 Buscar
                  </button>
                </div>
                
                {isSearchingId && <div className="text-xs text-blue-400 animate-pulse pt-1">Buscando seus dados...</div>}
                
                {!selectedColab && colabResults.length > 0 && (
                  <div className="mt-4 p-3 bg-slate-900 border border-blue-500/40 rounded-xl space-y-2 max-h-64 overflow-y-auto pr-1 animate-in fade-in shadow-xl">
                    <p className="text-xs font-bold text-blue-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <span>👥 Selecione seu nome abaixo ({colabResults.length} encontrados):</span>
                    </p>
                    {colabResults.map((c, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setSelectedColab(c);
                          setManualId(c.identificador);
                          if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
                            document.activeElement.blur();
                          }
                        }}
                        className="w-full p-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/50 rounded-xl text-left transition-all flex items-center justify-between group shadow-sm"
                      >
                        <div>
                          <h5 className="font-bold text-white text-sm group-hover:text-emerald-400 transition-colors">{c.nome}</h5>
                          <p className="text-xs text-slate-400 mt-0.5">🏢 {c.planta || 'Empresa não informada'} | 💼 {c.cargo || 'Não informado'} | <span className="font-mono text-blue-400">ID: {c.identificador}</span></p>
                        </div>
                        <div className="bg-emerald-950/80 text-emerald-300 font-bold text-xs px-3 py-1.5 rounded-lg border border-emerald-500/30 group-hover:bg-emerald-600 group-hover:text-white transition-all flex-shrink-0 ml-2">
                          ✓ Selecionar
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                
                {selectedColab && (
                  <div className="mt-4 p-4 bg-emerald-900/20 border border-emerald-900/50 rounded-xl">
                    <h4 className="font-bold text-emerald-400">{selectedColab.nome}</h4>
                    <p className="text-xs text-emerald-500 mt-1 font-mono">ID: {selectedColab.identificador}</p>
                    <button type="button" onClick={() => { setSelectedColab(null); setManualId(""); setColabResults([]); setShowAvulso(false); }} className="text-xs text-slate-400 mt-4 underline">Trocar Pessoa</button>
                  </div>
                )}

                {(!selectedColab && (showAvulso || (colabResults.length === 0 && !isSearchingId && manualId.length >= 3))) && (
                  <div className="mt-4 p-4 bg-amber-950/40 border border-amber-500/50 rounded-xl space-y-4 animate-in fade-in">
                    <div className="flex items-start gap-2 text-amber-300 text-sm font-semibold">
                      <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5 text-amber-400" />
                      <span>Não encontrou seu cadastro? Preencha seus dados para registrar sua presença:</span>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-bold text-slate-300 uppercase block mb-1">Seu Nome Completo *</label>
                        <input 
                          type="text" 
                          value={nomeAvulso} 
                          onChange={e => setNomeAvulso(e.target.value)} 
                          placeholder="Ex: Carlos Oliveira Silva" 
                          className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-amber-400 font-medium text-base"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-300 uppercase block mb-1">Empresa / Planta *</label>
                        <input 
                          type="text" 
                          value={empresaAvulsa} 
                          onChange={e => setEmpresaAvulsa(e.target.value)} 
                          placeholder="Digite para buscar sua empresa..." 
                          className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-amber-400 font-medium text-base"
                        />
                        {empresasList.length > 0 && (
                          <div className="mt-2 max-h-40 overflow-y-auto bg-slate-950 border border-slate-700 rounded-xl divide-y divide-slate-800 shadow-xl">
                            <p className="text-[10px] font-bold text-amber-300 uppercase px-3 py-1.5 bg-slate-900">
                              🏢 Selecione sua empresa ({empresasList.filter(emp => !empresaAvulsa || emp.toLowerCase().includes(empresaAvulsa.toLowerCase())).length} opções):
                            </p>
                            {empresasList
                              .filter(emp => !empresaAvulsa || emp.toLowerCase().includes(empresaAvulsa.toLowerCase()))
                              .slice(0, 15)
                              .map((emp, i) => (
                                <button
                                  key={i}
                                  type="button"
                                  onClick={() => {
                                    setEmpresaAvulsa(emp);
                                    if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) document.activeElement.blur();
                                  }}
                                  className="w-full text-left px-4 py-2.5 hover:bg-slate-800 text-slate-200 hover:text-white text-xs font-semibold transition-colors flex items-center justify-between group"
                                >
                                  <span>{emp}</span>
                                  <span className="text-[10px] bg-slate-800 group-hover:bg-amber-600 text-slate-400 group-hover:text-white px-2 py-0.5 rounded transition-colors flex-shrink-0 ml-2">✓ Selecionar</span>
                                </button>
                              ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {!selectedColab && !showAvulso && (colabResults.length > 0 || manualId.length < 3) && (
                  <button 
                    type="button" 
                    onClick={() => setShowAvulso(true)} 
                    className="text-xs text-sky-400 hover:text-sky-300 underline block pt-2"
                  >
                    Não encontrou seu nome / Sou novo ou visitante? Clique aqui
                  </button>
                )}
              </div>

              {/* Assinatura */}
              <div className="mt-5 animate-in fade-in zoom-in-95">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 mb-2">
                  <span className="text-sm font-bold text-slate-200 flex items-center gap-2">
                    <PenTool className="h-4 w-4 text-sky-400" />
                    Sua Assinatura (Escreva no quadro abaixo):
                  </span>
                  <button 
                    type="button" 
                    onClick={() => { sigCanvas.current?.clear(); setHasSignature(false); }}
                    className="self-end sm:self-auto px-3 py-1 text-xs font-semibold text-red-400 hover:text-white bg-red-950/40 hover:bg-red-900/60 rounded-lg border border-red-900/50 transition-colors"
                  >
                    🧹 Limpar Assinatura
                  </button>
                </div>
                <div 
                  className="bg-slate-950 rounded-xl overflow-hidden border-2 border-sky-500/60 shadow-inner"
                  onTouchStart={() => { if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) document.activeElement.blur(); }}
                  onMouseDown={() => { if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) document.activeElement.blur(); }}
                >
                  <SignatureCanvas 
                    ref={sigCanvas} 
                    penColor="white"
                    clearOnResize={false}
                    canvasProps={{className: 'w-full h-80 cursor-crosshair'}}
                    onEnd={() => setHasSignature(true)}
                  />
                </div>
              </div>

              <button 
                type="submit"
                disabled={
                  isSubmitting || 
                  !hasSignature || 
                  (!selectedColab && (nomeAvulso.trim().length < 3 || empresaAvulsa.trim().length < 2))
                }
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-lg disabled:opacity-50 transition-colors"
              >
                {isSubmitting ? 'Registrando...' : 'Confirmar Presença'}
              </button>
            </form>
          )}

          {mode === 'QR' && (
            <div className="flex flex-col items-center justify-center animate-in fade-in h-full">
              <div id="qr-reader" className="w-full rounded-xl overflow-hidden bg-slate-950 border border-slate-800 mb-4 bg-white text-black"></div>
              <p className="text-sm text-slate-400 text-center">Aponte o QR Code do seu crachá para a câmera.</p>
            </div>
          )}

          {errorMsg && (
            <div className="mt-4 p-4 bg-red-900/20 border border-red-900/50 rounded-xl text-sm text-red-400 text-center animate-in shake">
              {errorMsg}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
