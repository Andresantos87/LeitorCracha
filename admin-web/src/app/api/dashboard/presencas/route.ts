import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collectionGroup, getDocs } from "firebase/firestore";
import fs from "fs";
import path from "path";

export const dynamic = 'force-dynamic';

let cachedUsers: Record<string, any> | null = null;
function loadUsers() {
  if (cachedUsers) return cachedUsers;
  try {
    const jsonPath = path.join(process.cwd(), 'colaboradores.json');
    if (fs.existsSync(jsonPath)) {
      cachedUsers = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      return cachedUsers;
    }
  } catch(e) {}
  return {};
}

export async function GET() {
  try {
    const presencasSnapshot = await getDocs(collectionGroup(db, "presencas"));
    const usersDict = loadUsers() || {};
    const usersArray = Object.values(usersDict);
    
    const data = presencasSnapshot.docs.map(doc => {
      const p = doc.data();
      const treinamentoId = doc.ref.parent.parent?.id;
      
      let dateIso = null;
      if (p.data_registro?.toDate) {
        dateIso = p.data_registro.toDate().toISOString();
      } else if (p.timestamp?.toDate) {
        dateIso = p.timestamp.toDate().toISOString();
      } else if (p.created_at?.toDate) {
        dateIso = p.created_at.toDate().toISOString();
      } else if (typeof p.data_registro === 'string') {
        dateIso = new Date(p.data_registro).toISOString();
      } else {
        dateIso = new Date().toISOString(); // fallback
      }

      let user = usersDict[p.identificador_lido];
      if (!user) {
        const raw = String(p.identificador_lido || '').replace(/\D/g, '');
        const mioloA = raw.length >= 10 ? raw.substring(2, raw.length - 2).replace(/^0+/, '') : '';
        const mioloB = raw.length >= 4 ? raw.substring(2).replace(/^0+/, '') : '';
        user = usersArray.find((u: any) => {
          const cracha = String(u.cod_cracha || '').replace(/\D/g, '').replace(/^0+/, '');
          const uid = String(u.identificador || '').replace(/[.\-/\s]/g, '').replace(/^0+/, '').toLowerCase();
          if (cracha && (cracha === raw || cracha === raw.replace(/^0+/, ''))) return true;
          if (uid && uid === raw) return true;
          return false;
        });

        if (!user) {
          user = usersArray.find((u: any) => {
            const mat = String(u.matricula || '').replace(/\D/g, '').replace(/^0+/, '');
            if (mat && mat.length >= 4 && (mat === mioloA || mat === mioloB)) return true;
            return false;
          }) || {};
        }
      }

      return {
        id: doc.id,
        treinamentoId,
        dataRaw: dateIso,
        nome: p.nome || user.nome || 'Desconhecido',
        empresa: p.empresa || p.planta || user.empresa || user.planta || 'Desconhecida',
        cargo: p.cargo || user.cargo || 'Nao Informado',
        identificador_lido: p.identificador_lido || user.matricula || user.cod_cracha || 'N/A'
      };
    });

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("Erro ao buscar presenças do dashboard:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
