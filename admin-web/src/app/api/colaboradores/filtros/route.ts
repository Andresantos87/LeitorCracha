import { NextResponse } from "next/server";
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'colaboradores.json');
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ success: true, empresas: [], plantas: [] });
    }
    const fileContents = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(fileContents);
    
    const empresasSet = new Set<string>();
    const plantasSet = new Set<string>();
    const cargosSet = new Set<string>();
    const gestoresSet = new Set<string>();
    
    for (const key in data) {
      if (data[key].empresa) empresasSet.add(data[key].empresa);
      if (data[key].planta) plantasSet.add(data[key].planta);
      if (data[key].cargo) cargosSet.add(data[key].cargo);
      if (data[key].gestor) gestoresSet.add(data[key].gestor);
      if (data[key].superior_imediato) gestoresSet.add(data[key].superior_imediato);
    }
    
    return NextResponse.json({ 
      success: true, 
      empresas: Array.from(empresasSet).sort(), 
      plantas: Array.from(plantasSet).sort(),
      cargos: Array.from(cargosSet).sort(),
      gestores: Array.from(gestoresSet).sort()
    });
  } catch (error: any) {
    console.error("ERRO ROTA FILTROS:", error);
    return NextResponse.json({ success: false, error: "Erro ao buscar filtros." }, { status: 500 });
  }
}
