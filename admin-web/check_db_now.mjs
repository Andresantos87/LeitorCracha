import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCMpz0rjC2QhCEOD5C03JZVFAiAxTSfsrU",
  authDomain: "treinamentoscmpc.firebaseapp.com",
  projectId: "treinamentoscmpc",
  storageBucket: "treinamentoscmpc.firebasestorage.app",
  messagingSenderId: "1033583878405",
  appId: "1:1033583878405:web:d22e2b7814555b7f85d76c"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function check() {
  console.log("=== VARREDURA COMPLETA ABSOLUTAMENTE DE TODOS OS CURSOS E TURMAS NO FIRESTORE ===");
  const snapshot = await getDocs(collection(db, "treinamentos"));
  console.log(`Total de treinamentos cadastrados: ${snapshot.size}`);
  let totalPresencasGeral = 0;
  for (const doc of snapshot.docs) {
    const data = doc.data();
    const presSnap = await getDocs(collection(db, "treinamentos", doc.id, "presencas"));
    console.log(`\nID: [${doc.id}] | Nome: '${data.nome}' | Turma: '${data.turma || ""}' | Planta: '${data.planta || ""}' | Presenças: ${presSnap.size} | Criado em: ${data.data?.toDate()?.toISOString() || "N/A"}`);
    if (presSnap.size > 0) {
      for (const p of presSnap.docs) {
        const pData = p.data();
        totalPresencasGeral++;
        console.log(`    -> [${p.id}] Nome: '${pData.nome || "N/A"}' | Identificador: '${pData.identificador_lido}' | Modo: '${pData.modo_registro}' | Data: ${pData.data_registro?.toDate()?.toISOString() || "N/A"}`);
      }
    }
  }
  console.log(`\nTOTAL GERAL DE PRESENÇAS EM TODO O BANCO DE DADOS: ${totalPresencasGeral}`);
  process.exit(0);
}

check().catch(e => { console.error(e); process.exit(1); });
