import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, addDoc, getDocs, query, orderBy, serverTimestamp } from "firebase/firestore";
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const q = query(collection(db, "publicos_alvo"), orderBy("criado_em", "desc"));
    const snapshot = await getDocs(q);
    
    const filePath = path.join(process.cwd(), 'colaboradores.json');
    const fileContents = fs.readFileSync(filePath, 'utf8');
    const cols = JSON.parse(fileContents);
    const colsMap = new Map();
    for (const key in cols) {
      const c = cols[key];
      colsMap.set(String(c.matricula).replace(/^0+/, ''), c);
      colsMap.set(String(c.cod_cracha).replace(/^0+/, ''), c);
      colsMap.set(String(key), c);
    }
    
    // Buscar todos os treinamentos para achar os vínculos
    const tq = query(collection(db, "treinamentos"));
    const tSnapshot = await getDocs(tq);
    const treinamentos = tSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));

    const publicos = await Promise.all(snapshot.docs.map(async (doc) => {
      const d = doc.data();
      const publicoId = doc.id;
      
      // Encontrar treinamento vinculado
      const vinculado = treinamentos.find((t: any) => t.publico_alvo_id === publicoId);
      
      let presencasMatriculas: string[] = [];
      if (vinculado) {
        // Buscar presenças deste treinamento
        const pSnap = await getDocs(collection(db, `treinamentos/${vinculado.id}/presencas`));
        presencasMatriculas = pSnap.docs.map(p => p.data().identificador_lido);
      }

      const matriculasEnriquecidas = (d.membros || []).map((membro: any) => {
        const cleanM = String(membro.matricula || membro).replace(/^0+/, '');
        const c = colsMap.get(cleanM) || colsMap.get(membro.matricula || membro);
        return { 
          _id: membro.matricula || membro, 
          nome: c ? c.nome : "Desconhecido",
          rol: membro.rol || "",
          identificador: c ? c.identificador : null,
          cod_cracha: c ? c.cod_cracha : null
        };
      });
      
      // Fallback para públicos antigos que só têm "matriculas"
      if (matriculasEnriquecidas.length === 0 && d.matriculas && d.matriculas.length > 0) {
        d.matriculas.forEach((m: string) => {
          const cleanM = String(m).replace(/^0+/, '');
          const c = colsMap.get(cleanM) || colsMap.get(m);
          matriculasEnriquecidas.push({
            _id: m,
            nome: c ? c.nome : "Desconhecido",
            rol: "",
            identificador: c ? c.identificador : null,
            cod_cracha: c ? c.cod_cracha : null
          });
        });
      }
      
      return {
        id: publicoId,
        ...d,
        matriculas_detalhes: matriculasEnriquecidas,
        treinamento_vinculado: vinculado ? { id: vinculado.id, nome: vinculado.nome, turma: vinculado.turma } : null,
        presencas_matriculas: presencasMatriculas,
        criado_em: d.criado_em?.toDate()?.toISOString() || new Date().toISOString()
      };
    }));
    
    return NextResponse.json({ success: true, data: publicos });
  } catch (error: any) {
    console.error("ERRO GET PUBLICOS-ALVO:", error);
    return NextResponse.json({ success: false, error: "Erro ao carregar públicos-alvo." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { nome, descricao, matriculas, membros } = body;
    
    if (!nome) return NextResponse.json({ success: false, error: "Nome é obrigatório" }, { status: 400 });

    const docRef = await addDoc(collection(db, "publicos_alvo"), {
      nome,
      descricao: descricao || "",
      matriculas: Array.isArray(matriculas) ? matriculas : [],
      membros: Array.isArray(membros) ? membros : [],
      criado_em: serverTimestamp()
    });
    
    const publico = {
      id: docRef.id,
      nome,
      descricao: descricao || "",
      matriculas: Array.isArray(matriculas) ? matriculas : [],
      membros: Array.isArray(membros) ? membros : [],
      criado_em: new Date().toISOString()
    };
    
    return NextResponse.json({ success: true, data: publico });
  } catch (error: any) {
    console.error("ERRO POST PUBLICOS-ALVO:", error);
    return NextResponse.json({ success: false, error: "Erro ao criar público-alvo." }, { status: 500 });
  }
}
