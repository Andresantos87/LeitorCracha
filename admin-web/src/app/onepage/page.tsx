"use client";

import React, { useState, useEffect, useMemo } from "react";
import { PieChart, Activity, Users, Target, CheckCircle, Wrench, Settings, UploadCloud, Download } from "lucide-react";
import PTChart from "./components/PTChart";
import PTBaselineChart from "./components/PTBaselineChart";
import PTMonthlyChart from "./components/PTMonthlyChart";
import * as XLSX from "xlsx";

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
      
      const doc = new jsPDF('p', 'mm', 'a4');
      doc.setFontSize(18);
      doc.setTextColor(15, 23, 42);
      doc.text(`Relatório de Adoção: ${filterCurso || 'Geral'}`, 14, 20);
      
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`País: ${filterPais || 'Todos'} | Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 14, 26);
      
      let currentY = 35;
      
      const captureAndAdd = async (id) => {
         const el = document.getElementById(id);
         if (!el) return;
         if (currentY > 200) { doc.addPage(); currentY = 20; }
         
         const imgData = await toJpeg(el, { quality: 0.9, backgroundColor: '#020617', pixelRatio: 2 });
         const imgProps = doc.getImageProperties(imgData);
         const pdfWidth = 190;
         const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
         doc.addImage(imgData, 'JPEG', 10, currentY, pdfWidth, pdfHeight);
         currentY += pdfHeight + 10;
      };
      
      await captureAndAdd('chart-monthly');
      await captureAndAdd('chart-baseline-1');
      await captureAndAdd('chart-baseline-2');
      
      doc.save(`Relatorio_Visao_Geral.pdf`);
    } catch (e) {
      console.error(e);
      alert('Erro ao gerar PDF com gráficos.');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
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
            <button 
              onClick={gerarPDF}
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
      <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 mt-8">
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
            <PTMonthlyChart 
              monthlyData={filteredPtMonthlyData} 
              filtroPlantaPt={filtroPlantaPt}
              filtroAreaPt={filtroAreaPt}
              setFiltroAreaPt={setFiltroAreaPt}
              areasDisponiveis={filteredPtAreaChartData.map((d: any) => d.area)}
            />
          </div>
        ) : (
          <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl flex flex-col items-center justify-center w-full h-full min-h-[300px] max-w-4xl mx-auto">
             <UploadCloud className="h-12 w-12 text-slate-700 mb-4" />
             <p className="text-slate-500 font-medium text-center">Faça o upload da planilha<br/>para visualizar os dados.</p>
          </div>
        )}
      </div>
      <div className="grid grid-cols-1 gap-8 items-start mt-8">
        {/* Avanço por Área */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl flex flex-col">
          <div className="p-6 border-b border-slate-800 sticky top-0 bg-slate-900/90 backdrop-blur z-10 rounded-t-2xl">
            <h3 className="text-lg font-bold text-white">Avanço por Área</h3>
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
                    <div key={idx} className="space-y-1.5">
                      <div className="flex justify-between items-end">
                        <span className="font-bold text-slate-200 text-xs tracking-wide">{area.nome}</span>
                        <span className="text-[10px] text-slate-400 font-medium">{area.feitos} / {area.total} ({area.avanco}%)</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden flex">
                        <div 
                          className={`h-1.5 rounded-full transition-all duration-1000 ${
                            area.avanco >= 80 ? 'bg-emerald-500' : 
                            area.avanco >= 50 ? 'bg-sky-500' : 'bg-rose-500'
                          }`}
                          style={{ width: `${area.avanco}%` }}
                        ></div>
                      </div>
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
                    <div key={idx} className="space-y-1.5">
                      <div className="flex justify-between items-end">
                        <span className="font-bold text-slate-200 text-xs tracking-wide">{area.nome}</span>
                        <span className="text-[10px] text-slate-400 font-medium">{area.feitos} / {area.total} ({area.avanco}%)</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden flex">
                        <div 
                          className={`h-1.5 rounded-full transition-all duration-1000 ${
                            area.avanco >= 80 ? 'bg-emerald-500' : 
                            area.avanco >= 50 ? 'bg-sky-500' : 'bg-rose-500'
                          }`}
                          style={{ width: `${area.avanco}%` }}
                        ></div>
                      </div>
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
                    <div key={idx} className="space-y-1.5">
                      <div className="flex justify-between items-end">
                        <span className="font-bold text-slate-200 text-xs tracking-wide">{area.nome}</span>
                        <span className="text-[10px] text-slate-400 font-medium">{area.feitos} / {area.total} ({area.avanco}%)</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden flex">
                        <div 
                          className={`h-1.5 rounded-full transition-all duration-1000 ${
                            area.avanco >= 80 ? 'bg-emerald-500' : 
                            area.avanco >= 50 ? 'bg-sky-500' : 'bg-rose-500'
                          }`}
                          style={{ width: `${area.avanco}%` }}
                        ></div>
                      </div>
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
