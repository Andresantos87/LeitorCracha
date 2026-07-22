const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');
const Database = require('better-sqlite3');

const BASE_DIR = 'C:\\\\Users\\\\ansantos\\\\OneDrive - CMPC\\\\Área de Trabalho\\\\APK';
const DB_PATH = path.join(__dirname, '..', 'colaboradores.db');
const FILES = [
  'cmpc_all_pt_digital_rainbow_workers.csv',
  'mifibra_user (1).csv'
];

console.log(`Criando banco de dados SQLite em: ${DB_PATH}`);
const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');

// Criar tabela
db.exec(`
  CREATE TABLE IF NOT EXISTS colaboradores (
    identificador TEXT PRIMARY KEY,
    nome TEXT,
    planta TEXT,
    cargo TEXT
  )
`);

// Preparar statement de inserção (usa REPLACE para sobrescrever se existir)
const insertStmt = db.prepare(`
  REPLACE INTO colaboradores (identificador, nome, planta, cargo)
  VALUES (@identificador, @nome, @planta, @cargo)
`);

function parseRainbowRow(row) {
  const identificador = row.cpf || row.rg || row.email || row.cod_cracha;
  if (!identificador) return null;
  return {
    identificador,
    nome: row.funcionario || 'Sem Nome',
    planta: row.empresa || row.local_prestacao || 'Outros',
    cargo: row.cargo || row.cbo || 'Não Informado'
  };
}

function parseMifibraRow(row) {
  const email = row.user_email || row.user_login || row.user_id;
  if (!email || !email.includes('@')) return null;
  const nome = `${row.user_name_first || ''} ${row.user_name_last || ''}`.trim() || 'Sem Nome';
  const domain = email.split('@')[1];
  let planta = 'Outros';
  if (domain === 'cmpc.com' || domain === 'cmpc.cl') planta = 'Guaíba';
  else if (domain === 'dialectosur.cl') planta = 'Los Angeles';
  
  return {
    identificador: email,
    nome,
    planta,
    cargo: 'Não Informado' // Mifibra não tem campo claro de cargo nessas colunas iniciais
  };
}

let count = 0;

function processFile(fileIndex) {
  if (fileIndex >= FILES.length) {
    console.log(`\nImportação Finalizada! Total de inserções/atualizações: ${count}`);
    db.close();
    return;
  }

  const fileName = FILES[fileIndex];
  const isRainbow = fileName.includes('rainbow');
  console.log(`\nIniciando leitura de: ${fileName}`);
  
  // Usar transação melhora drasticamente a velocidade de inserção no SQLite
  const insertMany = db.transaction((rows) => {
    for (const row of rows) {
      insertStmt.run(row);
      count++;
    }
  });

  let buffer = [];

  fs.createReadStream(path.join(BASE_DIR, fileName))
    .pipe(csv())
    .on('data', (row) => {
      const parsed = isRainbow ? parseRainbowRow(row) : parseMifibraRow(row);
      if (parsed && parsed.identificador) {
        buffer.push(parsed);
        if (buffer.length >= 5000) {
          insertMany(buffer);
          buffer = [];
        }
      }
    })
    .on('end', () => {
      if (buffer.length > 0) {
        insertMany(buffer);
      }
      console.log(`-> Concluído: ${fileName}`);
      processFile(fileIndex + 1);
    });
}

processFile(0);
