import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, getDocs, query, orderBy } from "firebase/firestore";
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID do treinamento não fornecido" }, { status: 400 });
    }

    const docRef = doc(db, "treinamentos", id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return NextResponse.json({ error: "Treinamento não encontrado" }, { status: 404 });
    }
    
    const treinamento = docSnap.data();

    if (!treinamento.publico_alvo_id) {
      return NextResponse.json({ error: "Este treinamento não possui um Público-Alvo vinculado para gerar aderência." }, { status: 400 });
    }

    // Carregar Publico-Alvo
    const paRef = doc(db, "publicos_alvo", treinamento.publico_alvo_id);
    const paSnap = await getDoc(paRef);
    if (!paSnap.exists()) {
      return NextResponse.json({ error: "Público-Alvo vinculado não encontrado" }, { status: 404 });
    }
    const publicoAlvo = paSnap.data();

    // Carregar colaboradores.json
    const filePath = path.join(process.cwd(), 'colaboradores.json');
    const fileContents = fs.readFileSync(filePath, 'utf8');
    const cols = JSON.parse(fileContents);
    
    // Mapas para otimizar busca
    const colsMap = new Map();
    for (const key in cols) {
      const c = cols[key];
      colsMap.set(String(c.matricula).replace(/^0+/, ''), c);
      colsMap.set(String(c.identificador).replace(/^0+/, ''), c);
      colsMap.set(String(c.cod_cracha).replace(/^0+/, ''), c);
      colsMap.set(String(key), c);
    }

    // Carregar presenças
    const presencasRef = collection(db, "treinamentos", id, "presencas");
    const q = query(presencasRef, orderBy("data_registro", "asc"));
    const presencasSnap = await getDocs(q);
    
    // Mapa de presenças usando o identificador_lido limpo (remover zeros à esquerda)
    const presencasMap = new Map();
    presencasSnap.docs.forEach(p => {
        const pData = p.data();
        const identLimpo = String(pData.identificador_lido || "").replace(/^0+/, '');
        presencasMap.set(identLimpo, pData);
    });

    const matchIds = (a: string, b: string) => {
        if (!a || !b) return false;
        const ca = String(a).replace(/^0+/, '');
        const cb = String(b).replace(/^0+/, '');
        if (ca === cb) return true;
        const no3100A = ca.startsWith('3100') ? ca.substring(4) : ca;
        const no3100B = cb.startsWith('3100') ? cb.substring(4) : cb;
        return no3100A === no3100B;
    };

    // Construir a lista de pessoas "Previstas" (Público-Alvo)
    const membros = publicoAlvo.membros || publicoAlvo.matriculas || [];
    const previstosEnriquecidos = membros.map((membro: any) => {
        const id_original = membro.matricula || membro;
        const cleanM = String(id_original).replace(/^0+/, '');
        let colab = colsMap.get(cleanM) || colsMap.get(id_original);
        
        // Se o cargo vier como ESTAGIARIO, tenta buscar pela matricula se existe um cadastro melhor
        if (colab && colab.cargo && colab.cargo.includes("ESTAGIARIO")) {
            const matricula = colab.matricula;
            if (matricula && colsMap.has(matricula)) {
                const melhorColab = colsMap.get(matricula);
                if (melhorColab && !melhorColab.cargo.includes("ESTAGIARIO")) {
                    colab = melhorColab;
                }
            }
        }

        
        return {
            _id: id_original,
            nome: colab ? colab.nome : "Desconhecido",
            matricula: colab ? (colab.matricula || id_original) : id_original,
            identificador: colab ? colab.identificador : null,
            cod_cracha: colab ? colab.cod_cracha : null,
            cargo: colab ? colab.cargo : "Não informado",
            planta: colab ? colab.planta : "Não informado",
            empresa: colab ? colab.empresa : "Não informado",
            rol: membro.rol || colab?.rol || "Nenhum"
        };
    });

    const relatorioRegistros: any[] = [];
    const presencasProcessadas = new Set(); // Para saber quem foi "Extra"

    // 1. Passar pelos Previstos e verificar status
    previstosEnriquecidos.forEach((p: any) => {
        // Tentar encontrar presença por identificador, matricula, cod_cracha ou _id limpos
        const idsToCheck = [
            String(p._id).replace(/^0+/, ''),
            String(p.matricula).replace(/^0+/, ''),
            String(p.identificador).replace(/^0+/, ''),
            String(p.cod_cracha).replace(/^0+/, '')
        ].filter(Boolean);
        let presencaEncontrada = null;
        let presencaKey = null;

        for (const [key, pData] of presencasMap.entries()) {
            for (const idCheck of idsToCheck) {
                if (matchIds(key, idCheck)) {
                    presencaEncontrada = pData;
                    presencaKey = key;
                    break;
                }
            }
            if (presencaEncontrada) break;
        }

        if (presencaEncontrada && presencaKey) {
            presencasProcessadas.add(presencaKey);
        }

        // Adicionar ao relatório
        relatorioRegistros.push({
            nomeTreinamento: treinamento.nome,
            nomeColaborador: p.nome,
            matricula: p.matricula,
            cargo: p.cargo,
            planta: p.planta,
            empresa: p.empresa,
            rol: p.rol,
            facilitador: presencaEncontrada?.facilitador_nome || treinamento.facilitador_nome || "Nenhum",
            status: presencaEncontrada ? "CAPACITADO" : "NÃO CAPACITADO",
            dataPresenca: presencaEncontrada?.data_registro?.toDate()?.toISOString() || ""
        });
    });

    // 2. Passar pelas Presenças para encontrar os EXTRAS
    presencasSnap.docs.forEach(p => {
        const pData = p.data();
        const identLimpo = String(pData.identificador_lido || "").replace(/^0+/, '');
        
        if (!presencasProcessadas.has(identLimpo)) {
            // É um extra! Vamos tentar enriquecer com base no colsMap usando o identificador
            let colab = colsMap.get(identLimpo) || colsMap.get(pData.identificador_lido);
            
            if (!colab) {
                // Busca mais flexível (ignora prefixos como 3100)
                for (const [key, val] of colsMap.entries()) {
                    if (matchIds(identLimpo, key)) {
                        colab = val;
                        break;
                    }
                }
            }
            
            relatorioRegistros.push({
                nomeTreinamento: treinamento.nome,
                nomeColaborador: colab ? colab.nome : (pData.nome || "Desconhecido"),
                matricula: colab ? (colab.matricula || pData.identificador_lido) : pData.identificador_lido,
                cargo: colab ? colab.cargo : "Não informado",
                planta: colab ? colab.planta : (pData.planta || "Não informado"),
                empresa: colab ? colab.empresa : (pData.empresa || "Não informado"),
                rol: "Nenhum (Extra)",
                facilitador: pData.facilitador_nome || treinamento.facilitador_nome || "Nenhum",
                status: "CAPACITADO (EXTRA)",
                dataPresenca: pData.data_registro?.toDate()?.toISOString() || ""
            });
        }
    });

    // Ver se pede JSON
    const formato = searchParams.get("formato");
    if (formato === "json") {
      return NextResponse.json({ success: true, data: relatorioRegistros });
    }

    // Gerar CSV
    const cabecalho = "NOME_TREINAMENTO,NOME_COLABORADOR,MATRICULA,CARGO,PLANTA,EMPRESA,PAPEL_ROL,FACILITADOR,STATUS,DATA_PRESENCA\n";
    const linhas = relatorioRegistros.map(r => {
      const dataFormatada = r.dataPresenca ? r.dataPresenca : "-";
      return `"${r.nomeTreinamento}","${r.nomeColaborador}","${r.matricula}","${r.cargo}","${r.planta}","${r.empresa}","${r.rol}","${r.facilitador}","${r.status}","${dataFormatada}"`;
    }).join("\n");

    // Adicionar BOM para Excel abrir UTF-8 corretamente
    const bom = '\uFEFF';
    const csvStr = bom + cabecalho + linhas;

    const response = new NextResponse(csvStr);
    response.headers.set("Content-Type", "text/csv; charset=utf-8");
    response.headers.set("Content-Disposition", `attachment; filename="aderencia_${treinamento.nome.replace(/\s+/g, '_')}.csv"`);
    
    return response;
  } catch (error: any) {
    console.error("Erro Exportar Aderencia:", error);
    return NextResponse.json({ error: "Erro ao gerar CSV" }, { status: 500 });
  }
}
