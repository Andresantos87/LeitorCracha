import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';

export async function PUT(req: Request) {
  try {
    const { userId, cursos_permitidos, abas_permitidas } = await req.json();

    if (!userId) {
      return NextResponse.json({ success: false, error: 'User ID missing' }, { status: 400 });
    }

    const updates: any = {};
    if (cursos_permitidos !== undefined) updates.cursos_permitidos = cursos_permitidos;
    if (abas_permitidas !== undefined) updates.abas_permitidas = abas_permitidas;

    const userRef = doc(db, 'usuarios', userId);
    await updateDoc(userRef, updates);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating permissions:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
