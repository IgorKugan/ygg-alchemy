# Huntera — Guia de Bosses

Guia independente em português com os 18 bosses de `Huntera_Boss_Elemental_Weakness_Guide.pdf` (29/10/2026).

**Página:** https://igorkugan.github.io/ygg-alchemy/huntera/

Busca por nome, filtro pelo elemento recomendado, favoritos locais e links diretos por boss. Os retratos são extraídos do próprio PDF e ficam embutidos em `bosses.js`; não há fontes, imagens ou bibliotecas remotas necessárias para usar a página.

Os percentuais e as mecânicas são referências do **Tibia**, não valores confirmados no Huntera. `?` indica estimativa, percentuais negativos indicam cura e `null` indica dado desconhecido. A inconsistência do PDF sobre morte no Faceless Bane está explicada nas observações. Para The Unwelcome e The Pale Worm, a tabela descreve o corpo principal, enquanto a recomendação aponta o alvo da mecânica.

## Arquivos

- `index.html`: estrutura e visual responsivo.
- `bosses.js`: conteúdo do PDF e retratos.
- `app.js`: busca, filtros, favoritos e links.

Para testar: `node --test tests/huntera-guide.test.cjs`, a partir da raiz do repositório.

Publicação: GitHub Pages já usa `main`, pasta `/`. Este guia ocupa apenas a pasta `huntera/`; a calculadora da raiz não depende dele.
