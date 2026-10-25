# Dados locais e desempenho

## Onde cada informação é carregada

| Informação | Armazenamento e leitura na navegação |
| --- | --- |
| 5.571 municípios: nome, código e UF | PostgreSQL; carga a partir de `public/data/municipios.json` |
| Coordenadas das sedes municipais | PostgreSQL; snapshot local `municipio-sedes.json` |
| Cidades publicadas, paróquias, dioceses e participantes | PostgreSQL; catálogos e gestão locais |
| 5.570 contornos municipais | PostgreSQL; geometria e projeção SVG preparadas durante a importação |
| Brasil, estados, rodovias e arte | Arquivos estáticos locais, servidos com cache e carregamento por região |
| Fundo OpenStreetMap opcional | Tiles externos, somente quando essa camada for ativada |

Salvar arquivos cartográficos estáticos em tabelas não elimina o custo de transferência ou renderização. As rodovias continuam divididas em arquivos regionais locais, permitindo cache e evitando consultas repetidas ao banco. O mapa ilustrado padrão não precisa de tiles externos.

## Admin

Cidades e paróquias são filtradas no SQL, ignorando acentos, e entregues em páginas de 50. A busca aceita código IBGE na lista de cidades. O formulário de município busca até 15 opções locais após 250 ms sem digitação. As consultas completas de gestão não são executadas em todas as seções; os seletores de cidade na criação de paróquia e de paróquia nas casas ainda carregam seus respectivos cadastros completos.

## Malhas municipais

Fonte: [API de malhas do IBGE](https://servicodados.ibge.gov.br/api/docs/malhas?versao=3), país BR, intrarregião município, qualidade máxima da API simplificada. Snapshot coletado em 25/10/2026; não significa edição cartográfica de 2026. A geometria é administrativa, sem pretensão de delimitar territórios paroquiais.

O snapshot comprimido (~13,2 MB) está em `db/geography/municipality-boundaries.geojson.gz`; fonte, data e lacunas em `municipality-boundaries.source.json`. A migration 009 cria as tabelas. O serviço `migrate` importa em uma transação e grava checksum; reinicializações com o mesmo snapshot não reprocessam a malha. O volume PostgreSQL preserva os dados. A API pública de contorno lê a projeção pronta e fornece cache HTTP de 24 horas.

Boa Esperança do Norte (5101837, MT) existe no catálogo municipal, mas está ausente na coleção nacional; a consulta individual retornou HTTP 500 na coleta. Seu endpoint local responde indisponível, sem chamar o IBGE durante a navegação ou inventar um contorno.

Para atualizar manualmente pelo Docker, com acesso à internet:

```powershell
docker compose run --rm -T --volume "${PWD}/.cache:/app/.cache" --volume "${PWD}/db/geography:/app/db/geography" migrate node scripts/fetch-municipality-boundaries.mjs --refresh
docker compose up --build -d --wait
```

Revise o manifesto antes de publicar o novo snapshot. Não há credenciais nem novo serviço externo obrigatório. A atualização do banco depende do snapshot versionado, nunca da visita de um usuário. Em instalações novas, os contornos também são importados dos arquivos locais, sem download na inicialização.

## Validação da versão 0.20.0

Docker reconstruído e saudável. Lint, TypeScript, 50 testes e auditoria de dependências aprovados. Testes conferem a cobertura do snapshot, a repetição da importação sem alterar linhas e o endpoint local. No navegador: 50 registros por página, próxima página e busca sem acentos confirmados. Não foi medido um ganho percentual de latência.
