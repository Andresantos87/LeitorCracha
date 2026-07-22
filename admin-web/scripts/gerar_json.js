const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');

const BASE_DIR = 'C:\\\\Users\\\\ansantos\\\\OneDrive - CMPC\\\\Área de Trabalho\\\\APK';
const JSON_PATH = path.join(__dirname, '..', 'colaboradores.json');

// Lê dinamicamente todos os arquivos CSV da pasta
const FILES = fs.readdirSync(BASE_DIR).filter(file => file.toLowerCase().endsWith('.csv'));

console.log(`Encontrados ${FILES.length} arquivos CSV.`);
console.log(`Criando banco de dados JSON em: ${JSON_PATH}`);

const uniqueUsers = {};
const bannedIds = new Set();

function parseRainbowRow(row) {
  const identificador = row.cpf || row.rg || row.email || row.cod_cracha;
  if (!identificador) return null;
  
  if (!row.status || row.status.toUpperCase() !== 'ATIVO') {
    return null;
  }

  return {
    identificador,
    nome: row.funcionario || 'Sem Nome',
    planta: row.empresa || row.local_prestacao || 'Outros',
    cargo: row.cargo || row.cbo || 'Não Informado',
    matricula: row.cod_funcionario || ''
  };
}

function parseMifibraRow(row) {
  const email = row.user_email || row.user_login || row.user_id;
  if (!email) return null;

  // FILTRO: Se não for ativo (1), banimos todos os IDs associados a ele
  if (row.user_status_id !== '1') {
    if (row.user_email) bannedIds.add(row.user_email.toLowerCase());
    if (row.user_login) {
      bannedIds.add(row.user_login.toLowerCase());
      if (row.user_login.toUpperCase().startsWith('CPF:')) {
        bannedIds.add(row.user_login.substring(4).trim());
      }
      const match = row.user_login.match(/\d{11}/);
      if (match) bannedIds.add(match[0]);
    }
    return null;
  }

  if (!email.includes('@') && !email.toUpperCase().startsWith('CPF:')) return null;

  const nome = `${row.user_name_first || ''} ${row.user_name_last || ''}`.trim() || 'Sem Nome';
  let domain = email.includes('@') ? email.split('@')[1] : '';
  let planta = 'Outros';
  if (domain === 'cmpc.com' || domain === 'cmpc.cl') planta = 'Guaíba';
  else if (domain === 'dialectosur.cl') planta = 'Los Angeles';
  
  return {
    identificador: email.toUpperCase().startsWith('CPF:') ? email.substring(4).trim() : email,
    nome,
    planta,
    cargo: 'Não Informado',
    matricula: row.user_ref || ''
  };
}

function parseSatRow(row) {
  const rut = row.trabrut_guion;
  if (!rut) return null;
  
  if (!row.trabestadonombre_actual || row.trabestadonombre_actual.toUpperCase() !== 'HABILITADO') {
    return null;
  }

  const nome = `${row.trabnombres || ''} ${row.trabapellidos || ''}`.trim() || 'Sem Nome';
  return {
    identificador: rut,
    nome,
    planta: row.planta || row.trabempresanombre || 'Outros',
    cargo: row.trabocupacion || row.trabprofesion || 'Não Informado',
    matricula: row.trabid || ''
  };
}

function processFile(fileIndex) {
  if (fileIndex >= FILES.length) {
    console.log(`\nFase 1 Concluída. Aplicando Regra de Ouro: Exclui do objeto final qualquer ID que esteja na lista de banidos
    // EXCEÇÃO: O banimento do Mifibra só se aplica a funcionários próprios (CMPC). 
    // Para terceiros (ex: Mastermec), o status 'Ativo' do Rainbow/SAT prevalece.`);
    
    let excluidos = 0;
    for (const key of Object.keys(uniqueUsers)) {
      if (bannedIds.has(key.toLowerCase())) {
        const u = uniqueUsers[key];
        const isProprio = u.planta.toUpperCase().includes('CMPC') || 
                          u.planta.toUpperCase() === 'GUAÍBA' || 
                          u.planta.toUpperCase() === 'LOS ANGELES' || 
                          u.planta.toUpperCase().includes('SOFTYS');
        
        if (isProprio) {
          delete uniqueUsers[key];
          excluidos++;
        }
      }
    }

    console.log(`Foram removidos ${excluidos} cadastros por conflito de inatividade.`);
    console.log(`Importação Finalizada! Total de cadastros puramente ATIVOS: ${Object.keys(uniqueUsers).length}`);
    fs.writeFileSync(JSON_PATH, JSON.stringify(uniqueUsers));
    console.log(`Arquivo salvo em: ${JSON_PATH}`);
    return;
  }

  const fileName = FILES[fileIndex];
  console.log(`\nIniciando leitura de: ${fileName}`);

  let parseFn;
  if (fileName.includes('rainbow')) parseFn = parseRainbowRow;
  else if (fileName.includes('mifibra')) parseFn = parseMifibraRow;
  else parseFn = parseSatRow;

  fs.createReadStream(path.join(BASE_DIR, fileName))
    .pipe(csv())
    .on('data', (row) => {
      const parsed = parseFn(row);
      if (parsed && parsed.identificador) {
        if (!uniqueUsers[parsed.identificador]) {
          uniqueUsers[parsed.identificador] = {
            nome: parsed.nome,
            planta: parsed.planta,
            cargo: parsed.cargo,
            matricula: parsed.matricula
          };
        } else {
          // Atualiza com dados mais recentes se forem válidos (o arquivo pode ter registros mais novos no final)
          if (parsed.cargo && parsed.cargo !== 'Não Informado' && !parsed.cargo.startsWith('00000000')) {
            uniqueUsers[parsed.identificador].cargo = parsed.cargo;
          }
          if (parsed.planta && parsed.planta !== 'Outros') {
            uniqueUsers[parsed.identificador].planta = parsed.planta;
          }
          if (parsed.matricula && !uniqueUsers[parsed.identificador].matricula) {
            uniqueUsers[parsed.identificador].matricula = parsed.matricula;
          }
        }
      }
    })
    .on('end', () => {
      console.log(`-> Concluído: ${fileName}`);
      processFile(fileIndex + 1);
    });
}

processFile(0);
