import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const jsonPath = path.join(process.cwd(), 'colaboradores.json');
    const defaultEmpresas = [
      "CMPC",
      "CMPC - GUAÍBA",
      "CMPC - SAPUCAIA",
      "TERCEIRO / PRESTADOR",
      "VISITANTE",
      "METSA",
      "VALMET",
      "POYRY",
      "ANDRITZ",
      "SIEMENS",
      "ABB",
      "WEG",
      "KONEKRANES"
    ];

    let empresasSet = new Set<string>(defaultEmpresas);

    if (fs.existsSync(jsonPath)) {
      try {
        const data = fs.readFileSync(jsonPath, 'utf8');
        const usersMap = JSON.parse(data);
        Object.values(usersMap).forEach((u: any) => {
          if (u && u.planta && typeof u.planta === 'string' && u.planta.trim().length > 0) {
            empresasSet.add(u.planta.trim().toUpperCase());
          }
          if (u && u.empresa && typeof u.empresa === 'string' && u.empresa.trim().length > 0) {
            empresasSet.add(u.empresa.trim().toUpperCase());
          }
        });
      } catch (e) {
        console.error("Erro ao ler colaboradores.json para empresas:", e);
      }
    }

    const empresasArray = Array.from(empresasSet).sort();
    return NextResponse.json({ success: true, data: empresasArray });
  } catch (error: any) {
    console.error("ERRO GET EMPRESAS:", error);
    return NextResponse.json({ success: false, error: 'Erro ao buscar lista de empresas.' }, { status: 500 });
  }
}
