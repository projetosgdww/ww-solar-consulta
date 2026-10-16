# WW Solar — Consulta de Kits Fotovoltaicos (V1)

Site público estático de consulta de kits, preparado para hospedar no GitHub Pages.

## O que faz

- Simulação por geração desejada ou consumo mensal (kWh/mês), com controle deslizante.
- Seleção da **menor geração cadastrada que atenda** o valor solicitado, independentemente de marca. Para demandas superiores à base, mostra a maior opção e alerta que está abaixo.
- Busca por ID, potência, geração e marca de inversor.
- Filtros por inversor, lista de kits e detalhes da configuração.
- Preparação de solicitação pelo WhatsApp, incluindo código do kit e dados técnicos.
- Exibição de preço **somente quando** `precoAprovado` for `true` e `precoVendaAvista` for um número positivo no catálogo público.
- Site responsivo, sem dependências externas e sem banco de dados.

## IMPORTANTE: arquivos públicos

**Nunca envie preços de referência, planilha do fornecedor, margens, CSV privado ou `catalogo-interno.json` para este repositório.** Mesmo arquivos não mostrados nas páginas ficam acessíveis na internet se forem publicados no GitHub Pages.

O projeto público usa apenas os seguintes arquivos de dados:

- `dados/catalogo-publico.json`: somente configurações técnicas e preços que **já foram aprovados**.
- `dados/config-publica.json`: número público do WhatsApp comercial e textos públicos.

Os 58 kits foram preparados inicialmente **sem preço aprovado** e com disponibilidade `a_confirmar`, pois a base enviada não confirma valores finais nem estoque.

## Publicar no GitHub Pages

1. Crie um repositório **público** chamado `ww-solar-consulta` na conta `projetosgdww`.
2. Adicione o conteúdo **desta pasta** à raiz do repositório (`index.html`, `app.js`, `styles.css`, `favicon.svg`, `.nojekyll`, pasta `dados/`).
3. No GitHub, vá a **Settings → Pages → Build and deployment**.
4. Escolha **Deploy from a branch**, branch `main` e pasta `/ (root)`; salve.
5. Aguarde a publicação. O endereço previsto, caso o nome seja aceito, é `https://projetosgdww.github.io/ww-solar-consulta/`.
6. A URL só funcionará quando o GitHub confirmar o Pages ativo.

Não coloque a planilha interna em nenhum commit do repositório público (nem em uma branch depois apagada). Alterações em arquivos já publicados podem permanecer no histórico Git.

## Como habilitar o WhatsApp

Em `dados/config-publica.json`, altere `whatsappNumero` para o contato comercial autorizado, somente dígitos, incluindo o código do Brasil e o DDD. Exemplo **fictício**: `5585999999999`.

Com o campo vazio, o botão de contato copia a solicitação em vez de abrir o WhatsApp. Não há número inventado.

## Como aprovar o preço de um kit

**Somente depois da validação comercial**, substitua os campos públicos do kit correspondente em `dados/catalogo-publico.json`:

```json
{
  "id": "KIT-001",
  "precoVendaAvista": null,
  "precoAprovado": false
}
```

Mude para `true` e informe o preço aprovado numérico (sem símbolo R$), por exemplo apenas após sua confirmação. Nunca preencha o JSON público com os preços de referência internos. A marca da distribuidora não aparece no catálogo.

## Notas técnicas

- A geração é a estimativa cadastrada na tabela recebida, não um resultado de dimensionamento por cidade.
- Os valores da imagem original (cabeçalho `14/out`, ano desconhecido) **não** foram aprovados nem divulgados.
- O frete não está incluído. Projeto, homologação e instalação não estão incluídos.
- A potência DC indicada corresponde aos módulos informados na base. Recomendações são apenas comerciais, não avaliação de compatibilidade técnica.
- Não há service worker nesta V1 para evitar manter preços antigos em cache offline. O catálogo usa `fetch(..., {cache: 'no-store'})`.
- O site não coleta dados pessoais; ao usar WhatsApp, o visitante abre um serviço externo por decisão própria.

## Próxima etapa

Criar também um repositório **privado** `ww-solar-dados` para a base de precificação de referência e atualizações que ainda dependem de aprovação. Uma alteração de preço deve ser revisada no repositório privado antes de exportar apenas o valor público autorizado para este site.