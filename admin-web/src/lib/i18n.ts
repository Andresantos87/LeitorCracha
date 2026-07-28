export type Language = 'pt' | 'es';

export interface Translations {
  // Navigation & General
  dashboard: string;
  treinamentos: string;
  colaboradores: string;
  relatorios: string;
  usuarios: string;
  logout: string;
  user: string;

  // Registrar Page
  regTitle: string;
  regSubtitle: string;
  searchLabel: string;
  searchPlaceholder: string;
  btnSearch: string;
  btnSearching: string;
  notFound: string;
  confirmTitle: string;
  colaboradorLabel: string;
  empresaLabel: string;
  cargoLabel: string;
  drawSignLabel: string;
  btnClear: string;
  btnConfirm: string;
  btnSaving: string;
  errEmptySign: string;
  successTitle: string;
  successMsg: string;
  btnNewRegister: string;
  notInformed: string;
}

export const translations: Record<Language, Translations> = {
  pt: {
    dashboard: "Dashboard",
    treinamentos: "Treinamentos",
    colaboradores: "Colaboradores (Excel)",
    relatorios: "Relatórios",
    usuarios: "Usuários",
    logout: "Sair",
    user: "Usuário",

    regTitle: "REGISTRO DE PRESENÇA EM TREINAMENTO",
    regSubtitle: "Controle na Nuvem (NFC / QR / Manual)",
    searchLabel: "Digite seu NOME, DOCUMENTO ou MATRÍCULA:",
    searchPlaceholder: "Ex: 19802051 ou João Silva...",
    btnSearch: "BUSCAR",
    btnSearching: "BUSCANDO...",
    notFound: "Colaborador não encontrado! Tente outro nome ou documento.",
    confirmTitle: "CONFIRMAR DADOS PARA REGISTRO",
    colaboradorLabel: "Colaborador(a):",
    empresaLabel: "Empresa / Planta:",
    cargoLabel: "Cargo / Função:",
    drawSignLabel: "DESENHE SUA ASSINATURA NO QUADRO ABAIXO:",
    btnClear: "Limpar Assinatura",
    btnConfirm: "CONFIRMAR E ASSINAR",
    btnSaving: "SALVANDO...",
    errEmptySign: "Por favor, desenhe sua assinatura para confirmar a presença.",
    successTitle: "Presença Confirmada!",
    successMsg: "Sua assinatura e presença foram registradas com sucesso no sistema da CMPC.",
    btnNewRegister: "Novo Registro",
    notInformed: "Não Informado"
  },
  es: {
    dashboard: "Panel",
    treinamentos: "Capacitaciones",
    colaboradores: "Colaboradores (Excel)",
    relatorios: "Reportes",
    usuarios: "Usuarios",
    logout: "Salir",
    user: "Usuario",

    regTitle: "REGISTRO DE ASISTENCIA EN CAPACITACIÓN",
    regSubtitle: "Control en la Nube (NFC / QR / Manual)",
    searchLabel: "Ingrese su NOMBRE, DOCUMENTO o MATRÍCULA:",
    searchPlaceholder: "Ej: 19802051-6 o Juan Silva...",
    btnSearch: "BUSCAR",
    btnSearching: "BUSCANDO...",
    notFound: "¡Colaborador no encontrado! Intente con otro nombre o documento.",
    confirmTitle: "CONFIRMAR DATOS PARA ASISTENCIA",
    colaboradorLabel: "Colaborador(a):",
    empresaLabel: "Empresa / Planta:",
    cargoLabel: "Cargo / Función:",
    drawSignLabel: "DIBUJE SU FIRMA EN EL RECUADRO ABAJO:",
    btnClear: "Limpiar Firma",
    btnConfirm: "CONFIRMAR Y FIRMAR",
    btnSaving: "GUARDANDO...",
    errEmptySign: "Por favor, dibuje su firma para confirmar la asistencia.",
    successTitle: "¡Asistencia Confirmada!",
    successMsg: "Su firma y asistencia fueron registradas con éxito en el sistema de CMPC.",
    btnNewRegister: "Nuevo Registro",
    notInformed: "No Informado"
  }
};

export const DEFAULT_LANG: Language = 'pt';
