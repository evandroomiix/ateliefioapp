# AteliêFio

Aplicativo web mobile-first (PWA) para gestão de estoque, receitas e produção de um ateliê de crochê e costura. Feito com Next.js App Router, TypeScript, Tailwind CSS, Lucide React e Supabase.

## Categorias de material

O app trabalha com três categorias, guardadas em `materiais.categoria`:

- **Fio / Linha** (`fio_croche`): novelos fechados + sobra avulsa em metros. O formulário oferece presets de fios conhecidos (`presets_fios`: Anne 500, Amigurumi, Barroco Nº 6, EuroRoma Nº 6 etc.) que preenchem nome, marca, composição, TEX, agulha, metragem e peso. Depois basta informar cor, código, lote, novelos e foto. Inclui seletores de composição padrão e agulha de 1,25 mm a 8,0 mm.
- **Tecido / Forro** (`tecido`): rolo com largura em cm (atalhos 140, 150 e 280 cm) e metragem disponível em metros. TEX, agulha e novelos ficam ocultos.
- **Aviamento / Acessório** (`aviamento`): tipo (Zíper, Botão, Olho c/ Trava, Alça de Bolsa, Fecho Imantado, Bojo, Elástico, Fibra Siliconada), tamanho/especificação e unidade de controle (`unidades`, `pares`, `metros`, `gramas`).

Cada material pode definir um **estoque mínimo**. Quando `saldo_total_disponivel <= estoque_minimo` (com mínimo maior que zero), o card mostra o selo vermelho **"Estoque Baixo"**.

## Abas

- **Estoque** (`/`): filtros por categoria, cor/marca/tex, cards adaptativos (fios com TEX/agulha/lote e metros totais; tecidos com largura e metros; aviamentos com especificação e unidade), alerta de reposição e ajuste rápido por categoria.
- **Simulador "Dá pra fazer?"** (`/simulador`): receita pronta ou simulação avulsa, combinando fios (m), tecidos (m) e aviamentos (un/pares/g) na mesma peça, com veredito em tempo real e baixa automática por categoria.
- **Catálogo de peças** (`/pecas`): receitas com foto, tempo, preço sugerido e custo de material calculado por fio, metro de tecido ou unidade de aviamento.
- **Pedidos** (`/pedidos`): clientes, peças, status, prazos e baixa de todos os materiais da receita por pedido.

## Rodando localmente

```bash
npm install
npm run dev
```

Abra `http://localhost:3000`.

O arquivo `.env.local` já pode conter as chaves do projeto. Caso precise recriar:

```bash
cp .env.local.example .env.local
```

Preencha:

```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon-ou-publishable
```

A variável `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` também é aceita.

## Configurando o Supabase

1. O banco deve ter as tabelas `materiais`, `presets_fios`, `pecas_projetos`, `peca_materiais` e `pedidos_producao`.
2. Execute o script [`supabase/setup.sql`](supabase/setup.sql) no **SQL Editor** do Supabase para:
   - conceder `GRANT` às tabelas para o papel `anon` (leitura de `presets_fios`, CRUD nas demais);
   - criar políticas de RLS;
   - criar/atualizar o bucket público `amostras`;
   - liberar upload/leitura de imagens no Storage.
3. O app não exige login nesta versão. As políticas do script são abertas para uso pessoal. Para um app multiusuário, adicione Supabase Auth e restrinja as políticas por usuário.
4. O projeto atual usa a coluna calculada `saldo_total_disponivel`, definida no banco como:

```sql
quantidade_unidades * GREATEST(metragem_por_unidade, 1) + metragem_avulsa
```

   - **Fios**: `quantidade_unidades` = novelos fechados e `metragem_avulsa` = sobra em metros.
   - **Tecidos**: `quantidade_unidades = 0`, `metragem_por_unidade = 0` e a metragem do rolo em `metragem_avulsa`.
   - **Aviamentos**: a quantidade fica em `quantidade_unidades` e `metragem_avulsa = 0`; a unidade é definida em `unidade_controle`.

5. Restrições já validadas no banco real:
   - `materiais.cor_nome` é obrigatório (o app usa "Sem cor" quando não informado em tecidos/aviamentos);
   - `pedidos_producao.peca_id` é obrigatório (todo pedido precisa de uma peça);
   - a data de entrega pode ficar vazia;
   - `saldo_total_disponivel` é recalculado automaticamente em qualquer alteração de novelos, metragem ou quantidade.

## PWA

- Manifesto: `public/manifest.json`
- Ícones: `public/icons/` (192, 512, maskable e Apple Touch)
- Metadados e `viewport`: `app/layout.tsx`
- Service worker: `public/sw.js` (registrado em produção por `components/PwaRegister.tsx`)

No Android/Chrome, use “Instalar aplicativo”. No iPhone/Safari, toque em **Compartilhar → Adicionar à Tela de Início**.

## Build

```bash
npm run build
npm start
```

## Estrutura principal

```text
app/
  layout.tsx          identidade, PWA e navegação
  page.tsx            estoque e amostras
  simulador/page.tsx  simulador e baixa de estoque
  pecas/page.tsx      catálogo e receitas
  pedidos/page.tsx    encomendas e baixa por pedido
components/           formulários, cards, modais, toasts e UI
lib/                  tipos, cálculos, Supabase e upload
supabase/setup.sql    permissões, RLS e bucket
public/               manifest, service worker e ícones
```
