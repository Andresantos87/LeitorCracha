const fs = require('fs');
let content = fs.readFileSync('src/app/treinamentos/page.tsx', 'utf8');

const anchor1 = 'const [selectedRoleToAssign, setSelectedRoleToAssign] = useState("");';
content = content.replace(anchor1, anchor1 + '\n  const [selectedTurmaToAssign, setSelectedTurmaToAssign] = useState("");');

const anchor2 = 'setSelectedRoleToAssign("");';
content = content.replace(anchor2, anchor2 + '\n        setSelectedTurmaToAssign("");');

const anchor3 = 'const handleAssignRoleBatch = async () => {';
const moveFunc = \
  const handleMoveBatch = async () => {
    if (!selectedId || selectedPresencas.length === 0 || !selectedTurmaToAssign) return;
    try {
      const res = await fetch('/api/presencas/mover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origemId: selectedId,
          destinoId: selectedTurmaToAssign,
          presencasIds: selectedPresencas
        })
      });
      const json = await res.json();
      if (json.success) {
        toast.success(selectedPresencas.length + ' presenças movidas!');
        setSelectedPresencas([]);
        setSelectedTurmaToAssign('');
        carregarPresencas(selectedId);
      } else {
        toast.error('Erro ao mover presenças');
      }
    } catch (error) {
      console.error('Erro', error);
      toast.error('Erro na requisição');
    }
  };

\;
content = content.replace(anchor3, moveFunc + anchor3);

const anchor4 = '{selectedPresencas.length > 0 && rolesDisponiveis.length > 0 && (';
const uiReplace = \
                {selectedPresencas.length > 0 && (
                  <div className="flex flex-col sm:flex-row gap-4 mb-4">
                    {/* Role selector */}
                    {rolesDisponiveis.length > 0 && (
\;
content = content.replace(anchor4, uiReplace);

const anchor5 = 'Aplicar\n                        </button>\n                      </div>\n                    )}';
const uiReplaceEnd = \Aplicar
                        </button>
                      </div>
                    )}
                    
                    {/* Move class selector */}
                    <div className="flex items-center gap-4 bg-emerald-950/30 border border-emerald-900/50 p-3 rounded-xl animate-in fade-in slide-in-from-top-2">
                      <span className="text-emerald-300 font-bold text-sm px-2 whitespace-nowrap">
                        Mover para:
                      </span>
                      <select
                        value={selectedTurmaToAssign}
                        onChange={(e) => setSelectedTurmaToAssign(e.target.value)}
                        className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-300 text-sm focus:outline-none focus:border-emerald-500 max-w-[200px]"
                      >
                        <option value="">Selecione a Turma...</option>
                        {treinamentos.filter(t => {
                          const curr = treinamentos.find(x => x.id === selectedId);
                          return curr && t.nome === curr.nome && t.id !== selectedId;
                        }).map(t => (
                          <option key={t.id} value={t.id}>{t.turma || "Todas as Turmas"}</option>
                        ))}
                      </select>
                      <button
                        onClick={handleMoveBatch}
                        disabled={!selectedTurmaToAssign}
                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium text-sm rounded-lg transition-colors shadow-lg shadow-emerald-600/20"
                      >
                        Mover
                      </button>
                    </div>
                  </div>
                )}
\;
content = content.replace(anchor5, uiReplaceEnd);

fs.writeFileSync('src/app/treinamentos/page.tsx', content, 'utf8');
console.log('Patch aplicado com sucesso!');
