# ECR 2027 — revisão técnica DEV — 26/11/2026

Escopo: Enel Ceará, B1 convencional, GD I/II. Nenhuma mudança no faturamento principal, PROD ou Solar Studio.

## Base normativa
- REN 1.176/2026, arts. 1–4, 12–14: redução do benefício da CDE; fator e metodologia dependem de atos posteriores; transição de apresentação janeiro–junho de 2027.
- REN 1.000/2021, arts. 291, 655-I e novo 310-A §3: 30 kWh mono/bifásico dois condutores, 50 bifásico três condutores, 100 trifásico. Limite monetário da compensação considera disponibilidade acrescida do ECR.
- NT 192/2026: fator 52,4% proposto, não homologado.
- LC 214/2025, art. 28 §§3–4: exclusão da base IBS/CBS para energia compensada nos casos e limites legais; não se estende automaticamente aos encargos, disponibilidade ou demais componentes. Extinção PIS/COFINS em 2027. Não presumir alíquotas ou tratamento do ECR.

## Critérios de implementação
1. Estudo de ECR = fator × benefício bruto estimado, aplicado aos kWh compensados do motor base. Não usar geração total.
2. No cenário simplificado sem tributos, sejam B(q) a cobrança de energia antes de ECR e E(q) o ECR; se a cobrança pós-ECR for B(q)+E(q), a condição B(q)+E(q) >= D+E(q) equivale a B(q)>=D. Isto é uma hipótese algébrica, não validação da metodologia oficial; não somar ECR duas vezes nem alterar o limite sem confirmar as bases.
3. Sensibilidade monetária atual: fatura-base histórica + ECR sem tributos adicionais, mantendo q constante. Não apresentar como fatura de 2027 homologada. Não aplicar fator de 2027 a 2028.
4. Aprovação interna do cadastro não comprova homologação regulatória. Permanecer DEV.
5. Gate para integração definitiva: ato do fator vigente, metodologia oficial do benefício/limite, tratamento ICMS/CBS/IBS, atualização da base SCEE por vigência e confronto com faturas reais de 2027. Validar créditos, rateio, ligações, ciclos com mudança de fator e arredondamento. GD III fora do escopo atual.

## Fontes consultadas
- https://www.gov.br/aneel/pt-br/assuntos/noticias/2026/regras-operacionais-e-de-faturamento-do-encargo-complementar-de-recursos-ecr-sao-aprovadas-pela-aneel
- https://www.in.gov.br/web/dou/-/resolucao-normativa-n-1.176-de-17-de-novembro-de-2026-745566480 (acesso direto indisponível; texto reproduzido em https://editaisdobrasil.com/regulatorio/ato/resolucao-normativa-n-1-176-de-17-de-novembro-de-2026-745566480)
- https://www2.aneel.gov.br/cedoc/atren20211000.pdf
- https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp214compilado.htm
- https://www.gov.br/receitafederal/pt-br/acesso-a-informacao/acoes-e-programas/reforma-tributaria-do-consumo/entenda/entenda-a-reforma-tributaria-do-consumo/
