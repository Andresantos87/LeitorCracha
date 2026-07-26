import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const paisFilter = searchParams.get('pais')?.toUpperCase() || null;

    const jsonPath = path.join(process.cwd(), 'colaboradores.json');
    
    // Empresas e fornecedores globais que atuam em ambos os países
    const globais = [
      "CMPC",
      "TERCEIRO / PRESTADOR",
      "VISITANTE",
      "VALMET",
      "ANDRITZ",
      "POYRY",
      "SIEMENS",
      "ABB",
      "WEG",
      "KONEKRANES",
      "METSA"
    ];

    const brasilSet = new Set<string>([
      ...globais,
      "CMPC - GUAÍBA",
      "CMPC - SAPUCAIA",
      "CMPC CENTRALIZADA",
      "GUAÍBA"
    ]);

    const chileSet = new Set<string>([
      ...globais,
      "CMPC CHILE",
      "LAJA",
      "PACIFICO",
      "SANTA FE",
      "TALCA",
      "NACIMIENTO",
      "CORDILLERA",
      "PUENTE ALTO",
      "VALDIVIA",
      "MININCO",
      "BOXBOARD",
      "TISSUE CHILE",
      "FORESTAL CHILE"
    ]);

    const todasSet = new Set<string>([...brasilSet, ...chileSet]);

    if (fs.existsSync(jsonPath)) {
      try {
        const data = fs.readFileSync(jsonPath, 'utf8');
        const usersMap = JSON.parse(data);
        
        const chileKeywords = [
          "LAJA", "PACIFICO", "SANTA FE", "TALCA", "NACIMIENTO", 
          "CORDILLERA", "PUENTE ALTO", "VALDIVIA", "MININCO", "CHILE", 
          "MAULE", "BUIN", "BOXBOARD", "TISSUE"
        ];

        Object.values(usersMap).forEach((u: any) => {
          const addEmp = (val: string) => {
            if (!val || typeof val !== 'string') return;
            const clean = val.trim().toUpperCase();
            if (clean.length === 0 || clean === 'OUTROS' || clean === '000000000000 -') return;
            
            todasSet.add(clean);

            // Verifica se pertence à planta/unidade do Chile (SAT)
            const isChile = chileKeywords.some(kw => clean.includes(kw));
            if (isChile) {
              chileSet.add(clean);
            } else {
              // Caso contrário, no cadastro da CMPC é do Brasil (Rainbow / Códigos 504/508/514 / Guaíba / Ltda / S.A.)
              brasilSet.add(clean);
            }
          };

          addEmp(u.planta);
          addEmp(u.empresa);
        });
      } catch (e) {
        console.error("Erro ao ler colaboradores.json para empresas:", e);
      }
    }

    const brasilArray = Array.from(brasilSet).sort();
    const chileArray = Array.from(chileSet).sort();
    const todasArray = Array.from(todasSet).sort();

    if (paisFilter === 'CHILE' || paisFilter === 'SAT') {
      return NextResponse.json({ success: true, data: chileArray, chile: chileArray });
    } else if (paisFilter === 'BRASIL' || paisFilter === 'RAINBOW') {
      return NextResponse.json({ success: true, data: brasilArray, brasil: brasilArray });
    }

    // Retorna ambas as listas separadas e a lista geral para retrocompatibilidade
    return NextResponse.json({ 
      success: true, 
      data: todasArray, 
      brasil: brasilArray, 
      chile: chileArray 
    });
  } catch (error: any) {
    console.error("ERRO GET EMPRESAS:", error);
    return NextResponse.json({ success: false, error: 'Erro ao buscar lista de empresas.' }, { status: 500 });
  }
}
