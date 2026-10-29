# Memória operacional

Antes de trabalhar neste projeto, usar a skill `obsidian-second-brain` e ler o perfil do usuário, `_overview.md`, `context.md`, `backlog.md` e os handoffs relevantes do projeto em:

`C:/Users/lucas/OneDrive/Aplicativos/remotely-save/Obsidian/01_Empresas/Acutis_Tech/Projetos/Meu Lugar na Igreja/`

Registrar decisões e resultados de forma append-only, sem credenciais. O produto pertence à AcutisTech. Preservar regras globais Docker-first e atualização de README/CHANGELOG; não apagar ou reescrever contexto humano.

# Protocolo EGM (Spec-Driven Development)

Para o desenvolvimento geral do projeto, adotar a regra dos dois trilhos:
1. **Trilho EGM (Elephant & Goldfish)**: Obrigatório para novas features, alterações estruturais/arquiteturais, mudanças de banco de dados ou integrações complexas. Seguir o ciclo:
   - Exploração e conceito (`/egm-brainstorm` / `concepts_brief.md`).
   - Especificação técnica (`/egm-draft` sob `docs/designs/`).
   - Revisão multi-lente por subagentes Goldfish (`/egm-review` via `egm-design`, `egm-zoom-out`, `egm-implementation-readiness`, etc.).
   - Aprovação do usuário antes de codificar.
2. **Trilho Rápido (Fast Track)**: Para correções pontuais de bugs, fixes cosméticos ou pequenos ajustes visuais/CSS, atuar diretamente no código com validação ágil, build Docker e atualização de documentação.

