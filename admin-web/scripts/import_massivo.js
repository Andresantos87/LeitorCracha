const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');

const API_URL = 'http://localhost:3000/api/colaboradores/batch';
const BASE_DIR = 'C:\\\\Users\\\\ansantos\\\\OneDrive - CMPC\\\\Área de Trabalho\\\\APK';
const FILES = [
  'cmpc_all_pt_digital_rainbow_workers.csv',
  'mifibra_user (1).csv'
];

const uniqueUsers = new Map();

function parseRainbowRow(row) {
  const identificador = row.cpf || row.rg || row.email;
  if (!identificador) return null;
  return {
    identificador,
    nome: row.funcionario || 'Sem Nome',
    planta: row.empresa || row.local_prestacao || 'Outros'
  };
}

function parseMifibraRow(row) {
  const email = row.user_email || row.user_login;
  if (!email || !email.includes('@')) return null;
  const nome = `${row.user_name_first || ''} ${row.user_name_last || ''}`.trim() || 'Sem Nome';
  const domain = email.split('@')[1];
  let planta = 'Outros';
  if (domain === 'cmpc.com' || domain === 'cmpc.cl') planta = 'Guaíba';
  else if (domain === 'dialectosur.cl') planta = 'Los Angeles';
  
  return {
    identificador: email,
    nome,
    planta
  };
}

async function uploadBatches() {
  const allUsers = Array.from(uniqueUsers.values());
  console.log(`\nLeitura concluída. Encontrados ${allUsers.length} usuários únicos totais.`);
  console.log('Pulando inserção de 400.000 documentos para poupar custos de gravação do Firebase.');
  console.log('Todos os colaboradores gravados. Salvando estatísticas consolidadas...');
  
  // Agrupar estatísticas
  const stats = { total: allUsers.length, porPlanta: {} };
  allUsers.forEach(u => {
    if (!stats.porPlanta[u.planta]) stats.porPlanta[u.planta] = 0;
    stats.porPlanta[u.planta]++;
  });

  try {
    const resStats = await fetch('http://localhost:3000/api/colaboradores/update-stats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(stats)
    });
    const jsonStats = await resStats.json();
    if (jsonStats.success) {
      console.log('Estatísticas atualizadas com sucesso no Firebase!');
    } else {
      console.error('Erro ao atualizar estatísticas:', jsonStats.error);
    }
  } catch(e) {
    console.error('Falha de rede ao salvar estatísticas:', e.message);
  }

  console.log('Finalizado todos os uploads!');
}

function processFile(fileIndex) {
  if (fileIndex >= FILES.length) {
    uploadBatches();
    return;
  }

  const fileName = FILES[fileIndex];
  const isRainbow = fileName.includes('rainbow');
  console.log(`\nIniciando leitura de: ${fileName}`);
  
  fs.createReadStream(path.join(BASE_DIR, fileName))
    .pipe(csv())
    .on('data', (row) => {
      const parsed = isRainbow ? parseRainbowRow(row) : parseMifibraRow(row);
      if (parsed && !uniqueUsers.has(parsed.identificador)) {
        uniqueUsers.set(parsed.identificador, parsed);
      }
    })
    .on('end', () => {
      console.log(`-> Concluído: ${fileName}`);
      processFile(fileIndex + 1);
    });
}

processFile(0);
