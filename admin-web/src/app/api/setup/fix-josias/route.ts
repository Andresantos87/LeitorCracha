import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDocs, collection } from 'firebase/firestore';

export async function GET() {
  try {
    const presencasRef = collection(db, 'treinamentos', 'O8T4EHU9HEmrbfMezHDC', 'presencas');
    const pSnap = await getDocs(presencasRef);
    const data = pSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    return NextResponse.json({ success: true, data });
  } catch(e: any) {
    return NextResponse.json({ error: e.message });
  }
}
