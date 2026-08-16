import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// Helper to normalize strings for comparison
function cleanString(str: any) {
  if (!str) return "";
  let s = String(str).toLowerCase().trim();
  if (/^\d+$/.test(s)) {
    s = s.replace(/^0+/, '') || '0';
  }
  return s;
}

export async function POST(req: Request) {
  try {
    const { matriculas } = await req.json();

    if (!matriculas || !Array.isArray(matriculas)) {
      return NextResponse.json({ success: false, error: "Array de matrículas inválido" }, { status: 400 });
    }

    const filePath = path.join(process.cwd(), "colaboradores.json");
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ success: false, error: "Banco de dados não encontrado" }, { status: 404 });
    }

    const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
    const results = [];
    
    const targetArray = matriculas.map((m: string) => ({ original: m, clean: cleanString(m) }));

    for (const target of targetArray) {
      let found = null;
      for (const key in data) {
        const colab = data[key];
        if (
          cleanString(colab.matricula) === target.clean ||
          cleanString(colab.cod_cracha) === target.clean ||
          cleanString(key) === target.clean ||
          cleanString(colab.nome) === target.clean
        ) {
          found = { ...colab, _key: key };
          break; // pega o primeiro correspondente
        }
      }

      if (found) {
        results.push({
          _id: target.original, // Preserva exatamente o que foi solicitado para o frontend cruzar
          matricula: found.matricula || found.cod_cracha || found._key || '',
          nome: found.nome || 'Sem Nome',
          planta: found.planta || 'Outros',
          cargo: found.cargo || 'Não Informado',
          empresa: found.empresa || 'Outros',
          gestor: found.gestor || '',
          turno: found.turno || '',
          area: found.area || '',
          email: found.email || ''
        });
      }
    }

    return NextResponse.json({ 
      success: true, 
      data: results 
    });

  } catch (error: any) {
    console.error("Erro na API Batch Colaboradores:", error);
    return NextResponse.json({ success: false, error: "Erro interno no servidor" }, { status: 500 });
  }
}
