# Panóptico — Gestão Inteligente

Aplicativo PWA independente, sem login do ChatGPT. Cada usuário entra com sua conta Google e os dados ficam em uma pasta criada pelo aplicativo no próprio Google Drive. A área **Importar Excel** aceita `.xlsx`, `.xls` e `.csv`, reconhece as colunas e incorpora os registros aos módulos de Memorandos, Atendimentos ou Ocorrências.

## Google Cloud configurado

O Client ID do projeto **Panóptico Gestão Inteligente** já está inserido no arquivo `config.js`. Para publicação na internet/Android, adicione o endereço HTTPS definitivo em **Origens JavaScript autorizadas** no Google Auth Platform.

## Instalação

- Windows/Android: abrir no Chrome e escolher **Instalar aplicativo**. Depois disso, o Panóptico abre por ícone próprio, como aplicativo independente.
- iPhone/iPad: abrir no Safari, tocar em **Compartilhar** e **Adicionar à Tela de Início**.

## Escopo solicitado

O aplicativo utiliza `drive.file`, acesso limitado aos arquivos e pastas que ele próprio cria. Ele não lê os demais documentos do usuário.
