# Rule: EGM Spec-Driven Development (Elephant & Goldfish)

## Trigger
Sempre que for solicitada uma **nova feature**, **mudança estrutural/arquitetural**, **nova integração**, **alteração de banco de dados/schema** ou **fluxo de negócio complexo**.

## Fast-Track Exception (Trilho Rápido)
- Bug fixes pontuais, pequenos ajustes visuais/CSS, correções cosméticas ou pequenos patches de regras já existentes continuam no fluxo ágil direto, sem necessidade de overhead de especificação.

## Actions (Trilho EGM)

1. **Exploração & Conceituação (Elephant Context)**
   - O agente principal atua como o **Elefante**, mantendo o contexto histórico, objetivos de negócio e arquitetura do projeto.
   - Definir os limites do problema, requisitos funcionais e trade-offs de design, estruturando um `concepts_brief.md` ou acionando a skill `/egm-brainstorm`.

2. **Elaboração da Especificação Técnica (Draft)**
   - Criar ou atualizar a especificação técnica detalhada na pasta `docs/designs/` (ex: `docs/designs/[feature]_design.md`) ou acionando a skill `/egm-draft`.
   - A especificação deve cobrir:
     - Visão geral e escopo.
     - Contratos de dados / tipos / schemas / migrations.
     - Fluxo de execução e tratamento de falhas / edge cases.
     - Plano de implementação em etapas incrementais e testáveis.

3. **Revisão com Subagentes Goldfish (Zero-Context Review Swarm)**
   - Antes de iniciar a implementação, submeter o rascunho de design para os revisores **Goldfish** (subagentes independentes com contexto limpo, sem o histórico da conversa prévia), via `/egm-review` ou acionando os subagentes especializados:
     - `egm-design`: Avalia escalabilidade, riscos sistêmicos e arquitetura.
     - `egm-zoom-out`: Audita simplicidade, combate over-engineering e valida princípio YAGNI.
     - `egm-implementation-readiness`: Verifica se as tarefas de codificação estão claras e sem ambiguidades.
     - `egm-codebase-details`: Garante compatibilidade e reaproveitamento do código existente.
     - `egm-comprehension` e `egm-style`: Identificam lacunas, pressupostos não documentados e falta de clareza.

4. **Triagem & Aprovação pelo Usuário**
   - Apresentar os apontamentos e trade-offs dos revisores ao usuário.
   - Ajustar o design até o alinhamento e aprovação formal do usuário (`/egm-resolve`).

5. **Execução e Entrega**
   - Iniciar a codificação somente com a especificação aprovada.
   - Seguir rigorosamente as regras globais acopladas:
     - **Docker-First**: Rebuild obrigatório (`docker compose up --build -d`) e validação de funcionamento em container.
     - **Auto-Documentation**: Atualização atômica de `README.md` e `CHANGELOG.md` conforme Keep a Changelog.

