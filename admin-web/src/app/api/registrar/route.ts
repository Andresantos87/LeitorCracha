import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { id_treinamento, identificador_lido, modo_registro } = body;

    if (!id_treinamento || !identificador_lido) {
      return NextResponse.json(
        { success: false, error: "Parâmetros id_treinamento e identificador_lido são obrigatórios." },
        { status: 400 }
      );
    }

    // Cria o registro da presença "cego"
    const registro = await prisma.registroPresenca.create({
      data: {
        id_treinamento,
        identificador_lido,
        modo_registro: modo_registro || "DESCONHECIDO",
      },
    });

    return NextResponse.json({ success: true, data: registro });
  } catch (error: any) {
    console.error("Erro ao registrar presença:", error);
    // Erro comum do Prisma de violação Unique (mesma pessoa no mesmo treinamento)
    if (error.code === 'P2002') {
      return NextResponse.json(
        { success: false, error: "Este colaborador já está registrado neste treinamento." },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { success: false, error: "Erro interno do servidor." },
      { status: 500 }
    );
  }
}
