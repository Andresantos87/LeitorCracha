# Mapeamento do Banco de Dados - LeitorCracha

Este documento detalha as tabelas (ou coleções) e seus respectivos campos que precisam ser criados para que a aplicação continue operando normalmente após a migração para uma nova base de dados.

A estrutura atual foi mapeada a partir do **Firebase Firestore** (um banco de dados orientado a documentos NoSQL). Caso a nova base seja relacional (como MySQL ou PostgreSQL), considere transformar os arrays e subcoleções em tabelas dependentes (chaves estrangeiras).

---

## 1. Coleção: `usuarios`
Armazena os dados de acesso e permissões dos usuários do sistema web (painel admin).

**Campos:**
- `nome` *(string)*: Nome completo do usuário.
- `email` *(string)*: E-mail de login (salvo sempre em lowercase).
- `role` *(string)*: Perfil de acesso. Valores comuns: `'admin'`, `'gestor'`, `'user'`.
- `password` *(string)*: Senha do usuário (idealmente salva como um hash criptografado na nova base).
- `dataCriacao` *(string/ISO Date)*: Data em que o usuário foi criado.
- `cursos_permitidos` *(array de strings)*: (Opcional) Lista com o nome das pastas/cursos aos quais o usuário tem acesso restrito.
- `abas_permitidas` *(array de strings)*: (Opcional) Lista com as guias/abas do menu que o usuário pode acessar.

---

## 2. Coleção: `treinamentos`
Armazena as sessões, eventos ou reuniões criadas no painel para as quais as presenças serão coletadas.

**Campos:**
- `nome` *(string)*: Nome principal do treinamento/evento.
- `turma` *(string)*: Código ou identificador da turma.
- `pais` *(string)*: País de realização (ex: 'BRASIL', 'CHILE').
- `planta` *(string)*: Fábrica ou localidade (ex: 'GUAÍBA (RAINBOW)', 'CHILE (SAT)').
- `instrutor_email` *(string)*: E-mail do instrutor responsável.
- `data` *(Timestamp/Date)*: Data e hora do registro de criação.
- `data_agendada` *(string)*: (Opcional) Data em que o evento foi agendado para ocorrer (formato `YYYY-MM-DD`).
- `horario_agendado` *(string)*: (Opcional) Hora agendada para o evento.
- `carga_horaria` *(number/string)*: (Opcional) Duração prevista.
- `status_agenda` *(string)*: Status atual do evento agendado (ex: `'CONCLUIDO'`, `'AGENDADO'`).
- `status_encerrado` *(boolean)*: Define se o treinamento já foi finalizado e bloqueado para novas presenças.
- `publico_alvo_id` *(string)*: (Opcional) ID de relacionamento com a tabela `publicos_alvo`.
- `esperado_manual` *(number)*: (Opcional) Meta manual de presenças inserida pelo usuário.
- `facilitador_id` *(string)*: (Opcional) ID de relacionamento com a tabela `facilitadores`.
- `facilitador_nome` *(string)*: (Opcional) Nome do facilitador salvo em texto para facilitar buscas.
- `checklist_dinamico` *(array de objetos)*: Lista de verificações/avaliações próprias deste evento. Cada objeto possui `{ id, texto, categoria, obrigatorio, checado (boolean) }`.
- `presencas_count` *(number)*: Contador em cache do número total de pessoas presentes no evento.

### 2.1 Subcoleção: `presencas`
Pertence e fica vinculada ao ID do treinamento (`treinamentos/{id}/presencas/{id}`). Na migração para banco relacional, deve ser uma tabela contendo uma chave `treinamento_id`.

**Campos:**
- `identificador_lido` *(string)*: Matrícula, CPF, RUT ou código cru extraído da leitura do crachá/QR. (Normalmente é a Chave Primária ou ID do documento).
- `nome` *(string)*: Nome da pessoa.
- `planta` *(string)*: Planta ou área da pessoa.
- `empresa` *(string)*: Empresa (própria CMPC ou terceira).
- `cargo` *(string)*: Cargo/função do funcionário.
- `modo_registro` *(string)*: Método pelo qual a presença foi coletada (ex: `'MANUAL'`, `'QRCODE'`, `'NFC'`).
- `data_registro` *(Timestamp/Date)*: Momento exato em que a presença foi validada.
- `assinaturaBase64` *(string/texto longo)*: (Opcional) Imagem em Base64 contendo a rubrica desenhada pelo funcionário na tela, caso aplicável.

---

## 3. Coleção: `publicos_alvo`
Armazena as turmas ou listas fixas de funcionários (Gantt) que devem realizar determinados treinamentos.

**Campos:**
- `nome` *(string)*: Nome da lista ou grupo.
- `descricao` *(string)*: Breve explicação do propósito da lista.
- `pasta` *(string)*: Pasta ou categoria à qual essa lista pertence (ex: 'Onboarding', 'Segurança').
- `matriculas` *(array de strings)*: Lista crua apenas com as matrículas/IDs esperados no grupo.
- `membros` *(array de objetos)*: Lista rica contendo o detalhamento de cada membro (ex: `{ nome, matricula, email, status }`).
- `roles_disponiveis` *(array de strings)*: Lista de cargos ou observações esperadas para este público.
- `criado_em` *(Timestamp/Date)*: Data de criação da lista.

---

## 4. Coleção: `facilitadores`
Armazena a lista de instrutores ou gestores que facilitam os eventos.

**Campos:**
- `nome` *(string)*: Nome do facilitador.
- `matricula` *(string)*: Identificador único do facilitador.
- `ativo` *(boolean)*: Status se ainda atua ativamente.
- `criadoEm` *(Timestamp/Date)*: Data de cadastro.

---

## 5. Coleção: `checklist_templates`
Armazena modelos globais de formulários e perguntas que os instrutores podem escolher na hora de abrir um novo evento.

**Campos:**
- `nome` *(string)*: Nome do template de checklist.
- `ativo` *(boolean)*: Define se o template aparece na lista de seleção.
- `criado_em` *(Timestamp/Date)*: Data de criação do template.
- `items` *(array de objetos)*: Lista contendo todas as perguntas do modelo. Formato:
  - `id` *(string)*
  - `texto` *(string)*: A pergunta ou item em si.
  - `categoria` *(string)*: Agrupador da pergunta (ex: 'EPIs', 'Comportamental').
  - `obrigatorio` *(boolean)*: Se o avaliador é forçado a preencher esse item.

---

## 6. Coleção: `dashboard` (Configurações Gerais)
Atualmente a aplicação salva configurações ou dados brutos agregados no documento `onepage_lignia` dentro de `dashboard`.

**Campos do Documento `onepage_lignia`:**
- `comentarios` *(string/texto longo)*: Comentários e destaques escritos pelo super admin.
- `ptRawData` *(array de objetos JSON)*: Cópia estática e compactada dos dados processados do painel de PT (Permissão de Trabalho). Cada objeto deve possuir no mínimo:
  - `Planta` *(string)*
  - `Área de operación` *(string)*
  - `Fecha de inicio` *(string)* *(Nota: o sistema atual mapeia a Data de Liberação/Atualização para este campo durante a injeção)*.

---

### Dicas para a Nova Arquitetura de Migração:
1. **Colaboradores Externos (`colaboradores.json`):** 
   - A aplicação atual faz cruzamento de matrículas usando um arquivo `colaboradores.json` no disco (Base SAT importada). Na nova base de dados, recomenda-se criar uma **Tabela `colaboradores`** definitiva para substituir a leitura do JSON, o que facilitará a escalabilidade.
2. **Relacionamentos:**
   - O campo `treinamentos.publico_alvo_id` aponta para `publicos_alvo.id`.
   - O campo `treinamentos.facilitador_id` aponta para `facilitadores.id`.
3. **Imagens Base64:**
   - O campo `assinaturaBase64` nas `presencas` pode consumir muito espaço em bancos relacionais com o tempo. Recomenda-se migrar as assinaturas para um Storage de arquivos (ex: S3, Blob Storage) e salvar no banco apenas o link (`url_assinatura`).
