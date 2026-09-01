import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, addDoc, deleteDoc, doc, getDocs, query, where, serverTimestamp, getCountFromServer } from "firebase/firestore";

export const dynamic = "force-dynamic";

interface AiAction {
  action: "criar" | "excluir" | "listar" | "desconhecido";
  args: Record<string, any>;
}

function buildPrompt(userMessage: string): string {
  const today = new Date().toISOString().split("T")[0];
  return `Voce e um assistente de agendamento de treinamentos CMPC. Hoje e ${today}.
O usuario vai descrever o que quer fazer (criar ou excluir agendamentos).
Voce DEVE responder APENAS com um JSON valido, sem markdown, sem explicacoes.

Formato para CRIAR:
{"action":"criar","args":{"nome":"NOME DO TREINAMENTO","facilitador_nome":"NOME","data_agendada":"YYYY-MM-DD","horario_agendado":"HH:MM","carga_horaria":3,"turma":"DESCRICAO DA TURMA"}}

Formato para EXCLUIR (precisa do id):
{"action":"excluir","args":{"id":"ID_DO_DOCUMENTO"}}

Formato para LISTAR turmas sem ninguem registrado (para sugerir exclusao):
{"action":"listar","args":{"sem_presencas":true}}

Se nao entender, responda:
{"action":"desconhecido","args":{}}

Mensagem do usuario: "${userMessage}"`;
}

async function parseWithGemini(userMessage: string): Promise<AiAction> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { action: "desconhecido", args: { error: "GEMINI_API_KEY nao configurada" } };
  }

  try {
    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(buildPrompt(userMessage));
    const text = result.response.text().trim().replace(/```json|```/g, "").trim();
    return JSON.parse(text) as AiAction;
  } catch (e: any) {
    console.error("Gemini parse error:", e);
    return { action: "desconhecido", args: {} };
  }
}

export async function POST(req: Request) {
  try {
    const { message, prompt } = await req.json();
    const userMessage = message || prompt;
    if (!userMessage) {
      return NextResponse.json({ success: false, error: "Mensagem vazia." }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({
        success: true,
        reply: "Para usar o Assistente IA, adicione sua GEMINI_API_KEY no arquivo .env.local e reinicie o servidor.",
        refreshNeeded: false
      });
    }

    const parsed = await parseWithGemini(userMessage);

    if (parsed.action === "criar") {
      const { nome, facilitador_nome, data_agendada, horario_agendado, carga_horaria, turma } = parsed.args;
      if (!nome || !data_agendada) {
        return NextResponse.json({ success: true, reply: "Nao consegui entender os dados do treinamento. Por favor, informe o nome e a data.", refreshNeeded: false });
      }
      const docRef = await addDoc(collection(db, "treinamentos"), {
        nome,
        turma: turma || "",
        facilitador_nome: facilitador_nome || "N/A",
        data_agendada,
        horario_agendado: horario_agendado || "08:00",
        carga_horaria: carga_horaria || 3,
        pais: "BRASIL",
        planta: "GUAIBA (RAINBOW)",
        instrutor_email: "N/A",
        status_encerrado: false,
        status_agenda: "AGENDADO",
        checklist_dinamico: [],
        presencas_count: 0,
        data: serverTimestamp(),
      });
      return NextResponse.json({
        success: true,
        reply: "Agenda criada com sucesso! Treinamento '" + nome + "' agendado para " + data_agendada + " as " + (horario_agendado || "08:00") + ".",
        refreshNeeded: true,
        id: docRef.id
      });
    }

    if (parsed.action === "excluir") {
      const { id } = parsed.args;
      if (!id) {
        return NextResponse.json({ success: true, reply: "Preciso do ID do treinamento para excluir. Informe qual turma deseja remover.", refreshNeeded: false });
      }
      // Check if has registros
      const presencasRef = collection(db, "treinamentos", id, "presencas");
      const countSnap = await getDocs(presencasRef);
      if (countSnap.size > 0) {
        return NextResponse.json({
          success: true,
          reply: "Nao e possivel excluir este treinamento pois ja existem " + countSnap.size + " colaboradores registrados na turma.",
          refreshNeeded: false
        });
      }
      await deleteDoc(doc(db, "treinamentos", id));
      return NextResponse.json({
        success: true,
        reply: "Treinamento excluido com sucesso!",
        refreshNeeded: true
      });
    }

    if (parsed.action === "listar") {
      const snap = await getDocs(collection(db, "treinamentos"));
      const semPresencas = snap.docs.filter(d => {
        const count = d.data().presencas_count;
        return typeof count === "number" ? count === 0 : true;
      });
      const lista = semPresencas.slice(0, 10).map(d => "- " + (d.data().nome || "Sem nome") + " (" + (d.data().data_agendada || "sem data") + ") [ID: " + d.id + "]").join("\n");
      return NextResponse.json({
        success: true,
        reply: "Encontrei " + semPresencas.length + " turmas sem ninguem registrado. As primeiras 10:\n" + lista + "\n\nPosso excluir alguma para voce. Informe o ID.",
        refreshNeeded: false
      });
    }

    return NextResponse.json({
      success: true,
      reply: "Nao entendi o que voce quis dizer. Posso criar ou excluir agendamentos. Exemplos:\n- 'Crie uma agenda para o PT Digital amanha as 14h para o Andre Santos'\n- 'Remova turmas sem ninguem registrado'",
      refreshNeeded: false
    });

  } catch (error: any) {
    console.error("ERRO AI-AGENDA:", error);
    return NextResponse.json({ success: false, error: "Erro interno: " + error.message }, { status: 500 });
  }
}
