import { db } from './src/lib/firebase';
import { getDocs, collection, getDoc, doc } from 'firebase/firestore';

async function main() {
  const tSnap = await getDocs(collection(db, 'treinamentos'));
  const turmas: any[] = [];
  tSnap.forEach(d => turmas.push({id: d.id, ...d.data()}));

  const ptDigital = turmas.filter(t => t.nome === 'TREINAMENTO PT DIGITAL');
  const tAguas = ptDigital.find(t => t.turma.includes('OPERAÇÃO ÁGUAS'));
  const tTodas = ptDigital.find(t => t.turma === 'TODAS AS TURMAS');
  
  if (!tAguas || !tAguas.publico_alvo_id) {
    console.log('Turma Aguas nao tem publico alvo atrelado!');
    process.exit(0);
  }
  
  const pSnap = await getDoc(doc(db, 'publicos_alvo', tAguas.publico_alvo_id));
  const pAguas = pSnap.data();
  console.log('Turma Aguas PA:', pAguas?.nome, 'Matriculas:', pAguas?.matriculas?.length || 0);
  
  const presSnap = await getDocs(collection(db, 'treinamentos', tTodas.id, 'presencas'));
  const presencas: any[] = [];
  presSnap.forEach(d => presencas.push(d.data()));
  
  let overlap: any[] = [];
  const mClean = (pAguas?.matriculas || []).map((m:string) => m.replace(/[.\-\/\s]/g, '').replace(/^0+/, '').toLowerCase());
  
  for (const p of presencas) {
    const idLido = (p.identificador_lido || '').replace(/[.\-\/\s]/g, '').replace(/^0+/, '').toLowerCase();
    const cMat = (p.matricula || '').replace(/[.\-\/\s]/g, '').replace(/^0+/, '').toLowerCase();
    const cCracha = (p.cod_cracha || '').replace(/[.\-\/\s]/g, '').replace(/^0+/, '').toLowerCase();
    
    const isMatch = mClean.some((m:string) => (idLido && m === idLido) || (cMat && m === cMat) || (cCracha && m === cCracha));
    if (isMatch) {
        overlap.push({ nome: p.colaborador_nome, matricula: p.matricula, lido: p.identificador_lido });
    }
  }
  
  console.log('Achou', overlap.length, 'pessoas em TODAS AS TURMAS que pertencem a AGUAS!');
  console.log(overlap.slice(0, 5));
  process.exit(0);
}
main();
