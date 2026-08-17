const fs = require('fs');

// 1. Refactor Publicos-Alvo
try {
  let file = 'src/app/publicos-alvo/page.tsx';
  let code = fs.readFileSync(file, 'utf8');

  // Imports
  if (!code.includes('import ConfirmModal')) {
    code = code.replace("import { Trash2", "import ConfirmModal from '@/components/ConfirmModal';\nimport PromptModal from '@/components/PromptModal';\nimport toast from 'react-hot-toast';\nimport { Trash2");
  }

  // State
  if (!code.includes('const [confirmModal,')) {
    code = code.replace("const [userRole, setUserRole] = useState<string | null>(null);", "const [userRole, setUserRole] = useState<string | null>(null);\n  const [confirmModal, setConfirmModal] = useState<{isOpen: boolean, title: string, message: string, onConfirm: () => void, variant: 'danger'|'warning'}>({isOpen: false, title: '', message: '', onConfirm: () => {}, variant: 'danger'});\n  const [promptModal, setPromptModal] = useState<{isOpen: boolean, title: string, message: string, onConfirm: (v: string) => void}>({isOpen: false, title: '', message: '', onConfirm: () => {}});");
  }

  // Replace prompts
  code = code.replace(/const rol = window\.prompt\([\s\S]*?\);[\s\S]*?if \(rol !== null\) \{([\s\S]*?)\}/m, `setPromptModal({
      isOpen: true,
      title: "Atribuir Rol",
      message: "Digite o papel (rol) para aplicar a todos da lista (ex: Operador, Brigadista):",
      onConfirm: (rol) => {
        $1
        setPromptModal(prev => ({...prev, isOpen: false}));
        toast.success("Rol aplicado aos selecionados!");
      }
    });`);

  // Replace confirm for delete publico
  code = code.replace(/if \(!confirm\([\s\S]*?\)\) return;([\s\S]*?const res = await fetch\(\`\/api\/publicos-alvo\?id=\$\{id\}\`)/m, `setConfirmModal({
      isOpen: true,
      title: "Excluir Público-Alvo",
      message: "Tem certeza que deseja excluir este Público-Alvo? Isso não apagará as presenças, apenas a lista de convocação.",
      variant: "danger",
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        $1`);
        
  // Replace confirm for remove selected
  code = code.replace(/if\(confirm\("Remover todos os selecionados\?"\)\) setSelectedColaboradores\(\[\]\);/m, `setConfirmModal({
      isOpen: true,
      title: "Remover Selecionados",
      message: "Remover todos os selecionados da lista?",
      variant: "danger",
      onConfirm: () => {
        setSelectedColaboradores([]);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        toast.success("Selecionados removidos.");
      }
    });`);

  // Replace alerts
  code = code.replace(/alert\("Erro ao carregar.*?\);/g, `toast.error("Erro ao carregar públicos-alvo");`);
  code = code.replace(/alert\("Nenhum e-mail.*?\);/g, `toast.error("Nenhum e-mail encontrado na lista.");`);
  code = code.replace(/alert\(`\$\{emails\.length\} e-mail.*?\);/g, `toast.success(\`\${emails.length} e-mail(s) copiado(s)!\`);`);
  code = code.replace(/alert\("O nome do.*?\);/g, `toast.error("O nome do público-alvo é obrigatório.");`);
  code = code.replace(/alert\(editId \? ".*? atualizado!" : ".*? criado.*?"\);/g, `toast.success(editId ? "Público-Alvo atualizado!" : "Público-Alvo criado!");`);
  code = code.replace(/alert\(data\.error.*?\);/g, `toast.error(data.error || "Erro ao salvar");`);
  code = code.replace(/alert\("Erro de.*?\);/g, `toast.error("Erro de conexão");`);
  code = code.replace(/alert\("P.*?blico-Alvo exclu.*?do!"\);/g, `toast.success("Público-Alvo excluído!");`);
  code = code.replace(/alert\(data\.error \|\| ".*? permiss.*?"\);/g, `toast.error(data.error || "Você não tem permissão.");`);
  code = code.replace(/alert\("Erro ao excluir\."\);/g, `toast.error("Erro ao excluir.");`);

  // Fix unclosed bracket in delete function
  code = code.replace(/carregarPublicosAlvo\(\);\n    \} catch \(e\) \{\n      console\.error\(e\);\n      toast\.error\("Erro ao excluir\."\);\n    \}\n  \};/m, `carregarPublicosAlvo();\n    } catch (e) {\n      console.error(e);\n      toast.error("Erro ao excluir.");\n    }\n      }\n    });\n  };`);

  // Add Modals to JSX
  if (!code.includes('<ConfirmModal')) {
    code = code.replace('</div>\n  );\n}', `  <ConfirmModal {...confirmModal} onCancel={() => setConfirmModal(prev => ({...prev, isOpen: false}))} />
      <PromptModal {...promptModal} onCancel={() => setPromptModal(prev => ({...prev, isOpen: false}))} />
    </div>
  );
}`);
  }

  fs.writeFileSync(file, code);
  console.log('Publicos-alvo done');
} catch (e) { console.log(e); }

// 2. Refactor Treinamentos
try {
  let file = 'src/app/treinamentos/page.tsx';
  let code = fs.readFileSync(file, 'utf8');

  // Imports
  if (!code.includes('import ConfirmModal')) {
    code = code.replace("import { FolderPlus", "import ConfirmModal from '@/components/ConfirmModal';\nimport toast from 'react-hot-toast';\nimport { FolderPlus");
  }

  // State
  if (!code.includes('const [confirmModal,')) {
    code = code.replace("const [userRole, setUserRole] = useState<string | null>(null);", "const [userRole, setUserRole] = useState<string | null>(null);\n  const [confirmModal, setConfirmModal] = useState<{isOpen: boolean, title: string, message: string, onConfirm: () => void, variant: 'danger'|'warning'}>({isOpen: false, title: '', message: '', onConfirm: () => {}, variant: 'danger'});");
  }

  // Replace confirm for exclude presenca
  code = code.replace(/if \(!confirm\([\s\S]*?remover esta presen.*?\)\) return;([\s\S]*?const res = await fetch\(\`\/api\/presencas\?treinamentoId=)/m, `setConfirmModal({
      isOpen: true,
      title: "Remover Presença",
      message: "Tem certeza que deseja remover esta presença permanentemente?",
      variant: "danger",
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        $1`);

  // Fix unclosed bracket in exclude presenca
  code = code.replace(/carregarPresencas\(selectedId\);\n      carregarTreinamentos\(\);\n    \} catch \(e\) \{\n      alert\("Erro ao excluir\."\);\n    \}\n  \};/m, `carregarPresencas(selectedId);\n      carregarTreinamentos();\n    } catch (e) {\n      toast.error("Erro ao excluir.");\n    }\n      }\n    });\n  };`);

  // Replace confirm for exclude turma
  code = code.replace(/if \(!confirm\([\s\S]*?excluir esta turma.*?\)\) return;([\s\S]*?const res = await fetch\(\`\/api\/treinamentos\?id=)/m, `setConfirmModal({
      isOpen: true,
      title: "Excluir Turma",
      message: "Tem certeza que deseja excluir esta turma permanentemente?",
      variant: "danger",
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        $1`);

  // Fix unclosed bracket in exclude turma
  code = code.replace(/if \(selectedId === id\) setSelectedId\(null\);\n    carregarTreinamentos\(\);\n  \};/m, `if (selectedId === id) setSelectedId(null);\n    carregarTreinamentos();\n      }\n    });\n  };`);

  // Replace confirm for exclude pasta
  code = code.replace(/if \(!confirm\([\s\S]*?excluir TODO o curso.*?\)\) return;([\s\S]*?const res = await fetch\(\`\/api\/treinamentos\?nome=)/m, `setConfirmModal({
      isOpen: true,
      title: "Excluir Curso Inteiro",
      message: \`ATENÇÃO: Tem certeza que deseja excluir TODO o curso '\${nomeCurso}' e TODAS as suas turmas permanentemente?\`,
      variant: "danger",
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        $1`);

  // Fix unclosed bracket in exclude pasta
  code = code.replace(/setSelectedId\(null\);\n    carregarTreinamentos\(\);\n  \};/m, `setSelectedId(null);\n    carregarTreinamentos();\n      }\n    });\n  };`);

  // Replace alerts
  code = code.replace(/alert\("Por favor, colete a assinatura.*?\);/g, `toast.error("Por favor, colete a assinatura antes de confirmar.");`);
  code = code.replace(/alert\(json\.error\);/g, `toast.error(json.error);`);
  code = code.replace(/alert\(json\.error \|\| "Erro ao excluir presen.*?"\);/g, `toast.error(json.error || "Erro ao excluir presença.");`);
  code = code.replace(/alert\(json\.error \|\| "Erro ao excluir turma\."\);/g, `toast.error(json.error || "Erro ao excluir turma.");`);
  code = code.replace(/alert\(json\.error \|\| "Erro ao excluir curso\."\);/g, `toast.error(json.error || "Erro ao excluir curso.");`);

  // Add Modals to JSX
  if (!code.includes('<ConfirmModal')) {
    code = code.replace('</div>\n  );\n}', `  <ConfirmModal {...confirmModal} onCancel={() => setConfirmModal(prev => ({...prev, isOpen: false}))} />
    </div>
  );
}`);
  }

  fs.writeFileSync(file, code);
  console.log('Treinamentos done');
} catch (e) { console.log(e); }

// 3. Refactor Usuarios
try {
  let file = 'src/app/usuarios/page.tsx';
  let code = fs.readFileSync(file, 'utf8');
  
  // Imports
  if (!code.includes('import ConfirmModal')) {
    code = code.replace("import { Trash2,", "import ConfirmModal from '@/components/ConfirmModal';\nimport toast from 'react-hot-toast';\nimport { Trash2,");
  }

  // State
  if (!code.includes('const [confirmModal,')) {
    code = code.replace("const [userRole, setUserRole] = useState<string | null>(null);", "const [userRole, setUserRole] = useState<string | null>(null);\n  const [confirmModal, setConfirmModal] = useState<{isOpen: boolean, title: string, message: string, onConfirm: () => void, variant: 'danger'|'warning'}>({isOpen: false, title: '', message: '', onConfirm: () => {}, variant: 'danger'});");
  }

  // Replace confirm for delete
  code = code.replace(/if \(!confirm\([\s\S]*?excluir o acesso.*?\)\) return;([\s\S]*?const res = await fetch\(\`\/api\/usuarios\?id=)/m, `setConfirmModal({
      isOpen: true,
      title: "Excluir Acesso",
      message: \`Tem certeza que deseja excluir o acesso de \${email}?\`,
      variant: "danger",
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        $1`);
        
  // Fix unclosed bracket in delete user
  code = code.replace(/carregarUsuarios\(\);\n  \};/m, `carregarUsuarios();\n      }\n    });\n  };`);

  // Replace alert
  code = code.replace(/alert\("N.*o . poss.vel excluir.*?\);/g, `toast.error("Não é possível excluir o Administrador principal.");`);

  // Add Modals to JSX
  if (!code.includes('<ConfirmModal')) {
    code = code.replace('</div>\n  );\n}', `  <ConfirmModal {...confirmModal} onCancel={() => setConfirmModal(prev => ({...prev, isOpen: false}))} />
    </div>
  );
}`);
  }

  fs.writeFileSync(file, code);
  console.log('Usuarios done');
} catch (e) { console.log(e); }
