import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { login, logout } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const { action, email, password } = await req.json();

    if (action === 'logout') {
      await logout();
      return NextResponse.json({ success: true });
    }

    if (action === 'login') {
      if (!email || !password) {
        return NextResponse.json({ success: false, error: 'Email e senha são obrigatórios' }, { status: 400 });
      }

      // Buscar usuário no Firestore
      const usersRef = collection(db, 'usuarios');
      const q = query(usersRef, where('email', '==', email.toLowerCase()));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        return NextResponse.json({ success: false, error: 'Credenciais inválidas' }, { status: 401 });
      }

      const userDoc = snapshot.docs[0];
      const userData = userDoc.data();

      // Checa a senha (Em MVP vamos checar direto, em prod usar hash bcrypt)
      if (userData.password !== password) {
        return NextResponse.json({ success: false, error: 'Credenciais inválidas' }, { status: 401 });
      }

      // Se passou, logar
      await login({
        id: userDoc.id,
        email: userData.email,
        nome: userData.nome,
        role: userData.role || 'leitor' // fallback seguro
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: 'Ação inválida' }, { status: 400 });

  } catch (error: any) {
    console.error("Auth API Error:", error);
    return NextResponse.json({ success: false, error: 'Erro interno no servidor' }, { status: 500 });
  }
}
