# Ygg Alchemy

Calculadora de crafts de alquimia do YggIdle. Projeto independente, não oficial.

**Acessar:** https://igorkugan.github.io/ygg-alchemy/

## Desenvolvimento

Abra `index.html` no navegador. HTML, CSS, JavaScript e ícones estão no mesmo arquivo; não há instalação de dependências ou compilação.

As fórmulas de fabricação do arquivo original foram preservadas. Todas as receitas consomem **1 Vasilha de Mistura por preparo**, inclusive lotes avançados, conforme confirmação do usuário sobre o servidor. A vasilha entra nas listas de compra, no estoque necessário e no peso, sem duplicar as receitas que já a incluíam.

## Limite de peso

Na Calculadora, informe **Peso atual sem as vasilhas**, **Capacidade máxima de peso** e **Vasilhas que já tenho no inventário**, e clique em **Calcular pelo peso**. O peso das vasilhas é somado automaticamente: se o peso informado veio do total do jogo, desconte as vasilhas antes de preenchê-lo. A quantidade manual fica oculta, e o máximo por compra é aplicado automaticamente à lista de materiais e à produção esperada. Alterar peso, vasilhas, receita, rendimento ou chance de sucesso atualiza os resultados. Para voltar à quantidade manual, limpe um dos campos de peso.

O máximo por compra considera todos os ingredientes de um lote novo e os produtos que se acumulam durante o craft, mantendo o personagem até 90% da capacidade. Usa primeiro as vasilhas informadas, compra somente as faltantes e mantém o peso das extras que sobram ao final. O resultado mostra o peso das vasilhas, quantas comprar e quantas sobram. O estoque salvo dos demais ingredientes não reduz o peso reservado, pois pode estar no armazém. No modo de peso, a compra e o custo restante da receita usam as vasilhas desse campo, sem alterar Meu estoque. Abrir uma meta específica de estoque ou comparação na calculadora volta ao modo manual para preservar a quantidade daquela meta.

Use o rendimento real do personagem. O cálculo reserva espaço para todos os preparos bem-sucedidos, mesmo com chance configurada abaixo de 100%. Os campos de peso são salvos junto ao planejamento; arquivos antigos continuam compatíveis.

Os pesos de 80 itens distintos, incluindo todos os 56 materiais, foram conferidos nos campos de peso da database YggIdle em 28/10/2026. Cinco campos diferem das descrições padrão: [Garrafa de Poção](https://yggidle.com.br/wiki/itens/1093/garrafa-de-pocao) pesa 1; [Gema Amarela](https://yggidle.com.br/wiki/itens/715/gema-amarela), [Gema Vermelha](https://yggidle.com.br/wiki/itens/716/gema-vermelha) e [Gema Azul](https://yggidle.com.br/wiki/itens/717/gema-azul) pesam 0,1; [Poção X](https://yggidle.com.br/wiki/itens/100231/pocao-x) pesa 3. A calculadora usa os campos do servidor nesses casos.

Sete produtos ainda usam os pesos de referência bRO já presentes no projeto: Poção Branca Especial, Poção Vitata 500, Poção de Recuperação, Poção Pequena de HP, Poção Média de HP, Poção Pequena de SP e Poção Média de SP. A interface avisa nesses casos; confirme no jogo. O comportamento da habilidade exatamente a 90% segue a regra informada pelo usuário e não foi testado dentro do jogo.

Para rodar os testes de cálculo com Node.js: `node --test`.

## Elixires

Elixir Vermelho e Elixir Azul estão no catálogo de Farmacologia, com rendimento e chance de sucesso editáveis como as demais receitas dessa categoria. Por preparo, ambos usam 10 Tubos de Ensaio, 5 Garrafas de Poção e 1 Vasilha de Mistura, mantendo a regra de vasilha da calculadora. Os Tubos de Ensaio substituem as Garrafas Vazias da receita padrão, conforme confirmação do usuário sobre o YggIdle. O Vermelho usa 15 Xaropes Vermelhos; o Azul usa 6 Xaropes Azuis, conforme o [ajuste publicado pelo YggIdle](https://yggidle.com.br/atualizacoes/manuais-de-alquimia).

Os elixires usam os ícones, pesos e preços de loja já cadastrados, participam do plano e do estoque e são preservados ao importar planejamentos. O Elixir Dourado continua fora do catálogo.

## Preço de venda

Após o custo da receita, **Por quanto vender?** mostra o preço mínimo estimado por item, o preço com lucro desejado e o lucro estimado do lote. **Lucro sobre o custo (%)** começa em 20%, pode ser alterado e é salvo junto ao planejamento. Um custo de 100 z com 20% resulta em preço de 120 z; 0% cobre apenas os materiais.

O cálculo usa o custo total dos ingredientes, incluindo os já em estoque, o Desconto aplicável e a produção esperada com o rendimento e a chance configurados. Os preços são arredondados para cima em zeny inteiro. Com preços de materiais faltantes ou produção zero, o mínimo não é apresentado. Falhas reais podem reduzir a produção e aumentar o preço mínimo. Taxas de venda não estão incluídas.

## Publicação

O GitHub Pages publica a branch `main`, pasta `/` (raiz). Atualize `index.html` e envie um commit para essa branch para publicar alterações.

## Números e cópia rápida

Resumos de quantidades e valores usam `k` para mil e `kk` para milhão (por exemplo, `800k`, `5kk` e `900kk`), com até duas casas decimais. Totais de materiais, quantidades a comprar e preços mínimo e sugerido de venda aparecem completos, sem separadores de milhar: clique no número para copiar somente os dígitos. Os controles também funcionam por teclado e mostram uma confirmação após a cópia.

Campos de edição, valores salvos e quantidades nas listas exportadas continuam completos. A abreviação só muda a apresentação dos resumos.

## Dados salvos

Plano, estoque, preços, favoritos e preferências ficam no armazenamento local de cada navegador e endereço. Não são sincronizados entre dispositivos. Para levar um planejamento do arquivo local ou de outro endereço, use **Meu plano → Exportar plano .json** e depois **Importar plano** no site publicado.

## Extensão Chrome — compras no YggIdle

Download e instalação: https://igorkugan.github.io/ygg-alchemy/extension/

Na lista de compras da receita ou do plano, **Enviar para extensão** transfere os materiais NPC e suas quantidades faltantes, descontando estoque e vasilhas conforme o cálculo atual. A extensão Manifest V3 guarda a lista localmente. Na versão **1.1.0**, abra a loja e a categoria dos materiais no jogo e clique em **Preencher loja** no popup da extensão. Cada clique autoriza uma tentativa na aba ativa. Enviar uma lista, abrir loja, mudar categoria e recarregar não preenchem automaticamente. Ela não confirma compras e mantém os outros itens do carrinho.

Instalação manual: extrair o ZIP, abrir `chrome://extensions`, ativar Modo do desenvolvedor, usar **Carregar sem compactação** na pasta com `manifest.json` e recarregar a calculadora/jogo. O ZIP 1.1 contém o manifest diretamente na raiz. Para atualizar, substitua os arquivos na mesma pasta já carregada, recarregue a extensão e as abas. O popup permite preencher novamente ou concluir/limpar a lista.

Fontes em `chrome-extension/`, instalação em `extension/` e pacotes em `downloads/`. Recrie o ZIP com `python3 scripts/package-extension.py`. Sem dependências de execução ou serviços externos. Testes DOM: `npm ci && npm test`.

O usuário confirmou o preenchimento no Chrome após recarregar a aba do jogo. O navegador remoto de desenvolvimento não inicia o cliente por ausência de WebGL2; a nova ação manual é verificada com a mesma interface de loja em testes DOM.
