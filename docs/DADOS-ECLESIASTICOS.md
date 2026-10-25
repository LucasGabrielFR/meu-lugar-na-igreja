# Dados eclesiásticos: catálogo nacional em ampliação

## Publicação 0.15.0 — referências com diocese em aberto

O catálogo ativo publicado reúne 10.077 paróquias, em 4.019 municípios e nas 27 UFs: 2.624 institucionais e 7.453 referências. Os vínculos diocesanos das referências continuam em aberto. Nenhum registro foi promovido a institucional apenas por constar no Acervo Católico. A importação foi repetida sem alterar os totais e não criou casas. Registros ambíguos continuam para revisão, conforme relatório de cobertura; presença nacional não significa completude.

## Atualização 0.14.0 — inventário e complementação

A CNBB foi consultada por **cada uma das 281 circunscrições**, usando a classificação institucional em vez de depender de Paróquia no título. Só 33 retornaram igrejas; 248 diretórios estão vazios na consulta pública. Esse resultado não significa ausência real de paróquias.

A fonte nacional fornece 1.859 fichas resolvidas. A complementação direta dos sites de Manaus (53), Natal (121), Vitória (7), Roraima (3), Florianópolis (76), Rio Branco (32), Aracaju (102) e Cuiabá (20), junto das fontes anteriores e da conciliação conservadora, produz **2.624 paróquias ativas em 830 municípios, 21 UFs e 43 circunscrições**. Homônimas com IDs distintos da mesma fonte não são fundidas automaticamente. Nenhuma circunscrição é declarada completa só por ter registros.

Veja a [auditoria de cobertura, com as 27 UFs e as 281 circunscrições](COBERTURA-PAROQUIAL.md). Permanecem sem paróquias institucionais importadas AL, AP, CE, MS, PA e PI. A versão 0.15.0 também publica referências elegíveis nas UFs atendidas pelo diretório independente, distinguindo sua origem. O painel mostra quais diretórios CNBB foram consultados e estão vazios. A cobertura integral ainda exige diretórios diocesanos adicionais ou uma exportação institucional nacional.

O coletor CNBB salva apenas fatos institucionais em checkpoint local; descarta as fotos, biografias e informações pessoais que acompanham a resposta. As fichas com mais de 24 horas são renovadas, e --refresh força a consulta inteira. Os serviços Docker vigentes são catalog-national, catalog-regional, catalog-expansion e catalog-reference; o antigo coletor por busca permanece apenas para pesquisa/reprodução histórica.

Por solicitação expressa, todas as 121 casas foram removidas, assim como os bairros sem fonte e cidades apenas de teste. Um backup do estado anterior está em backups/, fora do versionamento e da imagem. A limpeza foi uma operação única; não faz parte do startup. Nenhuma casa será recriada pela atualização do catálogo. As notas abaixo registram a etapa anterior da base.

## Histórico — versão 0.11.0

A consulta pública da [CNBB/CDICBR](https://portalcdicbr.cnbb.org.br/) foi testada. A coleta percorreu **todos os 1.883 resultados** da busca por “paroquia”. Destes, **1.844** têm nome explícito de paróquia, município/UF inequívocos no IBGE e circunscrição reconhecida: **641 municípios e 13 UFs**. As **281 circunscrições** listadas no diretório também são gravadas, inclusive as que ainda não têm paróquias coletadas.

**Não é o catálogo completo de paróquias do Brasil.** A consulta depende dos títulos das fichas e do conteúdo disponível no portal. Quantidade de resultados não equivale ao universo canônico. Ter registros numa diocese não comprova completude. As 39 exclusões incluem quase-paróquias, diaconias e localidades ausentes, ambíguas ou com grafia divergente. O snapshot `db/catalog/cnbb-national.json` guarda os motivos, sem inventar localização.

A base anterior permanece: 311 paróquias da [Arquidiocese de São Paulo](https://arquisp.org.br/wp-json/wp/v2/parish) e 35 da [Diocese de Uruaçu](https://diocesedeuruacu.com.br/wp-json/wp/v2/posts?categories=15). Após conciliação, o banco contém 2.185 paróquias institucionais em 669 municípios, 35 circunscrições com paróquias e 13 UFs. As 281 circunscrições permanecem disponíveis para acompanhar as lacunas. Os números das fontes não devem ser simplesmente somados: duas fontes podem descrever a mesma entidade.

## Persistência e publicação

- `ecclesiastical_jurisdictions`: circunscrições reconciliadas por nome normalizado. Não se infere diocese pela UF.
- `parish_catalog`: paróquia institucional, município IBGE e fonte.
- `parish_catalog_sources`: identificadores e URLs das fontes que descrevem o mesmo registro. Conciliação conservadora por município, circunscrição e nome sem acentos/pontuação/prefixo Paróquia.
- `catalog_imports`: datas, escopo e quantidades importadas/excluídas por snapshot.
- `cities` e `parishes`: recebem automaticamente municípios e bairros paroquiais vazios. Nomes personalizados, IDs, casas e arquivamentos existentes são preservados. Registros ocultados pelo administrador não são reativados.

Nenhum padre é validado e nenhuma casa é criada pela carga. Bairros são ilustrativos dentro da cidade ancorada na sede IBGE; não geocodificam igrejas reais nem demarcam territórios canônicos. Adicionar paróquias pode reposicionar visualmente setores e lotes; os IDs e vínculos dos moradores são preservados.

Os cartões de igreja mostram circunscrição e link à fonte. O painel **Catálogo oficial** mostra cobertura por município, UF e circunscrição, e últimas coletas. Zero paróquias numa circunscrição significa **aguardando catálogo**, não ausência real de paróquias.

## Atualização

Consulta usada pelo portal: `https://cdic-api.cnbb.org.br/api/v1/portal/search?q=paroquia&category=igreja&page=1&pageSize=100`.

Circunscrições: `https://cdic-api.cnbb.org.br/api/v1/portal/circumscriptions/options`.

Os endpoints públicos são dependências de atualização, não da navegação. Não constituem contrato de API e podem mudar. O coletor usa requisições sequenciais, timeout, pausa de 500 ms, validação de total/paginação e IDs únicos. Só substitui o snapshot após validar a coleta inteira. Falhas preservam o anterior. Não são coletadas fotos, biografias, contatos pessoais ou dados de padres.

```powershell
# Fonte nacional
docker compose --profile tools run --build --rm catalog-national
# Fontes locais existentes, opcional
docker compose --profile tools run --build --rm catalog
# Importação e nova imagem
docker compose up --build -d --wait
```

O coletor também aceita caminhos de duas respostas públicas salvas (resultados e opções) para reconstrução offline. O servidor usa snapshots locais e PostgreSQL em Docker. Não foi acrescentado serviço pago. A disponibilidade da consulta não autoriza reproduzir fotos ou textos editoriais.

## Caminho para cobertura integral

A versão 0.14.0 acrescenta `db/catalog/diocesan-expansion.json`: 76 fichas de Florianópolis, 32 de Rio Branco, 102 de Aracaju e 20 de Cuiabá. A classificação conservadora separa reitorias, áreas missionárias, quase-paróquias e santuários/catedrais sem evidência de classificação paroquial; paróquias militares não recebem a circunscrição territorial automaticamente. Distritos e endereços sem município inequívoco ficam na lista de revisão. Essas quantidades não comprovam que cada diretório esteja completo ou atualizado.

O serviço `catalog-expansion` faz a atualização; o startup importa o snapshot com as demais fontes oficiais. O serviço `catalog-reference` coleta o diretório público independente [Acervo Católico](https://acervocatolico.com/igrejas/) em `db/reference/national-directory.json`. São armazenados apenas identificador da ficha, nome, cidade/UF, município IBGE quando resolvido e URL de origem. Não são coletados contatos, fotos ou biografias. A nomenclatura “Paróquia” é uma pista, não confirmação canônica.

O responsável autorizou a publicação das referências na versão 0.15.0. A migração 007 permite `jurisdiction_id` nulo somente quando `source_kind='reference'`. Novas fichas entram em `parish_catalog` como referência, com bairro vazio, URL de origem e diocese em aberto. Nenhuma diocese é inventada ou atribuída por proximidade. O mapa e o painel distinguem a fonte independente da institucional.

`scripts/reference-catalog.mjs` exige nomenclatura paroquial e município IBGE válido. Correspondências únicas por nome/município recebem a fonte adicional no cadastro existente, sem substituir a origem institucional. A comparação normaliza prefixo paroquial, qualificadores iniciais de templo (santuário, basílica, catedral), acentos, abreviações explícitas e sufixos de apresentação (parênteses, cidade e ano); não usa aproximação textual. Mais de uma ficha equivalente da mesma fonte, ou mais de uma correspondência existente, deixa o grupo para revisão. Duplicatas de referência vazias com uma única correspondência institucional são arquivadas, mantendo as fontes no cadastro institucional; bairros com casas exigem revisão humana. Atualizações preservam arquivos e casas existentes; confirmação institucional posterior pode promover a referência sem recriar o bairro.

A auditoria gera `db/reference/research-candidates.json` com vínculos publicados, exclusões e municípios não resolvidos. `scripts/audit-parish-coverage.mjs` regenera o relatório com consultas SQL somente de leitura. A presença em uma UF não comprova cobertura integral das suas paróquias.

A minuta em `docs/SOLICITACAO-CATALOGO-NACIONAL.md` especifica os campos mínimos e as condições de reutilização a solicitar. Foi preparada localmente, sem envio de mensagem.

1. Obter da CNBB/CDICBR uma exportação nacional com identificador, nome, município, circunscrição, data de atualização e condições de reutilização. Não é necessário enviar credenciais.
2. Complementar com conectores dos diretórios oficiais das circunscrições ausentes identificadas no painel.
3. Revisar divergências de grafia, municípios atendidos e entidades distintas (capelas, santuários, quase-paróquias). Não promover templos encontrados no OpenStreetMap automaticamente a paróquias.
4. Confirmar a completude com cada circunscrição antes de declarar uma base completa.

A coleta pública permite ampliar agora, mas não comprova cobertura integral. A carga integral continua dependendo de dados institucionais completos ou da coleta validada dos diretórios ausentes.

## Validação da entrega 0.11.0

A carga foi repetida e manteve exatamente os mesmos totais: 671 cidades cadastradas, 2.191 registros de bairros/paróquias (incluindo demonstrações e arquivados), 121 casas, 2.185 paróquias institucionais e 2.190 referências de fonte. Todas as paróquias institucionais têm bairro associado. Goiânia permanece arquivada por configuração anterior, portanto suas igrejas não aparecem no mapa público; a importação respeita essa escolha.

A grafia d’Abadia foi conciliada com da Abadia em Niquelândia, preservando a comunidade e suas 24 casas. O bairro vazio duplicado ficou arquivado, sem excluir dados. Duas paróquias homônimas de São Judas Tadeu em São Paulo foram mantidas distintas, com a região da fonte no rótulo virtual quando necessário. O nome canônico permanece no catálogo.

