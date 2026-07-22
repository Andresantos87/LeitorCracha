"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ShieldAlert, LogOut } from "lucide-react";

export function Sidebar({ role, userName }: { role?: string; userName?: string }) {
  const pathname = usePathname();
  const router = useRouter();

  const allItems = [
    { name: "Dashboard", path: "/", roles: ["admin", "gestor"] },
    { name: "Treinamentos", path: "/treinamentos", roles: ["admin", "gestor"] },
    { name: "Colaboradores (Excel)", path: "/colaboradores", roles: ["admin", "gestor", "leitor"] },
    { name: "Relatórios", path: "/relatorios", roles: ["admin", "gestor", "leitor"] },
    { name: "Usuários", path: "/usuarios", roles: ["admin"] },
  ];

  const navItems = allItems.filter(item => !role || item.roles.includes(role));

  const handleLogout = async () => {
    await fetch("/api/auth", { method: "POST", body: JSON.stringify({ action: "logout" }) });
    router.push("/login");
    router.refresh();
  };

  // Se não tiver role, provavel tela de login
  if (!role) return null;

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col hidden md:flex">
      <div className="p-6 border-b border-slate-800">
        <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400 flex items-center gap-2">
          <ShieldAlert className="h-6 w-6 text-blue-500" />
          CMPC Painel
        </h1>
      </div>
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => {
          const isActive = pathname === item.path;
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`flex items-center space-x-3 px-3 py-2 rounded-lg font-medium transition-colors ${
                isActive 
                  ? "bg-blue-600 text-white" 
                  : "hover:bg-slate-800 text-slate-300"
              }`}
            >
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-slate-800 flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-sm font-medium text-slate-300">{userName || "Usuário"}</span>
          <span className="text-xs text-slate-500 uppercase">{role}</span>
        </div>
        <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors" title="Sair">
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </aside>
  );
}
