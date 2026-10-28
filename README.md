# Ygg Alchemy

Calculadora de crafts de alquimia do YggIdle. Projeto independente, não oficial.

**Acessar:** https://igorkugan.github.io/ygg-alchemy/

## Desenvolvimento

Abra `index.html` no navegador. HTML, CSS, JavaScript e ícones estão no mesmo arquivo; não há instalação de dependências ou compilação.

As fórmulas de fabricação do arquivo original foram preservadas. Todas as receitas consomem **1 Vasilha de Mistura por preparo**, inclusive lotes avançados, conforme confirmação do usuário sobre o servidor. A vasilha entra nas listas de compra, no estoque necessário e no peso, sem duplicar as receitas que já a incluíam.

## Limite de peso

Na Calculadora, informe **Peso atual antes da compra** e **Capacidade máxima de peso** e clique em **Calcular pelo peso**. A quantidade manual fica oculta, e o máximo por compra é aplicado automaticamente à lista de materiais e à produção esperada. Alterar peso, receita, rendimento ou chance de sucesso atualiza os resultados. Para voltar à quantidade manual, limpe um dos campos de peso.

O máximo por compra considera todos os ingredientes de um lote novo e os produtos que se acumulam durante o craft, mantendo o personagem até 90% da capacidade. Não desconta o estoque salvo, pois ele pode estar no armazém. Abrir uma meta específica de estoque ou comparação na calculadora volta ao modo manual para preservar a quantidade daquela meta.

Use o rendimento real do personagem. O cálculo reserva espaço para todos os preparos bem-sucedidos, mesmo com chance configurada abaixo de 100%. Os campos de peso são salvos junto ao planejamento; arquivos antigos continuam compatíveis.

Os pesos de 80 itens distintos, incluindo todos os 56 materiais, foram conferidos nos campos de peso da database YggIdle em 28/10/2026. Cinco campos diferem das descrições padrão: [Garrafa de Poção](https://yggidle.com.br/wiki/itens/1093/garrafa-de-pocao) pesa 1; [Gema Amarela](https://yggidle.com.br/wiki/itens/715/gema-amarela), [Gema Vermelha](https://yggidle.com.br/wiki/itens/716/gema-vermelha) e [Gema Azul](https://yggidle.com.br/wiki/itens/717/gema-azul) pesam 0,1; [Poção X](https://yggidle.com.br/wiki/itens/100231/pocao-x) pesa 3. A calculadora usa os campos do servidor nesses casos.

Sete produtos ainda usam os pesos de referência bRO já presentes no projeto: Poção Branca Especial, Poção Vitata 500, Poção de Recuperação, Poção Pequena de HP, Poção Média de HP, Poção Pequena de SP e Poção Média de SP. A interface avisa nesses casos; confirme no jogo. O comportamento da habilidade exatamente a 90% segue a regra informada pelo usuário e não foi testado dentro do jogo.

Para rodar os testes de cálculo com Node.js: `node --test`.

## Publicação

O GitHub Pages publica a branch `main`, pasta `/` (raiz). Atualize `index.html` e envie um commit para essa branch para publicar alterações.

## Dados salvos

Plano, estoque, preços, favoritos e preferências ficam no armazenamento local de cada navegador e endereço. Não são sincronizados entre dispositivos. Para levar um planejamento do arquivo local ou de outro endereço, use **Meu plano → Exportar plano .json** e depois **Importar plano** no site publicado.
