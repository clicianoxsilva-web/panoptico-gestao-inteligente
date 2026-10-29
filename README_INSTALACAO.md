# Panóptico — Gestão Inteligente

Aplicativo PWA independente, sem login do ChatGPT. Cada usuário entra com sua conta Google e os dados ficam em uma pasta criada pelo aplicativo no próprio Google Drive. A área **Importar Excel** aceita `.xlsx`, `.xls` e `.csv`, reconhece as colunas e incorpora os registros aos módulos de Memorandos, Atendimentos ou Ocorrências.

## Google Cloud configurado

O Client ID do projeto **Panóptico Gestão Inteligente** já está inserido no arquivo `config.js`. Para publicação na internet/Android, adicione o endereço HTTPS definitivo em **Origens JavaScript autorizadas** no Google Auth Platform.

## Instalação

- Windows/Android: abrir no Chrome e escolher **Instalar aplicativo**. Depois disso, o Panóptico abre por ícone próprio, como aplicativo independente.
- iPhone/iPad: abrir no Safari, tocar em **Compartilhar** e **Adicionar à Tela de Início**.

## Escopo solicitado

O aplicativo utiliza `drive.file`, acesso limitado aos arquivos e pastas que ele próprio cria. Ele não lê os demais documentos do usuário.

## Pré-cadastro de visitantes por lista (29/10/2026)

No menu **Visitantes (listas)**, selecione arquivo .xlsx, .xls ou .csv. Para **50 visitantes** basta usar uma única planilha; o limite é 500 por lote (arquivo até 5 MB). Clique em **Baixar modelo CSV** para obter as colunas aceitas: Nome do visitante, Documento, Interno visitado, Parentesco, Modalidade, Data da visita, Turno e Observações. Nome e interno visitado são obrigatórios.

A tela apresenta todas as 50 linhas, valida campos e marca registros duplicados no arquivo ou na base. Somente as linhas válidas são gravadas, em um lote auditável, como **PENDENTE_CONFERENCIA**. A função não autoriza visitas, não cria registros de entrada/saída e não atualiza o banco D1 do Panóptico operacional da PRBBL.

**Atenção:** esta versão é um aplicativo Google Drive pessoal/independente. Antes de utilizá-la para dados reais de visitantes, a instituição deve confirmar o enquadramento LGPD, responsabilidades de tratamento e os controles de acesso e compartilhamento da pasta. Para integrar ao Panóptico operacional, será necessária implementação no Worker/D1 com autenticação e autorização por unidade.
