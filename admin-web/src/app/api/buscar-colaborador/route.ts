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
    const isNumeric = /^\d+$/.test(queryStr.trim());
    const queryLower = removeAccents(queryStr.trim());
    const queryParts = queryLower.split(' ').filter(p => p.length > 0);

    let results = [];

    // Busca
    for (const u of users) {
      // 1. Busca por ID (se for numérico) ignorando zeros à esquerda
      if (isNumeric) {
        const uIdLimpo = u.identificador.replace(/^0+/, '');
        const qIdLimpo = queryStr.trim().replace(/^0+/, '');
        
        const matLimpa = u.matricula ? String(u.matricula).replace(/^0+/, '') : '';

        if (uIdLimpo === qIdLimpo || u.identificador === queryStr.trim() || matLimpa === qIdLimpo || u.matricula === queryStr.trim()) {
          results.push(u);
          continue;
        }
      }

      // 2. Busca por Nome (Inteligente)
      const nomeLower = removeAccents(u.nome);
      // Se TODAS as partes digitadas estão contidas no nome, é match!
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
