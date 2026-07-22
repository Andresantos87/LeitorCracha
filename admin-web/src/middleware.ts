import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { decrypt } from '@/lib/auth';

const publicRoutes = ['/login', '/api/auth', '/api/setup', '/api/buscar-colaborador'];

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  
  // Rotas públicas e sub-rotas como /registrar/[id]
  if (publicRoutes.some(route => path.startsWith(route)) || path.startsWith('/registrar/')) {
    return NextResponse.next();
  }

  // Verificar se tem sessão (token JWT no cookie)
  const sessionCookie = request.cookies.get('session')?.value;

  if (!sessionCookie) {
    // Redireciona para o login se não estiver logado
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    const payload = await decrypt(sessionCookie);
    if (!payload) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // Controle de Acesso Baseado em Nível (RBAC)
    const role = payload.role as string;

    // Gestor e Leitor não podem acessar a tela de Usuários
    if (path.startsWith('/usuarios') && role !== 'admin') {
      return NextResponse.redirect(new URL('/', request.url));
    }
    
    // Leitor não pode acessar Treinamentos (apenas exportar planilhas / relatorios)
    if (path.startsWith('/treinamentos') && role === 'leitor') {
      return NextResponse.redirect(new URL('/colaboradores', request.url));
    }

    return NextResponse.next();
  } catch (error) {
    // Token inválido ou expirado
    return NextResponse.redirect(new URL('/login', request.url));
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
