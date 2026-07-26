"use client";
import { useState, useEffect, useRef } from "react";
import { UserCheck, CheckCircle2, AlertCircle, Camera, Keyboard } from "lucide-react";
import { useParams } from "next/navigation";
import { Html5QrcodeScanner } from "html5-qrcode";
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
  const [errorMsg, setErrorMsg] = useState("");
  const [nomeTreinamento, setNomeTreinamento] = useState("Carregando Sessão...");
  const [turmaTreinamento, setTurmaTreinamento] = useState("");
  const [pageUrl, setPageUrl] = useState("");

  const sigCanvas = useRef<any>(null);
  const [hasSignature, setHasSignature] = useState(false);

  // Buscar nome do treinamento e pegar URL atual
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setPageUrl(window.location.href);
    }

    fetch('/api/treinamentos')
      .then(r => r.json())
      .then(data => {
        const t = data.data?.find((x: any) => x.id === id);
        if (t) {
          setNomeTreinamento(t.nome);
          setTurmaTreinamento(t.turma || "");
        } else {
          setNomeTreinamento("Treinamento Desconhecido");
        }
      })
      .catch(() => setNomeTreinamento("Treinamento"));
  }, [id]);

  // Reset success timer
  useEffect(() => {
    if (success) {
      const t = setTimeout(() => {
        setSuccess(false);
        setManualId("");
        setSelectedColab(null);
        setColabResults([]);
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
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [manualId, mode]);

  // QR Code Scanner effect
  useEffect(() => {
    if (mode === 'QR' && !success) {
      const scanner = new Html5QrcodeScanner("qr-reader", { 
        qrbox: { width: 250, height: 250 }, 
        fps: 5,
      }, false);
      
      scanner.render(async (decodedText) => {
        scanner.clear();
        await submitRegistro(decodedText, 'QR_CODE');
      }, (err) => {
        // ignora erros de leitura de frame vazio
      });

      return () => {
        scanner.clear().catch(e => console.error(e));
      };
    }
  }, [mode, success]);

  const submitRegistro = async (identificadorLido: string, modoRegistro: string, assinaturaBase64?: string) => {
    if (!identificadorLido.trim() || !id) return;
    
    setIsSubmitting(true);
    setErrorMsg("");
    
    try {
      const bodyData: any = {
        treinamentoId: id, 
        identificador: identificadorLido,
        modo_registro: modoRegistro
      };

      if (assinaturaBase64) {
        bodyData.assinaturaBase64 = assinaturaBase64;
      }

      const res = await fetch("/api/presencas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyData)
      });
      
      const json = await res.json();
      if (!json.success) {
        setErrorMsg(json.error);
      } else {
        setManualId(identificadorLido); 
        setSuccess(true);
      }
    } catch (e: any) {
      setErrorMsg("Erro de conexão.");
    }
    setIsSubmitting(false);
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasSignature) {
      setErrorMsg("Você precisa assinar antes de confirmar a presença.");
      return;
    }
    const assinaturaBase64 = sigCanvas.current?.getCanvas().toDataURL("image/png");
    await submitRegistro(manualId, 'AUTO_REGISTRO', assinaturaBase64);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500">
        <div className="bg-emerald-900/20 p-6 rounded-full border border-emerald-500/30 mb-6 animate-bounce">
          <CheckCircle2 className="h-16 w-16 text-emerald-400" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">Presença Confirmada!</h1>
        <p className="text-slate-400 mb-8 max-w-sm">Próximo registro em 3 segundos...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col p-1 sm:p-6 animate-in fade-in duration-500">
      <div className="w-full max-w-2xl mx-auto mt-2 sm:mt-8 flex-1">
        
        <div className="flex items-center justify-between gap-4 mb-6 px-2 sm:px-0">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600/20 p-3 rounded-xl border border-blue-500/30">
              <UserCheck className="h-6 w-6 text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white uppercase tracking-wider">REGISTRAR PRESENÇA</h1>
              <p className="text-sm font-black text-emerald-400 uppercase tracking-widest mt-1 line-clamp-2">
                {nomeTreinamento} {turmaTreinamento && <span className="text-blue-300 ml-2">({turmaTreinamento})</span>}
              </p>
            </div>
          </div>

          {pageUrl && (
            <div className="hidden sm:block flex-shrink-0 bg-white p-2 rounded-lg shadow-lg">
              <QRCodeSVG value={pageUrl} size={64} level="H" />
            </div>
          )}
        </div>

        {pageUrl && (
          <div className="sm:hidden flex items-center justify-center gap-3 mb-6 bg-slate-900 border border-slate-800 p-3 rounded-xl mx-2">
            <div className="bg-white p-1 rounded-md">
              <QRCodeSVG value={pageUrl} size={50} level="H" />
            </div>
            <p className="text-xs text-slate-400 text-left">
              Leia o QR Code para acessar o Totem no seu celular.
            </p>
          </div>
        )}

        <div className="flex bg-slate-900 p-1.5 rounded-xl mb-6 border border-slate-800 mx-2 sm:mx-0 gap-1.5">
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

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 sm:p-6 shadow-2xl min-h-[300px]">
          
          {mode === 'MANUAL' && (
            <form onSubmit={handleManualSubmit} className="space-y-6 animate-in fade-in">
              <div className="space-y-3">
                <label className="text-sm font-medium text-slate-300">Digite seu CPF ou Matrícula</label>
                <input 
                  type="text" 
                  autoFocus
                  value={manualId}
                  onChange={e => setManualId(e.target.value)}
                  className="w-full px-5 py-4 bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:border-blue-500 text-white font-mono text-lg transition-colors"
                  placeholder="Ex: 123456"
                />
                
                {isSearchingId && <div className="text-xs text-blue-400 animate-pulse pt-1">Buscando seus dados...</div>}
                
                {selectedColab && (
                  <div className="mt-4 p-4 bg-emerald-900/20 border border-emerald-900/50 rounded-xl">
                    <h4 className="font-bold text-emerald-400">{selectedColab.nome}</h4>
                    <p className="text-xs text-emerald-500 mt-1 font-mono">ID: {selectedColab.identificador}</p>
                    <button type="button" onClick={() => { setSelectedColab(null); setManualId(""); setColabResults([]); }} className="text-xs text-slate-400 mt-4 underline">Trocar Pessoa</button>
                  </div>
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
                <div className="bg-slate-950 rounded-xl overflow-hidden border-2 border-sky-500/60 shadow-inner">
                  <SignatureCanvas 
                    ref={sigCanvas} 
                    penColor="white"
                    canvasProps={{className: 'w-full h-80 cursor-crosshair'}}
                    onEnd={() => setHasSignature(true)}
                  />
                </div>
              </div>

              <button 
                type="submit"
                disabled={isSubmitting || manualId.length < 3 || !hasSignature}
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-lg disabled:opacity-50"
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
