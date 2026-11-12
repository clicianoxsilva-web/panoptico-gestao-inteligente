# SENTINELA - entrada independente

Esta pasta publica a interface do Sentinela, mantendo o Apps Script e as planilhas existentes como backend.

- Entrada com os logins do Sentinela; nenhuma conta Google é solicitada ao visitante.
- Chamadas ao backend por POST, com `credentials: omit`, sem cookies Google.
- Sessões, perfis, limites de tentativas e permissões continuam validados no servidor.
- Senhas e tokens não são gravados no código, na URL ou no armazenamento do navegador por esta entrada.
- A interface original é carregada somente do backend fixo do projeto; o painel privado exige sessão válida.
- O service worker não armazena dados, relatórios ou respostas privadas para uso offline.
- As exportações CSV usam os tickets autenticados existentes e download sem cookies Google.

As outras pastas e os arquivos do Panóptico permanecem fora desta alteração.
