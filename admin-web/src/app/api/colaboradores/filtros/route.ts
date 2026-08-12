import { NextResponse } from "next/server";
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

function cleanString(val: any) {
  if (!val || typeof val !== 'string') return "";
  return val.trim().toUpperCase().replace(/^[\d\s\-\._\/]+/, '').trim();
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const empresaFilter = searchParams.get('empresa');
    const plantaFilter = searchParams.get('planta');

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
      const colab = data[key];
      const empClean = cleanString(colab.empresa);
      const plaClean = cleanString(colab.planta);
      const cargoClean = cleanString(colab.cargo);
      const gestorClean = cleanString(colab.gestor || colab.superior_imediato);

      if (empClean) empresasSet.add(empClean);
      if (plaClean) plantasSet.add(plaClean);

      let match = true;
      if (empresaFilter && empClean !== empresaFilter) match = false;
      if (plantaFilter && plaClean !== plantaFilter) match = false;

      if (match) {
        if (cargoClean) cargosSet.add(cargoClean);
        if (gestorClean) gestoresSet.add(gestorClean);
      }
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
