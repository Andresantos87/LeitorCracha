import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, doc, deleteDoc, updateDoc } from 'firebase/firestore';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const usersRef = collection(db, 'usuarios');
    const snapshot = await getDocs(usersRef);
    
    const usuarios = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      password: '***' // hide password
    }));
    
    return NextResponse.json({ success: true, data: usuarios });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Erro ao buscar usuários' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { nome, email, role, password } = body;

    const docRef = await addDoc(collection(db, 'usuarios'), {
      nome,
      email: email.toLowerCase(),
      role,
      password,
      dataCriacao: new Date().toISOString()
    });

    return NextResponse.json({ success: true, data: { id: docRef.id } });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Erro ao criar usuário' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: 'ID não fornecido' }, { status: 400 });

    await deleteDoc(doc(db, 'usuarios', id));
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Erro ao excluir usuário' }, { status: 500 });
  }
}
