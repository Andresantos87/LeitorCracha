import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';

export async function PUT(req: Request) {
  try {
    const { userId, cursos_permitidos } = await req.json();

    if (!userId) {
      return NextResponse.json({ success: false, error: 'User ID missing' }, { status: 400 });
    }

    const userRef = doc(db, 'usuarios', userId);
    await updateDoc(userRef, {
      cursos_permitidos: cursos_permitidos || []
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating permissions:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
