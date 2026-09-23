import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import * as xlsx from 'xlsx';

export async function POST(req: Request) {
  try {
    console.log("Iniciando sincronização (Lendo base PT_Digital_Permissoes_de_Trabalho.xlsx)...");
    
    // Pequeno delay para a UI mostrar que está carregando
    await new Promise(r => setTimeout(r, 2000));
    
    // Usando caminho absoluto para evitar bugs do process.cwd() no Next.js
    const targetDir = "C:\\Users\\ansantos\\OneDrive - CMPC\\Área de Trabalho\\APK";
    const excelPath = path.join(targetDir, 'PT_Digital_Permissoes_de_Trabalho.xlsx');
    
    console.log("Procurando planilha em:", excelPath);

    if (!fs.existsSync(excelPath)) {
        console.error("ERRO: Planilha não encontrada em", excelPath);
        return NextResponse.json({ success: false, error: "Planilha PT_Digital_Permissoes_de_Trabalho.xlsx não encontrada na pasta APK" }, { status: 500 });
    }

    console.log("Planilha encontrada! Lendo dados...");
    const wb = xlsx.readFile(excelPath);
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(sheet);
    console.log("Planilha lida com", data.length, "linhas!");
    
    const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    let countsByMonth: Record<string, number> = {};
    monthNames.forEach(m => countsByMonth[m] = 0);

    data.forEach((row: any) => {
        // A coluna de data agora se chama 'Fecha de inicio'
        const d = row['Fecha de inicio'] || row['Fecha de creación'];
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

    // Pega todos os meses até o mês atual (ou meses que tem dados)
    const dadosExtraidos = monthNames.map(mes => ({ mes, pt: countsByMonth[mes] }))
        .filter(d => d.pt > 0 || monthNames.indexOf(d.mes) <= new Date().getMonth());

    console.log("Sincronização concluída com sucesso via base Excel!");
    return NextResponse.json({ 
      success: true, 
      message: "Dados sincronizados com sucesso da PT Digital!",
      data: dadosExtraidos,
      rawTable: data // Enviando a tabela inteira com Solicitante, Área, Status, etc.
    });

  } catch (error: any) {
    console.error("Erro na leitura da base:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
