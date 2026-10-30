# Ygg Alchemy — extensão de compras

O usuário aprovou criar uma extensão do Chrome, disponibilizar seu ZIP no site e integrar a lista de compras da calculadora. O usuário envia uma receita ou plano; ao abrir a loja do YggIdle, a extensão encontra materiais pelo nome e preenche suas quantidades faltantes. A compra é confirmada pelo usuário no jogo.

## Abordagem

Extensão Manifest V3 em JavaScript, sem dependências de execução. Content scripts limitados à calculadora e ao cliente `https://jogo.yggidle.com.br/`, incluindo os frames do cliente. Um service worker valida mensagens e guarda uma lista local, vinculando a execução à primeira aba/frame que reconhecer uma loja. Não usa clipboard, credenciais, APIs de compra ou injeção no contexto interno do jogo.

A alternativa de macro por coordenadas não atende ao reconhecimento por nome. Um userscript exigiria outro gerenciador e não corresponde ao formato Chrome escolhido pelo usuário.

## Contratos

- A calculadora usa os cálculos atuais e desconta estoque e vasilhas já carregadas. Envia somente materiais com venda NPC e quantidade faltante positiva, como inteiros completos.
- O envio é explícito por botão; cada envio substitui a lista anterior e inicia um novo lote.
- A extensão detecta a loja e preenche campos HTML visíveis com correspondência exata de nomes normalizados (maiúsculas e acentos ignorados). Não usa correspondências parciais.
- Dispara eventos input/change para atualizar o carrinho. Não clica em Confirmar compra nem limpa outros itens do carrinho.
- Itens aplicados não são reaplicados a cada alteração da página. Itens ausentes ficam pendentes para outra aba da loja. Duplicidades e limites de campo são informados, sem preenchimento arbitrário.
- Popup permite ver a lista, pausar, reaplicar explicitamente e finalizar/apagar a lista local.
- O site oferece ZIP versionado, instruções para extrair e usar Carregar sem compactação em chrome://extensions e como atualizar.
- O navegador de teste não inicia o cliente por ausência de WebGL2. A integração será validada com DOM real em uma loja de teste; a validação na loja real ficará declarada como pendente, sem afirmar suporte confirmado.

## Verificação

Testes de payload, estoques, validação/origens, persistência e consumo do lote; testes DOM para correspondência, eventos e ambiguidades. Todos os testes existentes continuam passando. Confirmar inicialização real da calculadora, envio e download no navegador, estrutura do ZIP, build do Pages e arquivos publicados.
