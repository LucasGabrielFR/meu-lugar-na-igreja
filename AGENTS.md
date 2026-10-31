# Memória operacional

Antes de trabalhar neste projeto, usar a skill `obsidian-second-brain` e ler o perfil do usuário, `_overview.md`, `context.md`, `backlog.md` e os handoffs relevantes do projeto em:

`C:/Users/lucas/OneDrive/Aplicativos/remotely-save/Obsidian/01_Empresas/Acutis_Tech/Projetos/Meu Lugar na Igreja/`

Registrar decisões e resultados de forma append-only, sem credenciais. O produto pertence à AcutisTech. Preservar regras globais Docker-first e atualização de README/CHANGELOG; não apagar ou reescrever contexto humano.

# Protocolo EGM (Spec-Driven Development)

Para o desenvolvimento geral do projeto, adotar a regra com decisão humana prévia:
1. **Identificação de Escopo**: Sempre que uma solicitação envolver uma funcionalidade de médio/grande porte, mudança de arquitetura, banco de dados ou integração complexa, **o agente deve consultar o usuário** se deseja utilizar o protocolo EGM (Elephant & Goldfish) ou o fluxo normal direto.
2. **Se o usuário desejar o EGM**: Executar o ciclo completo:
   - Exploração e conceito (`/egm-brainstorm` / `concepts_brief.md`).
   - Especificação técnica (`/egm-draft` sob `docs/designs/`).
   - Revisão multi-lente por subagentes Goldfish (`/egm-review` via `egm-design`, `egm-zoom-out`, `egm-implementation-readiness`, etc.).
   - Aprovação do usuário antes de codificar.
3. **Se o usuário optar por NÃO (ou para fixes/ajustes pontuais)**: Seguir o fluxo ágil normal sem o Elefante (desenvolvimento direto, testes, build Docker e atualização de documentação).


