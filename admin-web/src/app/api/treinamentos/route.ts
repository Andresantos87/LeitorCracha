import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, addDoc, getDocs, query, orderBy, serverTimestamp, getCountFromServer, doc, getDoc } from "firebase/firestore";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const q = query(collection(db, "treinamentos"), orderBy("data", "desc"));
    const snapshot = await getDocs(q);
    
    const treinamentos = await Promise.all(snapshot.docs.map(async (d) => {
      const data = d.data();
      let count = 0;
      try {
        const presencasRef = collection(db, "treinamentos", d.id, "presencas");
        const countSnapshot = await getCountFromServer(presencasRef);
        count = countSnapshot.data().count || 0;
      } catch (e) {
        console.warn("Erro ao contar presenças:", e);
      }
      
      const isChileName = /laja|santa fe|pacifico|talca|nacimiento|cordillera|puente alto|valdivia|mininco|chile/i.test(data.nome || '') || /laja|santa fe|pacifico|talca|nacimiento|cordillera|puente alto|valdivia|mininco|chile/i.test(data.planta || '');
      const paisFinal = data.pais || (isChileName ? 'CHILE' : 'BRASIL');
      
      return {
        id: d.id,
        nome: data.nome,
        turma: data.turma || "",
        pais: paisFinal,
        planta: data.planta || (paisFinal === 'CHILE' ? 'CHILE (SAT)' : 'GUAÍBA (RAINBOW)'),
        data: data.data?.toDate()?.toISOString() || new Date().toISOString(),
        instrutor_email: data.instrutor_email,
        status_encerrado: data.status_encerrado || false,
        _count: {
          registros: count
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
    
    return NextResponse.json({ success: true, data: treinamentos });
  } catch (error: any) {
    console.error("ERRO GET:", error);
    return NextResponse.json({ success: false, error: "Erro ao carregar treinamentos." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { nome, instrutor_email, turma, pais = 'BRASIL', planta = '', publico_alvo_id, checklistTemplateId, facilitador_id, facilitador_nome, data_agendada, horario_agendado, carga_horaria, status_agenda } = body;
    
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
