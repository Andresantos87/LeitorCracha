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

        const corporateKeywords = [
          "LTDA", "LIMITADA", "S.A.", "S/A", "S A", "ME", "EPP", "SERVIC", "COMERC", 
          "INDUSTRI", "ENGENHA", "INGENIE", "TRANSPORT", "MONTAG", "MONTAJ", "CONSTRUC", 
          "LOGIST", "SOLUC", "SOLUT", "SISTEM", "MAQUIN", "MECANIC", "ELETRIC", "ELECTRIC", 
          "SEGUR", "CONSULT", "LABORAT", "CLIMATIZ", "PRESTAD", "TERCEIR", "VISITANT", 
          "CMPC", "VALMET", "ANDRITZ", "POYRY", "SIEMENS", "ABB", "WEG", "KONEKRANES", 
          "METSA", "GUAÍBA", "SAPUCAIA", "LAJA", "PACIFICO", "SANTA FE", "TALCA", 
          "NACIMIENTO", "CORDILLERA", "PUENTE ALTO", "VALDIVIA", "MININCO", "BOXBOARD", 
          "TISSUE", "FORESTAL", "MANTENC", "MANUTENC", "AGUA", "WATER", "CHEMIC", 
          "QUIMIC", "AUTOMAC", "FLOREST", "MEDICIN", "OCUPACION", "TRABALH", "TEMPORAR", 
          "PREDIAL", "AMBIENT", "ENVIRONMENT", "ECOLAB", "TECH", "TECNOLOG", "CENTRALIZ", 
          "CRANES", "RENT", "GAS", "ENERG", "ENG", "IND", "COM", "REP", "LOCAC", 
          "ARRIEND", "FABRIC", "EQUIP", "OBR", "PROJET", "PROYECT", "SOCIET", "SOCIEDAD", 
          "COMPANIA", "CIA", "CORP", "GROUP", "GRUP", "ASSOCIA", "COOPERAT", "INSTITUT", 
          "FUNDAC", "HOSPITAL", "CLINIC", "ACADEM", "ESCOL", "UNIVERSID", "FACULDAD", 
          "CENTRO", "BUREAU", "AGENC", "STUDIO", "OFFICE", "GLOBAL", "BRASIL", "CHILE", 
          "INTERNATIONAL", "INTERNACIONAL", "EMPRESA", "BUSINESS", "PARTNERS", "VENTURES", 
          "HOLDING", "SERVICES", "SUPPLY", "SUSTENTAB", "RECURSOS", "HUMANOS", "SECURITY", 
          "CLEAN", "LIMP", "ASSOC", "CLIN"
        ];

        Object.values(usersMap).forEach((u: any) => {
          const addEmp = (val: string) => {
            if (!val || typeof val !== 'string') return;
            // Remove códigos SAP numéricos iniciais (ex: "504 ", "514 - ", "0001 ")
            let clean = val.trim().toUpperCase().replace(/^[\d\s\-\._\/]+/, '').trim();
            
            // Ignora se for vazio, "OUTROS", muito curto ou contiver sequências numéricas (CPFs/Matrículas/Telefones na coluna errada)
            if (clean.length < 3 || clean === 'OUTROS' || clean === '-' || /\d{3,}/.test(clean)) return;
            
            // Garante que é uma entidade corporativa (e não o nome de um funcionário que caiu na coluna)
            const isCorporate = corporateKeywords.some(kw => clean.includes(kw));
            if (!isCorporate && !globais.includes(clean)) return;

            todasSet.add(clean);

            // Verifica se pertence à planta/unidade do Chile
            const isChile = chileKeywords.some(kw => clean.includes(kw));
            if (isChile) {
              chileSet.add(clean);
            } else {
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
