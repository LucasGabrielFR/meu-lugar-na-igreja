# Verificação da versão 0.2.0

## Ambiente e resultado

Docker Desktop com containers Linux. Build de produção Next.js 16.4.3, PostgreSQL 17 e Node 24. Aplicação publicada somente no loopback local, porta 3100. Nenhum deploy remoto.

- `docker compose up --build -d --wait`: concluído; banco e aplicação saudáveis e tarefa de migração encerrada com sucesso.
- `docker compose --profile tools run --build --rm checks`: lint e TypeScript aprovados; quatro testes aprovados, nenhum ignorado; `npm audit --audit-level=high` reportou zero vulnerabilidades.
- Testes cobrem unicidade/estabilidade de lotes entre paróquias, hash/verificação de senha, integridade do catálogo nacional, FK composta de casa/paróquia/cidade e unicidade de perfil, com rollback transacional.
- Endpoint de saúde retornou 200; acesso anônimo ao painel respondeu 307 para `/entrar`.
- Login administrativo concluído pelo navegador sem exibição das credenciais.
- Pelo painel, foram criados Goiânia, uma comunidade fictícia e uma casa de teste; edição do nome refletiu no link público da casa.
- Arquivar casa ocultou o registro da API pública, mantendo uma linha no banco; restaurar tornou a casa pública novamente.
- Cidade de teste arquivada ao terminar; sua comunidade e casa permanecem administráveis, sem aparecer no mapa público.
- Recriação forçada de banco e aplicação preservou checksum dos IDs, perfis, lotes e visibilidade de todas as casas. A migração foi reexecutada com sucesso sobre o banco existente.
- Exportação `pg_dump -Fc` produzida e listada com `pg_restore --list`. Não foi executado teste completo de restauração em outro banco.
- Navegação Brasil → Niquelândia, duas paróquias, 48 casas demonstrativas, alternativa em lista e link de casa conferidos no navegador desktop.
- Links locais da documentação verificados. Capturas da sessão guardadas localmente em `test-results/`, fora do versionamento.

## Limites da validação

Não houve benchmark formal de FPS, teste em aparelho móvel real, teste de carga nacional, integração Meta, publicação em servidor ou validação de domínio/HTTPS. A implantação pública deve incluir revisão de privacidade, operação de backup e capacidade observada. Funções e progressões permanecem adiadas.
