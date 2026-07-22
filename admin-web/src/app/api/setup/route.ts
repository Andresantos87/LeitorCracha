import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, deleteDoc, doc } from 'firebase/firestore';

// Rota secreta para criar o primeiro administrador
export async function GET(req: Request) {
  try {
    const usersRef = collection(db, 'usuarios');
    const snapshot = await getDocs(usersRef);

    // Apaga os antigos para garantir que fica limpo
    for (const d of snapshot.docs) {
      await deleteDoc(doc(db, 'usuarios', d.id));
    }

    await addDoc(usersRef, {
      nome: 'André Santos (Admin)',
      email: 'andre.santos@cmpc.com',
      password: 'cmpc2026',
      role: 'admin',
      dataCriacao: new Date().toISOString()
    });
    return NextResponse.json({ success: true, message: 'Usuário administrador atualizado para andre.santos@cmpc.com' });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Erro ao criar setup' }, { status: 500 });
  }
}
