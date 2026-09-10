import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

function loadUsersList() {
  try {
    const jsonPath = path.join(process.cwd(), 'colaboradores.json');
    if (!fs.existsSync(jsonPath)) return [];
    const data = fs.readFileSync(jsonPath, 'utf8');
    const usersMap = JSON.parse(data);
    return Object.entries(usersMap).map(([key, val]: [string, any]) => ({
      identificador: key,
      nome: val.nome || 'Desconhecido',
      empresa: val.empresa || val.planta || 'Outros',
      matricula: val.matricula || '',
      cod_cracha: val.cod_cracha || ''
    }));
  } catch (e) {
    return [];
  }
}

export async function GET(req: Request) {
  try {
    const users = loadUsersList();
    if (users.length === 0) return NextResponse.json({ error: "sem usuarios" });

    const treinamentosSnap = await getDocs(collection(db, 'treinamentos'));
    const results: string[] = [];
    let fixCount = 0;

    for (const tDoc of treinamentosSnap.docs) {
      const presencasSnap = await getDocs(collection(db, 'treinamentos', tDoc.id, 'presencas'));
      
      for (const pDoc of presencasSnap.docs) {
        const pData = pDoc.data();
        if ((!pData.nome || pData.nome === 'Desconhecido') && pData.identificador_lido) {
          const queryStr = pData.identificador_lido;
          const queryClean = queryStr.trim().replace(/[.\-/\s]/g, '').replace(/^0+/, '').toLowerCase();
          const queryNoDV = queryStr.trim().includes('-') ? queryStr.trim().split('-')[0].replace(/[.\-/\s]/g, '').replace(/^0+/, '').toLowerCase() : queryClean;
          
          let foundUser = null;
          for (const u of users) {
            const uIdClean = (u.identificador || '').replace(/[.\-/\s]/g, '').replace(/^0+/, '').toLowerCase();
            const matClean = (u.matricula ? String(u.matricula) : '').replace(/[.\-/\s]/g, '').replace(/^0+/, '').toLowerCase();
            
            if (uIdClean === queryClean || uIdClean === queryNoDV || matClean === queryClean || matClean === queryNoDV || u.identificador.toLowerCase() === queryStr.trim().toLowerCase()) {
              foundUser = u;
              break;
            }
          }

          if (foundUser) {
            await updateDoc(doc(db, 'treinamentos', tDoc.id, 'presencas', pDoc.id), {
              nome: foundUser.nome,
              empresa: foundUser.empresa
            });
            results.push(`Corrigido: ${queryStr} -> ${foundUser.nome}`);
            fixCount++;
          }
        }
      }
    }

    return NextResponse.json({ success: true, fixed: fixCount, log: results });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
