"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { PieChart, Activity, Users, Target, CheckCircle, Wrench, Settings, UploadCloud, Download, MessageSquare, QrCode } from "lucide-react";
import PTChart from "./components/PTChart";
import PTBaselineChart from "./components/PTBaselineChart";
import PTMonthlyChart from "./components/PTMonthlyChart";
import PTAreaAdocaoChart from "./components/PTAreaAdocaoChart";
import * as XLSX from "xlsx";
import { QRCodeSVG } from "qrcode.react";

export default function OnePageDashboard() {
  const [loading, setLoading] = useState(true);
  const [treinamentos, setTreinamentos] = useState<any[]>([]);
  const [filterPais, setFilterPais] = useState("");
  const [filterCurso, setFilterCurso] = useState("");
  const [ptMonthlyData, setPtMonthlyData] = useState<any[]>([]);
  const [ptRawData, setPtRawData] = useState<any[]>([]);
  const [filtroPlantaPt, setFiltroPlantaPt] = useState<"Todas" | "Guaíba" | "Santa Fe">("Todas");
  const [filtroAreaPt, setFiltroAreaPt] = useState<string>("Todas");
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
    
  const [comentarios, setComentarios] = useState("");
  const comentariosRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (comentariosRef.current) {
        comentariosRef.current.style.height = 'auto';
        comentariosRef.current.style.height = comentariosRef.current.scrollHeight + 'px';
    }
  }, [comentarios]);


    // Carregar dos cookies/local storage no lado do cliente
    useEffect(() => {
        const salvo = localStorage.getItem("pt_dashboard_comentarios");
        if (salvo) {
            setComentarios(salvo);
        } else {
            setComentarios("Status do Projeto:\n\n- Plataforma Lignia em fase de adoção.\n- RCs para compra de tablets emitidas e aguardando aprovação.\n- Treinamentos operacionais em andamento.");
        }
    }, []);

    // Salvar sempre que editar
    const handleComentarioChange = (e: any) => {
        setComentarios(e.target.value);
        localStorage.setItem("pt_dashboard_comentarios", e.target.value);
    };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      if (typeof bstr !== "string" && !(bstr instanceof ArrayBuffer)) return;
      const wb = XLSX.read(bstr, { type: "binary" });
      let data: any[] = [];
        // Acha a aba que tem os dados de verdade (procura por "Estado" ou "Solicitante")
        for (const sheetName of wb.SheetNames) {
            const sheetData = XLSX.utils.sheet_to_json(wb.Sheets[sheetName]);
            if (sheetData.length > 0 && Object.keys(sheetData[0]).length > 10) {
                data = sheetData;
                break;
            }
        }
        if (data.length === 0) {
            data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
        }
        const blacklist = ["boxboard", "andre.santos", "ansantos", "regis", "mariele", "nidio", "maldonado", "escobar"];
        const validStatuses = ["Fechado", "Liberado para Execução"];
        
        const cleanedData = data.filter((row: any) => {
            const solicitante = (row['Solicitante'] || "").toLowerCase();
            const isBlacklisted = blacklist.some(bad => solicitante.includes(bad));
            const isValidStatus = validStatuses.includes(row['Estado']);
            
            return !isBlacklisted && isValidStatus;
        });
        
        setPtRawData(cleanedData);
      setLastSyncTime(new Date().toLocaleTimeString());
    };
    reader.readAsBinaryString(file);
  };

  
  
  // Mapeamento inteligente de áreas
    const normalizeArea = (rawArea: string) => {
        if (!rawArea) return 'Outros';
        const a = rawArea.toUpperCase();
        
        // Pátio de Madeiras
        if (a.includes('PATIO') || a.includes('PÁTIO') || a.includes('CAVACO') || a.includes('MADEIRA') || a.includes('ASTIL') || a.includes('MADERAS') || a.includes('ROLLIZOS')) {
            return 'Pátio';
        }
        // Caustificação
        if (a.includes('CAUST')) {
            return 'Caustif.';
        }
        // Caldeira de Recuperação
        if (a.includes('RECUP') || a.includes('CR3')) {
            return 'CR';
        }
        // Linha de Fibras
        if (a.includes('FIBRA') || a.includes('BRANQ') || a.includes('BLANQ') || a.includes('LAVADO') || a.includes('DIG.CONT') || a.includes('PULPA') || a.includes('CELULOSE')) {
            return 'L. Fibras';
        }
        // Águas / Efluentes (ETA, ETE)
        if (a.includes('ETA') || a.includes('ETE') || a.includes('ÁGUA') || a.includes('AGUA') || a.includes('EFLUENTE') || a.includes('DESMINERALIZA')) {
            return 'Águas';
        }
        // Energia
        if (a.includes('ENERGIA') || a.includes('BIOMAS') || a.includes('UTILIDADES')) {
            return 'Energia';
        }
        // Secagem
        if (a.includes('SECAGEM') || a.includes('SECADO')) {
            return 'Secagem';
        }
        // Planta Química
        if (a.includes('QUIM') || a.includes('QUÍM') || a.includes('CLORO') || a.includes('SODA')) {
            return 'Pl. Quím.';
        }
        // Defapa
        if (a.includes('DEFAPA')) {
            return 'Defapa';
        }
        
        // Se não for nenhuma das principais, retorna o nome limpo e resumido
        let clean = rawArea.trim();
        if (clean.length > 15) clean = clean.substring(0, 15) + '...';
        return clean;
    };

  const filteredPtMonthlyData = useMemo(() => {
    if (ptRawData.length === 0) return [];
    
    let filteredData = ptRawData;
    if (filtroPlantaPt !== "Todas") {
       filteredData = filteredData.filter(r => r["Planta"] === filtroPlantaPt || r["Planta"] === (filtroPlantaPt === "Guaíba" ? "Guaiba" : "Santa Fe"));
    }
    if (filtroAreaPt !== "Todas") {
       filteredData = filteredData.filter(r => normalizeArea(r['Área de operación']) === filtroAreaPt);
    }

    const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    let countsByMonth: Record<string, number> = {};
    monthNames.forEach(m => countsByMonth[m] = 0);

    filteredData.forEach((row: any) => {
        const d = row['Fecha de inicio'] || row['Fecha de creación'] || row['Data de Início'];
        if (d) {
            const parts = d.split('/');
            if (parts.length >= 2) {
                const m = parseInt(parts[1], 10) - 1;
                if(m >= 0 && m < 12) {
                    countsByMonth[monthNames[m]]++;
                }
            }
        }
    });

    return monthNames.map(mes => ({ mes, pt: countsByMonth[mes] }))
        .filter(d => d.pt > 0 || monthNames.indexOf(d.mes) <= new Date().getMonth());
  }, [ptRawData, filtroPlantaPt, filtroAreaPt]);

  const filteredPtAreaChartData = useMemo(() => {
    if (ptRawData.length === 0) return [];
    
    let filteredData = ptRawData;
    if (filtroPlantaPt !== "Todas") {
       filteredData = ptRawData.filter(r => r["Planta"] === filtroPlantaPt || r["Planta"] === (filtroPlantaPt === "Guaíba" ? "Guaiba" : "Santa Fe"));
    }

    

    const areas: Record<string, number> = {
        "L. Fibras": 0, "Pátio": 0, "Caustif.": 0, "CR": 0, "Secagem": 0, "Águas": 0, "Defapa": 0, "Pl. Quím.": 0, "Energia": 0
    };
    filteredData.forEach((r: any) => {
        let a = r['Área de operación'];
        const normalized = normalizeArea(a);
        areas[normalized] = (areas[normalized] || 0) + 1;
    });

    return Object.keys(areas)
        .map(area => ({ area, pt: areas[area] }))
        // Não filtramos mais com slice(0, 9) pra garantir que mostre as 9 + Outros + Não informada se tiverem
        .sort((a,b) => b.pt - a.pt);
  }, [ptRawData, filtroPlantaPt]);


  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/treinamentos?t=${Date.now()}`);
        const json = await res.json();
        if (json.success) setTreinamentos(json.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Lista de Cursos Únicos para o Filtro
  const cursosUnicos = useMemo(() => {
    const cursos = new Set<string>();
    treinamentos.forEach(t => {
      if (t.nome) cursos.add(t.nome.trim());
    });
    return Array.from(cursos).sort();
  }, [treinamentos]);

  // Cálculos Reais
  const stats = useMemo(() => {
    let totalEsperado = 0;
    let totalCapacitados = 0;
    let turmasAtivas = 0;

    const areasMap: Record<string, { nome: string, total: number, feitos: number, isManutencao: boolean, isOperacao: boolean }> = {};
    const turmasArray: any[] = [];

    let filtrados = treinamentos;
    if (filterPais) {
      filtrados = filtrados.filter(t => t.pais === filterPais);
    }
    if (filterCurso) {
      filtrados = filtrados.filter(t => t.nome?.trim() === filterCurso);
    }

    filtrados.forEach(t => {
      const previstos = t._count?.previstos || 0;
      const registros = t._count?.registros || 0;
      
      if (t.esperado_manual !== undefined && t.esperado_manual !== null) { totalEsperado += t.esperado_manual; } else { totalEsperado += previstos; }
      totalCapacitados += registros;
      
      if (!t.status_encerrado) {
        turmasAtivas++;
      }

      // Agrupamento por Área (Nome da Turma)
      const nomeArea = t.turma ? t.turma.trim().toUpperCase() : (t.nome ? t.nome.trim().toUpperCase() : 'DESCONHECIDO');
      
      if (!areasMap[nomeArea]) {
        areasMap[nomeArea] = {
          nome: nomeArea,
          total: 0,
          feitos: 0,
          isManutencao: nomeArea.includes('MANUTENÇÃO') || nomeArea.includes('MANUTENCAO'),
          isOperacao: nomeArea.includes('OPERAÇÃO') || nomeArea.includes('OPERACAO') || nomeArea.includes('MAQUINA') || nomeArea.includes('MÁQUINA')
        };
      }
      
      areasMap[nomeArea].total += previstos;
      areasMap[nomeArea].feitos += registros;

      // Turmas individuais
      turmasArray.push({
        nome: nomeArea,
        curso: t.nome,
        avanco: previstos > 0 ? Math.round((registros / previstos) * 100) : 0,
        faltantes: Math.max(0, previstos - registros),
        isEncerrado: t.status_encerrado,
        data: t.data
      });
    });

    const avancoGlobal = totalEsperado > 0 ? ((totalCapacitados / totalEsperado) * 100).toFixed(1) : "0.0";

    const areas = Object.values(areasMap).map(a => ({
      ...a,
      avanco: a.total > 0 ? Math.round((a.feitos / a.total) * 100) : 0
    })).sort((a, b) => b.avanco - a.avanco); // Ordena por maior avanço

    const areasManutencao = areas.filter(a => a.isManutencao);
    const areasOperacao = areas.filter(a => a.isOperacao);
    const areasOutros = areas.filter(a => !a.isManutencao && !a.isOperacao);

    return { 
      totalEsperado, 
      totalCapacitados, 
      avancoGlobal, 
      turmasAtivas, 
      areasManutencao, 
      areasOperacao, 
      areasOutros,
      turmasArray: turmasArray.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()).slice(0, 50) // Ultimas 50
    };
  }, [treinamentos, filterPais, filterCurso]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-sky-500"></div>
      </div>
    );
  }

  
  const gerarPDF = async () => {
    try {
      const { jsPDF } = await import('jspdf');
      const { toJpeg } = await import('html-to-image');
      
      const el = document.getElementById('pdf-dashboard-wrapper');
      if (!el) return;
      
      // Inject Light Mode CSS temporarily
      const style = document.createElement('style');
      style.innerHTML = `
        .pdf-mode { background-color: #ffffff !important; }
        .pdf-mode [class*="bg-slate-950"], 
        .pdf-mode [class*="bg-slate-900"] { 
            background-color: #ffffff !important; 
        }
        .pdf-mode [class*="bg-slate-800"] { 
            background-color: #f1f5f9 !important; 
        }
        .pdf-mode [class*="border-slate-800"],
        .pdf-mode [class*="border-slate-700"] {
            border-color: #cbd5e1 !important;
        }
        .pdf-mode [class*="text-white"], 
        .pdf-mode [class*="text-slate-200"] { 
            color: #0f172a !important; 
        }
        .pdf-mode [class*="text-slate-400"],
        .pdf-mode [class*="text-slate-500"] {
            color: #475569 !important;
        }
        /* Fix chart axis text */
        .pdf-mode text {
            fill: #475569 !important;
        }
        .pdf-mode .recharts-cartesian-grid-horizontal line, 
        .pdf-mode .recharts-cartesian-grid-vertical line {
            stroke: #e2e8f0 !important;
        }
        /* Fix specific chart colors for light mode */
        .pdf-mode path.recharts-rectangle[name="Meta"] {
            fill: #e2e8f0 !important;
        }
        .pdf-mode text[fill="#ffffff"] { fill: #0f172a !important; text-shadow: none !important; }
        .pdf-mode .pdf-textarea { resize: none !important; border-color: transparent !important; background: transparent !important; color: #0f172a !important; padding: 0 !important; }
        /* Esconder o botao de PDF no PDF */
        .pdf-mode-hide {
            display: none !important;
        }
      `;
      document.head.appendChild(style);
      
      // Hide the PDF button during capture
      const btn = el.querySelector("#btn-gerar-pdf");
      if (btn) btn.classList.add('pdf-mode-hide');
      
      const uploadSec = el.querySelector('#upload-section');
      if (uploadSec) uploadSec.classList.add('pdf-mode-hide');
      
      el.classList.add('pdf-mode');
      
      
      // SVGs inline manipulation for PDF (html-to-image doesn't always override SVG attributes well)
      const svgTexts = el.querySelectorAll('text');
      const originalFills = [];
      const originalShadows = [];
      svgTexts.forEach(t => {
          const f = t.getAttribute('fill');
          originalFills.push(f);
          originalShadows.push(t.style.textShadow);
          
          if (f === '#ffffff' || f === '#f8fafc' || f === '#f1f5f9') {
              t.setAttribute('fill', '#0f172a');
          }
          t.style.textShadow = 'none';
      });

      const metaBars = el.querySelectorAll('path[name="Meta"]');
      const originalMetaFills = [];
      metaBars.forEach(b => {
          originalMetaFills.push(b.getAttribute('fill'));
          b.setAttribute('fill', '#cbd5e1'); // light slate for the PDF background
      });
      
      // Expandir textareas para caber todo o conteudo no PDF
        const textareas = Array.from(el.querySelectorAll('textarea'));
        const originalTaHeights = textareas.map(ta => ta.style.height);
        textareas.forEach(ta => {
            ta.style.height = 'auto'; // reseta
            ta.style.height = ta.scrollHeight + 'px'; // estica pra caber o conteudo real
        });
        
        // Wait a tiny bit for styles to apply
        await new Promise(r => setTimeout(r, 100));
      
      const imgData = await toJpeg(el, { 
          quality: 0.95, 
          backgroundColor: '#ffffff', 
          pixelRatio: 2,
          style: { padding: '20px' } // Add padding so it's not glued to the edge
      });
      
      
      el.classList.remove('pdf-mode');
        
        // Restaurar textareas
        textareas.forEach((ta, i) => {
            ta.style.height = originalTaHeights[i];
        });
      
      // Restore SVGs
      svgTexts.forEach((t, i) => {
          if (originalFills[i]) t.setAttribute('fill', originalFills[i]);
          t.style.textShadow = originalShadows[i];
      });
      metaBars.forEach((b, i) => {
          if (originalMetaFills[i]) b.setAttribute('fill', originalMetaFills[i]);
      });
      
      if (btn) btn.classList.remove('pdf-mode-hide');
      if (uploadSec) uploadSec.classList.remove('pdf-mode-hide');
      style.remove();
      
      const tempDoc = new jsPDF('p', 'mm', 'a4');
      const imgProps = tempDoc.getImageProperties(imgData);
      
      // Criar um PDF com tamanho customizado exatamente igual à imagem (relatório contínuo digital)
      const doc = new jsPDF({
        orientation: imgProps.width > imgProps.height ? 'l' : 'p',
        unit: 'px',
        format: [imgProps.width, imgProps.height]
      });
      
      doc.addImage(imgData, 'JPEG', 0, 0, imgProps.width, imgProps.height);
      doc.save(`Dashboard_${filterCurso || 'Geral'}.pdf`);
      
    } catch (e) {
      console.error(e);
      alert('Erro ao gerar PDF com gráficos.');
      // ensure cleanup
      document.getElementById('pdf-dashboard-wrapper')?.classList.remove('pdf-mode');
    }
  };

  return (
    <div id="pdf-dashboard-wrapper" className="space-y-8 animate-in fade-in duration-500 pb-20 p-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <PieChart className="h-8 w-8 text-sky-400" />
            Visão Geral (OnePage)
          </h1>
          <p className="text-slate-400 mt-2 text-sm max-w-2xl">
            Acompanhamento gerencial do progresso das capacitações por turmas e áreas.
          </p>
        </div>
        
        {/* Filtros */}
        <div className="flex items-center gap-2 flex-wrap">
            <button id="btn-gerar-pdf" onClick={gerarPDF}
              className="bg-sky-600/20 hover:bg-sky-500 text-sky-400 hover:text-white font-bold py-2 px-4 rounded-xl flex items-center gap-2 text-xs border border-sky-500/30 shadow-lg transition-all"
            >
              <Download className="h-4 w-4" />
              Gerar PDF (Resumo)
            </button>

          <select 
            value={filterCurso} 
            onChange={(e) => setFilterCurso(e.target.value)} 
            className="px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm font-bold text-slate-300 outline-none focus:border-sky-500 transition-colors cursor-pointer max-w-xs"
          >
            <option value="">📚 Todos os Cursos</option>
            {cursosUnicos.map((c, i) => (
              <option key={i} value={c}>{c}</option>
            ))}
          </select>

          <select 
            value={filterPais} 
            onChange={(e) => setFilterPais(e.target.value)} 
            className="px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm font-bold text-slate-300 outline-none focus:border-sky-500 transition-colors cursor-pointer"
          >
            <option value="">🌎 Todos os Países</option>
            <option value="BRASIL">Brasil</option>
            <option value="CHILE">Chile</option>
          </select>
        </div>
      </div>

      {/* KPIs Principais */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl flex flex-col justify-between">
          <div className="flex items-start justify-between mb-4">
            <h3 className="text-slate-400 font-medium text-sm">Total Esperado</h3>
            <div className="p-2 bg-slate-800 rounded-lg"><Users className="h-4 w-4 text-slate-300" /></div>
          </div>
          <div>
            <div className="text-3xl font-black text-white">{stats.totalEsperado}</div>
            <p className="text-xs text-slate-500 mt-1">Colaboradores em públicos-alvo</p>
          </div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl flex flex-col justify-between">
          <div className="flex items-start justify-between mb-4">
            <h3 className="text-slate-400 font-medium text-sm">Total Capacitados</h3>
            <div className="p-2 bg-emerald-900/30 rounded-lg"><CheckCircle className="h-4 w-4 text-emerald-400" /></div>
          </div>
          <div>
            <div className="text-3xl font-black text-emerald-400">{stats.totalCapacitados}</div>
            <p className="text-xs text-slate-500 mt-1">Presenças registradas</p>
          </div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl flex flex-col justify-between">
          <div className="flex items-start justify-between mb-4">
            <h3 className="text-slate-400 font-medium text-sm">Avanço Global</h3>
            <div className="p-2 bg-sky-900/30 rounded-lg"><Target className="h-4 w-4 text-sky-400" /></div>
          </div>
          <div>
            <div className="text-3xl font-black text-sky-400">{stats.avancoGlobal}%</div>
            <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
              <div className="bg-sky-400 h-1.5 rounded-full" style={{ width: `${stats.avancoGlobal}%` }}></div>
            </div>
          </div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl flex flex-col justify-between">
          <div className="flex items-start justify-between mb-4">
            <h3 className="text-slate-400 font-medium text-sm">Turmas Ativas</h3>
            <div className="p-2 bg-amber-900/30 rounded-lg"><Activity className="h-4 w-4 text-amber-400" /></div>
          </div>
          <div>
            <div className="text-3xl font-black text-amber-400">{stats.turmasAtivas}</div>
            <p className="text-xs text-slate-500 mt-1">Em andamento ou agendadas</p>
          </div>
        </div>
      </div>

            {/* Upload Excel Section */}
        <div id="upload-section" className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 mt-8">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <UploadCloud className="h-5 w-5 text-emerald-400" /> Upload de Planilha PT
          </h3>
          <p className="text-sm text-slate-400">Faça o upload da planilha Excel (PT_Digital...) para gerar os gráficos.</p>
        </div>
        <div className="flex items-center gap-4">
          {lastSyncTime && (
            <span className="text-slate-400 text-sm">
              Última atualização: <strong className="text-white">{lastSyncTime}</strong>
            </span>
          )}
          <div className="relative">
            <input
              type="file"
              accept=".xlsx, .xls"
              onChange={handleFileUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <button className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2 px-6 rounded-xl transition-colors shadow-lg shadow-emerald-900/20 flex items-center gap-2">
              <UploadCloud className="h-4 w-4" />
              Subir Planilha
            </button>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start mt-8">
          <PTBaselineChart planta="Guaíba" />
          <PTBaselineChart planta="Santa Fe" />
        </div>
            <div className="grid grid-cols-1 gap-8 items-start mt-8">
        
        {ptRawData.length > 0 ? (
          <div className="flex flex-col h-full">
            <div className="flex gap-2 mb-4 justify-end">
              <button 
                onClick={() => setFiltroPlantaPt("Todas")}
                className={`px-4 py-1.5 text-xs font-bold rounded-full transition-colors ${filtroPlantaPt === "Todas" ? "bg-emerald-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"}`}
              >
                Todas
              </button>
              <button 
                onClick={() => setFiltroPlantaPt("Guaíba")}
                className={`px-4 py-1.5 text-xs font-bold rounded-full transition-colors ${filtroPlantaPt === "Guaíba" ? "bg-emerald-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"}`}
              >
                Planta Guaíba
              </button>
              <button 
                onClick={() => setFiltroPlantaPt("Santa Fe")}
                className={`px-4 py-1.5 text-xs font-bold rounded-full transition-colors ${filtroPlantaPt === "Santa Fe" ? "bg-emerald-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"}`}
              >
                Planta Santa Fe
              </button>
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 w-full">
                <div className="xl:col-span-2 flex flex-col">
                  <PTMonthlyChart 
                    monthlyData={filteredPtMonthlyData} 
                    filtroPlantaPt={filtroPlantaPt}
                    filtroAreaPt={filtroAreaPt}
                    setFiltroAreaPt={setFiltroAreaPt}
                    areasDisponiveis={filteredPtAreaChartData.map((d: any) => d.area)}
                  />
                </div>
                <div className="xl:col-span-1 flex flex-col">
                  <PTAreaAdocaoChart 
                    ptRawData={ptRawData} 
                    filtroPlantaPt={filtroPlantaPt} 
                  />
                </div>
              </div>
            </div>
          ) : (
          <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl flex flex-col items-center justify-center w-full h-full min-h-[300px] max-w-4xl mx-auto">
             <UploadCloud className="h-12 w-12 text-slate-700 mb-4" />
             <p className="text-slate-500 font-medium text-center">Faça o upload da planilha<br/>para visualizar os dados.</p>
          </div>
        )}
      </div>
      
        {/* Informações Gerais e QR Code */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mt-8">
            <div className="xl:col-span-2 bg-slate-900/50 border border-slate-800 p-6 rounded-2xl flex flex-col">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-sky-400" />
                    Status e Comentários Gerais
                </h3>
                <textarea ref={comentariosRef} 
                    className="w-full bg-slate-800/80 hover:bg-slate-800 border-2 border-slate-700 hover:border-slate-600 rounded-xl p-4 text-slate-300 text-sm resize-none outline-none focus:border-sky-500 focus:bg-slate-900 transition-all min-h-[120px] pdf-textarea cursor-text shadow-inner overflow-hidden" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                    value={comentarios}
                    onChange={handleComentarioChange}
                    placeholder="Digite aqui as informações gerais, status de RCs, etc..."
                />
            </div>
            <div className="xl:col-span-1 bg-slate-900/50 border border-slate-800 p-6 rounded-2xl flex items-center justify-center gap-6">
                <div className="bg-white p-2 rounded-xl shadow-lg shrink-0">
                    <QRCodeSVG value="https://competitividad.cmpc-innovation.com/pt_digital" size={96} level="L" includeMargin={false} />
                </div>
                <div className="flex flex-col gap-2">
                    <h3 className="text-white font-bold flex items-center gap-2">
                        <QrCode className="h-4 w-4 text-emerald-400" /> Acesso Lignia
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed">Escaneie o QR Code com a câmera do seu celular ou clique no link abaixo para acessar a Plataforma Digital de PT.</p>
                    <a href="https://competitividad.cmpc-innovation.com/pt_digital" target="_blank" className="text-sky-400 text-xs font-bold hover:underline break-all mt-1">
                        competitividad.cmpc-innovation.com/pt_digital
                    </a>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 gap-8 items-start mt-8">
          {/* Avanço por Área */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl flex flex-col">
          <div className="p-6 border-b border-slate-800 sticky top-0 bg-slate-900/90 backdrop-blur z-10 rounded-t-2xl">
            {filterCurso && (
                 <div className="mb-4 pb-4 border-b border-slate-700/50">
                    <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-blue-500 uppercase tracking-tight">
                        {filterCurso}
                    </h2>
                    <p className="text-xs text-sky-500 uppercase tracking-widest mt-1 font-bold">Curso Filtrado</p>
                 </div>
              )}
              <h3 className="text-lg font-bold text-white">Avanço de Treinamentos por Área</h3>
            <p className="text-sm text-slate-400">Progresso separado por Operação e Manutenção</p>
          </div>
          <div className="p-6 space-y-8">
            
            {/* Bloco Operação */}
            {stats.areasOperacao.length > 0 && (
              <div>
                <h4 className="text-sm font-bold text-sky-400 uppercase tracking-wider mb-4 border-b border-slate-800 pb-2 flex items-center gap-2">
                  <Settings className="h-4 w-4" /> Operação
                </h4>
                <div className="space-y-4">
                  {stats.areasOperacao.map((area, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                        <span className="font-bold text-slate-200 text-xs tracking-wide w-1/3 line-clamp-2 leading-tight" title={area.nome}>{area.nome}</span>
                        <div className="flex-1 bg-slate-800/80 rounded-full h-5 overflow-hidden flex border border-slate-700/50">
                          <div 
                            className={`h-5 rounded-full transition-all duration-1000 ${
                              area.avanco >= 80 ? 'bg-emerald-500' : 
                              area.avanco >= 50 ? 'bg-amber-400' : 'bg-rose-500'
                            }`}
                            style={{ width: `${area.avanco}%` }}
                          ></div>
                        </div>
                        <span className="text-xs text-slate-400 font-medium shrink-0 w-24 text-right">{area.feitos} / {area.total} ({area.avanco}%)</span>
                      </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bloco Manutenção */}
            {stats.areasManutencao.length > 0 && (
              <div>
                <h4 className="text-sm font-bold text-amber-400 uppercase tracking-wider mb-4 border-b border-slate-800 pb-2 flex items-center gap-2">
                  <Wrench className="h-4 w-4" /> Manutenção
                </h4>
                <div className="space-y-4">
                  {stats.areasManutencao.map((area, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                        <span className="font-bold text-slate-200 text-xs tracking-wide w-1/3 line-clamp-2 leading-tight" title={area.nome}>{area.nome}</span>
                        <div className="flex-1 bg-slate-800/80 rounded-full h-5 overflow-hidden flex border border-slate-700/50">
                          <div 
                            className={`h-5 rounded-full transition-all duration-1000 ${
                              area.avanco >= 80 ? 'bg-emerald-500' : 
                              area.avanco >= 50 ? 'bg-amber-400' : 'bg-rose-500'
                            }`}
                            style={{ width: `${area.avanco}%` }}
                          ></div>
                        </div>
                        <span className="text-xs text-slate-400 font-medium shrink-0 w-24 text-right">{area.feitos} / {area.total} ({area.avanco}%)</span>
                      </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bloco Outros */}
            {stats.areasOutros.length > 0 && (
              <div>
                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-800 pb-2 flex items-center gap-2">
                  Demais Áreas
                </h4>
                <div className="space-y-4">
                  {stats.areasOutros.map((area, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                        <span className="font-bold text-slate-200 text-xs tracking-wide w-1/3 line-clamp-2 leading-tight" title={area.nome}>{area.nome}</span>
                        <div className="flex-1 bg-slate-800/80 rounded-full h-5 overflow-hidden flex border border-slate-700/50">
                          <div 
                            className={`h-5 rounded-full transition-all duration-1000 ${
                              area.avanco >= 80 ? 'bg-emerald-500' : 
                              area.avanco >= 50 ? 'bg-amber-400' : 'bg-rose-500'
                            }`}
                            style={{ width: `${area.avanco}%` }}
                          ></div>
                        </div>
                        <span className="text-xs text-slate-400 font-medium shrink-0 w-24 text-right">{area.feitos} / {area.total} ({area.avanco}%)</span>
                      </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>


      </div>
    </div>
  );
}
