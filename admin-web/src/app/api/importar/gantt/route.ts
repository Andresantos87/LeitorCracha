import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import * as xlsx from 'xlsx';

export const dynamic = 'force-dynamic';

function parseDateHeader(header: string): string | null {
  // Ex: "17/08 Seg"
  if (!header || typeof header !== 'string') return null;
  const match = header.match(/^(\d{2})\/(\d{2})/);
  if (match) {
    const day = match[1];
    const month = match[2];
    const year = new Date().getFullYear(); // Ou puxar da string de período
    return `${year}-${month}-${day}`;
  }
  return null;
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) return NextResponse.json({ success: false, error: 'Arquivo não encontrado' }, { status: 400 });

    const buffer = await file.arrayBuffer();
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    const data = xlsx.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

    const dateRow = data[4]; // Linha 5 no Excel
    const timeRow = data[5]; // Linha 6 no Excel

    if (!dateRow || !timeRow) {
      return NextResponse.json({ success: false, error: 'Formato inválido (linhas de data/hora não encontradas)' }, { status: 400 });
    }

    const turmasToCreate: any[] = [];
    let turmasProcessadas = 0;

    // A partir da linha 7
    for (let r = 6; r < data.length; r++) {
      const row = data[r];
      if (!row || !row[0]) continue; // Pula linha vazia

      const area = row[0]; // Área/Equipe
      const facilitador = row[1]; // TS Responsável

      for (let c = 2; c < row.length; c++) {
        const cellValue = row[c];
        if (cellValue && typeof cellValue === 'string') {
          // Achar a data correspondente (olhar pra trás no dateRow até achar algo não-nulo)
          let dateHeader = null;
          for (let hc = c; hc >= 2; hc--) {
            if (dateRow[hc]) {
              dateHeader = dateRow[hc];
              break;
            }
          }
          
          const parsedDate = parseDateHeader(dateHeader);
          if (!parsedDate) continue;

          let timeHeader = timeRow[c]; // Ex: 14h, 17h
          let cargaHoraria = 3; // Padrão
          let horarioFinal = "14:00";
          if (timeHeader && typeof timeHeader === 'string') {
             if (timeHeader.includes('17h')) horarioFinal = "17:00";
             else if (timeHeader.includes('14h')) horarioFinal = "14:00";
          }
          
          if (cellValue.includes('08h30-09h30')) {
             horarioFinal = "08:30";
             cargaHoraria = 1;
          } else if (cellValue.toLowerCase().includes('acidente') || cellValue.toLowerCase().includes('nao teve')) {
             continue; // ignora turmas que já dizem no gantt que não tiveram ou foram acidentes
          }

          turmasToCreate.push({
            nome: `${area} - ${cellValue}`,
            turma: cellValue,
            pais: 'BRASIL', // ou detectar
            planta: 'GUAÍBA (RAINBOW)',
            instrutor_email: 'N/A',
            data: serverTimestamp(),
            data_agendada: parsedDate,
            horario_agendado: horarioFinal,
            carga_horaria: cargaHoraria,
            status_agenda: 'AGENDADO',
            status_encerrado: false,
            checklist_dinamico: [],
            facilitador_nome: facilitador || 'N/A',
            modo_importacao: 'GANTT'
          });
        }
      }
    }

    // Buscar ou criar facilitadores? Por ora apenas salvar na turma
    
    // Batch Insert (limit to 100 or something if huge, but usually gantt is < 200 items)
    const batchPromises = turmasToCreate.map(t => addDoc(collection(db, "treinamentos"), t));
    await Promise.all(batchPromises);

    return NextResponse.json({ 
      success: true, 
      message: `${turmasToCreate.length} turmas pré-agendadas com sucesso!` 
    });

  } catch (error: any) {
    console.error("ERRO IMPORT GANTT:", error);
    return NextResponse.json({ success: false, error: "Erro ao processar arquivo Gantt." }, { status: 500 });
  }
}
