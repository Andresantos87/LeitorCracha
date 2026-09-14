import { NextResponse } from 'next/server';
import { db } from '../../../../lib/firebase';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';

export async function POST(req: Request) {
  try {
    const { origemId, destinoId, presencasIds } = await req.json();

    if (!origemId || !destinoId || !presencasIds || !Array.isArray(presencasIds) || presencasIds.length === 0) {
      return NextResponse.json({ success: false, error: 'Dados inválidos.' }, { status: 400 });
    }

    let count = 0;

    await Promise.all(presencasIds.map(async (pId: string) => {
      const docRefOrigem = doc(db, 'treinamentos', origemId, 'presencas', pId);
      const docSnap = await getDoc(docRefOrigem);

      if (docSnap.exists()) {
        const data = docSnap.data();
        const docRefDestino = doc(db, 'treinamentos', destinoId, 'presencas', pId);
        await setDoc(docRefDestino, data);
        await deleteDoc(docRefOrigem);
        count++;
      }
    }));

    return NextResponse.json({ success: true, count });
  } catch (error: any) {
    console.error('Erro ao mover', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
