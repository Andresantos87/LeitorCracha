import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

let cachedUsersList: any[] | null = null;
let lastMtime: number = 0;

function loadUsersList() {
  try {
    const jsonPath = path.join(process.cwd(), 'colaboradores.json');
    if (!fs.existsSync(jsonPath)) {
      console.warn("colaboradores.json não encontrado");
      return [];
    }

    const stat = fs.statSync(jsonPath);
    // Se o cache existir e o arquivo não tiver sido modificado, retorna o cache
    if (cachedUsersList && lastMtime === stat.mtimeMs) {
      return cachedUsersList;
    }

    const data = fs.readFileSync(jsonPath, 'utf8');
    const usersMap = JSON.parse(data);
    
    // Converte o objeto em um array para busca rápida e cacheia
    cachedUsersList = Object.entries(usersMap).map(([key, val]: [string, any]) => ({
      identificador: key,
      nome: val.nome || 'Desconhecido',
      planta: val.planta || 'Outros',
      cargo: val.cargo || 'Não Informado',
      matricula: val.matricula || ''
    }));
    
    lastMtime = stat.mtimeMs;
    return cachedUsersList;
  } catch (e) {
    console.error("Erro ao carregar banco de dados JSON local:", e);
    return [];
  }
}

function removeAccents(str: string) {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const queryStr = searchParams.get('id');

    if (!queryStr || queryStr.trim().length < 3) {
      return NextResponse.json({ success: false, error: 'Busca muito curta' }, { status: 400 });
    }

    const users = loadUsersList();
    const queryLower = removeAccents(queryStr.trim());
    const queryParts = queryLower.split(' ').filter(p => p.length > 0);
    const queryClean = queryStr.trim().replace(/[.\-/\s]/g, '').replace(/^0+/, '').toLowerCase();
    const hasDigits = /\d/.test(queryStr);

    let results = [];

    // Se for leitura de crachá NFC (ex: 328001633101 ou 310098817093), extrair miolos possíveis
    let mioloA = ''; // Sem os 2 últimos dígitos (ex: 328001633101 -> 80016331)
    let mioloB = ''; // Com os dígitos finais (ex: 310098817093 -> 98817093)
    const rawDigits = queryStr.trim().replace(/\D/g, '');
    if (rawDigits.length >= 8 && (rawDigits.startsWith('31') || rawDigits.startsWith('32'))) {
      if (rawDigits.length >= 10) mioloA = rawDigits.substring(2, rawDigits.length - 2).replace(/^0+/, '');
      mioloB = rawDigits.substring(2).replace(/^0+/, '');
    }

    // Busca
    for (const u of users) {
      // 1. Busca por ID, Matrícula, RUT ou CPF (com ou sem traço/pontos/zeros)
      if (hasDigits || queryClean.length >= 3) {
        const uIdClean = (u.identificador || '').replace(/[.\-/\s]/g, '').replace(/^0+/, '').toLowerCase();
        const matClean = (u.matricula ? String(u.matricula) : '').replace(/[.\-/\s]/g, '').replace(/^0+/, '').toLowerCase();

        if (
          uIdClean === queryClean ||
          u.identificador.toLowerCase() === queryStr.trim().toLowerCase() ||
          matClean === queryClean ||
          (mioloA !== '' && (matClean === mioloA || uIdClean === mioloA)) ||
          (mioloB !== '' && (matClean === mioloB || uIdClean === mioloB)) ||
          (rawDigits.length >= 10 && matClean.length >= 6 && rawDigits.includes(matClean)) ||
          (u.matricula && String(u.matricula).toLowerCase() === queryStr.trim().toLowerCase()) ||
          (queryClean.length >= 4 && mioloA === '' && mioloB === '' && (uIdClean.startsWith(queryClean) || uIdClean.includes(queryClean) || (matClean.length >= 4 && matClean.includes(queryClean))))
        ) {
          results.push(u);
          continue;
        }
      }

      // 2. Busca por Nome (Inteligente)
      const nomeLower = removeAccents(u.nome);
      const matchName = queryParts.every(part => nomeLower.includes(part));
      
      if (matchName) {
        results.push(u);
      }

      // Limitar a 15 resultados para não pesar no frontend
      if (results.length >= 15) {
        break;
      }
    }

    if (results.length > 0) {
      return NextResponse.json({ success: true, data: results });
    }

    return NextResponse.json({ success: false, error: 'Colaborador não encontrado' }, { status: 404 });
  } catch (error: any) {
    console.error("ERRO GET COLABORADOR LOCAL:", error);
    return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 });
  }
}
