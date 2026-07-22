# Leitor de Crachá CMPC

Sistema de controle de treinamentos e registro de presenças utilizando Web, QR Code e leitura NFC nativa.

## Estrutura do Projeto
- `admin-web/`: Painel administrativo Web desenvolvido em Next.js.
- `app/`: Aplicativo Android nativo em Kotlin para leitura de crachás físicos (NFC).

## Funcionalidades
- Criação e Gestão de Treinamentos/Turmas.
- Assinatura Digital remota pelo celular do colaborador.
- Leitura de NFC via Chrome (WebNFC) ou via Aplicativo Android.
- Exportação de Lista de Presenças em Excel.
