import { db } from './src/lib/firebase';
import { getDocs, collection } from 'firebase/firestore';

async function main() {
  const pSnap = await getDocs(collection(db, 'publicos_alvo'));
  let found = null;
  pSnap.forEach(d => {
    const data = d.data();
    if (data.matriculas_detalhes && data.matriculas_detalhes.length > 0) {
      found = data.matriculas_detalhes[0];
    }
  });
  
  console.log(found);
  process.exit(0);
}
main();
