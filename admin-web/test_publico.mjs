import { db } from './src/lib/firebase.js';
import { getDocs, collection, getDoc, doc } from 'firebase/firestore';

async function main() {
  const tSnap = await getDocs(collection(db, 'treinamentos'));
  const turmas = [];
  tSnap.forEach(d => turmas.push({id: d.id, ...d.data()}));

  const ptDigital = turmas.filter(t => t.nome === 'TREINAMENTO PT DIGITAL');
  const tAguas = ptDigital.find(t => t.turma.includes('OPERAÇÃO ÁGUAS'));
  const tMista = ptDigital.find(t => t.turma.includes('ENERGIA + AGUAS TURNO A1'));

  console.log('Aguas turma:', tAguas?.turma, 'PA:', tAguas?.publico_alvo_id);
  if (tAguas && tAguas.publico_alvo_id) {
    const pSnap = await getDoc(doc(db, 'publicos_alvo', tAguas.publico_alvo_id));
    console.log('Aguas PA matriculas:', pSnap.data()?.matriculas?.length || 0);
  }

  console.log('Mista turma:', tMista?.turma, 'PA:', tMista?.publico_alvo_id);
  if (tMista && tMista.publico_alvo_id) {
    const pSnap = await getDoc(doc(db, 'publicos_alvo', tMista.publico_alvo_id));
    console.log('Mista PA matriculas:', pSnap.data()?.matriculas?.length || 0);
  }

  process.exit(0);
}
main();
