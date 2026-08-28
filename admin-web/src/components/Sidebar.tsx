"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ShieldAlert, LogOut } from "lucide-react";
import { LanguageToggle } from "./LanguageToggle";
import { useTranslation } from "@/lib/useTranslation";

export function Sidebar({ role, userName }: { role?: string; userName?: string }) {
  const pathname = usePathname();
  const router = useRouter();

  const { t } = useTranslation();

  const allItems = [
    { name: t.dashboard, path: "/", roles: ["admin", "gestor"] },
    { name: t.treinamentos, path: "/treinamentos", roles: ["admin", "gestor"] },
    { name: t.checklists, path: "/checklists", roles: ["admin", "gestor"] },
    { name: t.publicosAlvo, path: "/publicos-alvo", roles: ["admin", "gestor"] },
    { name: t.colaboradores, path: "/colaboradores", roles: ["admin", "gestor", "leitor"] },
    { name: t.relatorios, path: "/relatorios", roles: ["admin", "gestor", "leitor"] },
    { name: t.agenda, path: "/agenda", roles: ["admin", "gestor", "leitor"] },
    { name: t.facilitadores, path: "/facilitadores", roles: ["admin", "gestor"] },
    { name: t.usuarios, path: "/usuarios", roles: ["admin"] },
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
      <div className="p-5 border-b border-slate-800 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <img src="/logo-cmpc.png" alt="CMPC Treinamentos" className="h-9 w-9 object-contain bg-white rounded-full p-1 shadow-md" />
          <div className="flex flex-col">
            <h1 className="text-base font-bold text-white tracking-tight leading-tight">CMPC</h1>
            <span className="text-[10px] font-semibold text-blue-400 tracking-wider">TREINAMENTOS</span>
          </div>
        </div>
        <LanguageToggle />
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
          <span className="text-sm font-medium text-slate-300">{userName || t.user}</span>
          <span className="text-xs text-slate-500 uppercase">{role}</span>
        </div>
        <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors" title={t.logout}>
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </aside>
  );
}
