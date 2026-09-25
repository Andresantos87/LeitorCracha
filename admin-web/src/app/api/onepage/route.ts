import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export async function GET() {
  try {
    const docRef = doc(db, 'dashboard', 'onepage_lignia');
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return NextResponse.json({ success: true, data: docSnap.data() });
    }
    return NextResponse.json({ success: true, data: { comentarios: "", ptRawData: [] } });
  } catch (error) {
    console.error('Error fetching OnePage data:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const docRef = doc(db, 'dashboard', 'onepage_lignia');
    
    // Merge true to only update the fields passed (comentarios or ptRawData)
    await setDoc(docRef, body, { merge: true });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving OnePage data:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
