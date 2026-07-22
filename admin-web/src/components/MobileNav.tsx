"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X, LogOut } from "lucide-react";

export function MobileNav({ role }: { role?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  if (!role) return null;

  const allItems = [
    { name: "Dashboard", path: "/", roles: ["admin", "gestor"] },
    { name: "Treinamentos", path: "/treinamentos", roles: ["admin", "gestor"] },
    { name: "Colaboradores (Excel)", path: "/colaboradores", roles: ["admin", "gestor", "leitor"] },
    { name: "Relatórios", path: "/relatorios", roles: ["admin", "gestor", "leitor"] },
    { name: "Usuários", path: "/usuarios", roles: ["admin"] },
  ];

  const navItems = allItems.filter(item => item.roles.includes(role));

  const handleLogout = async () => {
    await fetch("/api/auth", { method: "POST", body: JSON.stringify({ action: "logout" }) });
    setIsOpen(false);
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="md:hidden">
      <button onClick={() => setIsOpen(!isOpen)} className="p-2 -mr-2 text-slate-300">
        {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {isOpen && (
        <div className="absolute top-16 left-0 right-0 bg-slate-900 border-b border-slate-800 p-4 shadow-xl z-50 animate-in slide-in-from-top-2">
          <nav className="flex flex-col space-y-2">
            {navItems.map((item) => {
              const isActive = pathname === item.path;
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  onClick={() => setIsOpen(false)}
                  className={`px-4 py-3 rounded-lg font-medium transition-colors ${
                    isActive 
                      ? "bg-blue-600 text-white" 
                      : "hover:bg-slate-800 text-slate-300"
                  }`}
                >
                  {item.name}
                </Link>
              );
            })}
            
            <button 
              onClick={handleLogout}
              className="px-4 py-3 mt-4 rounded-lg font-medium transition-colors text-red-400 hover:bg-red-900/20 text-left flex items-center gap-2"
            >
              <LogOut className="h-5 w-5" /> Sair do Sistema
            </button>
          </nav>
        </div>
      )}
    </div>
  );
}
