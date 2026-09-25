import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, addDoc, getDocs, query, orderBy, serverTimestamp, getCountFromServer, doc, getDoc, where } from "firebase/firestore";
import { cookies } from "next/headers";
import { decrypt } from "@/lib/auth";

export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    const q = query(collection(db, "treinamentos"), orderBy("data", "desc"));
    const snapshot = await getDocs(q);
    
    // Fetch all publicos_alvo for quick lookup of previstos
    const publicosQ = query(collection(db, "publicos_alvo"));
    const publicosSnap = await getDocs(publicosQ);
    const publicosMap: Record<string, any> = {};
    publicosSnap.docs.forEach(doc => {
      publicosMap[doc.id] = doc.data();
    });
    
    // Chunk function to avoid Firebase RESOURCE_EXHAUSTED Quota due to too many concurrent getCountFromServer
    const chunkArray = (arr: any[], size: number): any[][] => arr.length ? [arr.slice(0, size), ...chunkArray(arr.slice(size), size)] : [];
    const chunks = chunkArray(snapshot.docs, 20);
    const treinamentos: any[] = [];
    
    for (const chunk of chunks) {
      const chunkResults = await Promise.all(chunk.map(async (d) => {
      const data = d.data();
      
      // Otimizaǜo agressiva: Cache em memria para as contagens para acabar com a lentidǜo do N+1
      let count = 0;
      const now = Date.now();
      
      // Global cache object attached to globalThis to persist across hot reloads in Next.js dev
      const globalAny = global as any;
      if (!globalAny.presencasCountCache) globalAny.presencasCountCache = new Map();
      const cache = globalAny.presencasCountCache;

      const cachedData = cache.get(d.id);
      if (cachedData && (now - cachedData.timestamp < 120000)) {
         count = cachedData.count; // Usa o cache se for menor que 2 minutos
      } else {
         try {
           const presencasColl = collection(db, 'treinamentos', d.id, 'presencas');
           const snapshot = await getCountFromServer(presencasColl);
           count = snapshot.data().count;
           cache.set(d.id, { count, timestamp: now });
         } catch(e) {
           count = typeof data.presencas_count === 'number' ? data.presencas_count : 0;
         }
      }
      
      const isChileName = /laja|santa fe|pacifico|talca|nacimiento|cordillera|puente alto|valdivia|mininco|chile/i.test(data.nome || '') || /laja|santa fe|pacifico|talca|nacimiento|cordillera|puente alto|valdivia|mininco|chile/i.test(data.planta || '');
      const paisFinal = data.pais || (isChileName ? 'CHILE' : 'BRASIL');
      
      return {
        id: d.id,
        nome: data.nome,
        turma: data.turma || "",
        pais: paisFinal,
        planta: data.planta || (paisFinal === 'CHILE' ? 'CHILE (SAT)' : 'GUAIBA (RAINBOW)'),
        data: data.data?.toDate()?.toISOString() || new Date().toISOString(),
        instrutor_email: data.instrutor_email,
        status_encerrado: data.status_encerrado || false,
          esperado_manual: data.esperado_manual !== undefined ? data.esperado_manual : null,
        _count: {
          registros: count,
          previstos: (() => {
            if (!data.publico_alvo_id || !publicosMap[data.publico_alvo_id] || !publicosMap[data.publico_alvo_id].matriculas) return 0;
            const pub = publicosMap[data.publico_alvo_id];
            const membros = pub.membros || pub.matriculas_detalhes || [];
            let countExcluded = 0;
            membros.forEach((m: any) => {
              if ((m.observacao === 'Operador de Painel' || m.observacao === 'Treinamento Não Aplica')) {
                countExcluded++;
              }
            });
            return Math.max(0, pub.matriculas.length - countExcluded);
          })()
        },
        publico_alvo_id: data.publico_alvo_id || null,
        facilitador_id: data.facilitador_id || null,
        facilitador_nome: data.facilitador_nome || null,
        checklist_dinamico: data.checklist_dinamico || [],
        data_agendada: data.data_agendada || null,
        horario_agendado: data.horario_agendado || null,
        carga_horaria: data.carga_horaria || null,
        status_agenda: data.status_agenda || 'CONCLUIDO'
      };
      }));
      treinamentos.push(...chunkResults);
    }
    
    return NextResponse.json({ success: true, data: treinamentos });
  } catch (error: any) {
    console.error("ERRO GET:", error);
    return NextResponse.json({ success: false, error: "Erro ao carregar treinamentos." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { nome, instrutor_email, turma, pais = 'BRASIL', planta = '', publico_alvo_id, esperado_manual, checklistTemplateId, facilitador_id, facilitador_nome, data_agendada, horario_agendado, carga_horaria, status_agenda } = body;
    
    if (!nome) return NextResponse.json({ success: false, error: "Nome é obrigatório" }, { status: 400 });

    let checklist_dinamico: any[] = [];
    if (checklistTemplateId) {
      try {
        const templateDoc = await getDoc(doc(db, "checklist_templates", checklistTemplateId));
        if (templateDoc.exists()) {
          const tData = templateDoc.data();
          if (tData.items && Array.isArray(tData.items)) {
            checklist_dinamico = tData.items.map((item: any) => ({
              ...item,
              checado: false
            }));
          }
        }
      } catch(e) {
        console.error("Erro ao carregar template", e);
      }
    }

    const docData: any = {
      nome,
      turma: turma || "",
      pais: pais,
      planta: planta || (pais === 'CHILE' ? 'CHILE (SAT)' : 'GUAÍBA (RAINBOW)'),
      instrutor_email: instrutor_email || "N/A",
      data: serverTimestamp(),
      status_encerrado: false,
      checklist_dinamico
    };
    if (publico_alvo_id) docData.publico_alvo_id = publico_alvo_id;
    if (esperado_manual) docData.esperado_manual = esperado_manual;
    if (facilitador_id) docData.facilitador_id = facilitador_id;
    if (facilitador_nome) docData.facilitador_nome = facilitador_nome;
    if (data_agendada) docData.data_agendada = data_agendada;
    if (horario_agendado) docData.horario_agendado = horario_agendado;
    if (carga_horaria) docData.carga_horaria = carga_horaria;
    if (status_agenda) docData.status_agenda = status_agenda;

    const docRef = await addDoc(collection(db, "treinamentos"), docData);
    
    const treinamento = {
      id: docRef.id,
      ...docData,
      data: new Date().toISOString(),
      _count: { registros: 0 }
    };
    
    return NextResponse.json({ success: true, data: treinamento });
  } catch (error: any) {
    console.error("ERRO POST:", error);
    return NextResponse.json({ success: false, error: "Erro ao criar treinamento." }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await import("@/lib/auth").then(m => m.getSession());
    if (session && session.role !== 'admin' && session.role !== 'gestor') {
      return NextResponse.json({ success: false, error: "Apenas Administradores ou Gestores têm permissão para excluir treinamentos." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const nome = searchParams.get("nome");
    
    const { doc, deleteDoc, collection, query, where, getDocs } = await import("firebase/firestore");

    if (nome) {
      const q = query(collection(db, "treinamentos"), where("nome", "==", nome));
      const snapshot = await getDocs(q);
    
    // Fetch all publicos_alvo for quick lookup of previstos
    const publicosQ = query(collection(db, "publicos_alvo"));
    const publicosSnap = await getDocs(publicosQ);
    const publicosMap: Record<string, any> = {};
    publicosSnap.docs.forEach(doc => {
      publicosMap[doc.id] = doc.data();
    });
      const deletePromises = snapshot.docs.map(d => deleteDoc(doc(db, "treinamentos", d.id)));
      await Promise.all(deletePromises);
      return NextResponse.json({ success: true, deletedCount: snapshot.size });
    }
    
    if (!id) return NextResponse.json({ success: false, error: "ID ou Nome não fornecido" }, { status: 400 });

    await deleteDoc(doc(db, "treinamentos", id));
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("ERRO DELETE:", error);
    return NextResponse.json({ success: false, error: "Erro ao excluir treinamento." }, { status: 500 });
  }
}
