# Produto e regras

## Objetivo e decisões confirmadas

Criar pertencimento e descoberta das comunidades católicas brasileiras por meio de casas e igrejas em cidades virtuais. Projeto AcutisTech, com arte isométrica em mapa contínuo e participação nacional desde o lançamento. A experiência começa no Instagram e continua no site.

**Nome aprovado:** Meu Lugar na Igreja. Produto provido e mantido pela AcutisTech.

Somente o papel de padre passa por validação humana. Funções paroquiais, municipais e estaduais são títulos da experiência, escolhidos pelo usuário conforme disponibilidade e pontuação, sem fila de aprovação. Verificação de identidade sacerdotal e vínculo atual como pároco/vigário integram o mesmo processo de padre; não criar uma verificação independente para cada pastoral ou membro.

## Jornada de entrada

### Implementado na versão 0.4.0

- A pessoa envia município do catálogo IBGE, nome da paróquia (existente ou sugerida), nome público e perfil do Instagram.
- Uma autorização explícita registra que nome e perfil podem ser exibidos se o pedido for aprovado. Não se coleta endereço residencial.
- O pedido fica privado e pendente no painel. Aprovação cria ou reativa município e paróquia quando necessário e publica a casa; arquivamento não publica os dados.
- Informar um `@` não prova posse do perfil. Login de morador, comprovação de controle e integração Instagram seguem adiados.

### Visão futura da integração com Instagram

1. Campanha explica a participação e aponta para regras e aviso de privacidade.
2. Pessoa comenta, por exemplo: `Niquelândia/GO | Paróquia Nossa Senhora da Abadia | padre @perfil`.
3. Ingestão registra comentário e origem; identifica município e possíveis paróquias. O perfil indicado é uma indicação, nunca uma confirmação de sacerdócio.
4. Localidade ambígua vai para correção de cadastro. O site oferece formulário com município/UF e paróquia para completar o pedido.
5. No fluxo atual do site, a solicitação inclui consentimento e aguarda revisão antes de criar a casa. Para comentários, definir antes da automação o vínculo entre autor, comprovação de controle do perfil e escolha de visibilidade; o comentário sozinho não publica automaticamente uma associação religiosa identificável.
6. Nova paróquia pode aparecer como cadastro comunitário com padre pendente, sem impedir a casa ou as funções comuns. Sua igreja recebe a identificação de cadastro ainda incompleto, sem selo de validação institucional.
7. Pessoa escolhe áreas e funções; o sistema mostra funções disponíveis e próximos desbloqueios.
8. Um link permanente leva diretamente à casa; cartão compartilhável ajuda a trazer outros participantes.

Proposta inicial: uma casa e uma paróquia principal por pessoa, com vínculo secundário opcional em versão futura. Comentar novamente não cria outra casa nem troca a paróquia silenciosamente. A reivindicação do perfil exige prova de controle, independente da validação de padre; não basta digitar um @. Não presumir suporte a login de contas pessoais pela API profissional do Instagram.

## Organização territorial e eclesial

- Município identificado por código IBGE, dentro de uma UF; nomes homônimos não geram mistura de cidades.
- Paróquia é uma entidade própria, com nome, aliases e município-sede. Duas paróquias podem ter o mesmo nome; semelhança textual sugere revisão, não fusão automática.
- Cidade contém várias paróquias e igrejas visíveis. A casa fica em um agrupamento virtual próximo à sua paróquia.
- O Brasil e as cidades compartilham um único mapa 2D contínuo. Igrejas e casas usam arte isométrica, crescem em visibilidade na aproximação e permanecem ancoradas na sede urbana oficial do IBGE. Não existe troca de cena ou rotação livre. Ruas e praça conectam os bairros paroquiais.
- Cada paróquia é um setor da mesma cidade, com praça cívica compartilhada. A construção da igreja cresce em quatro níveis visuais pelo total de casas ativas (0–7, 8–23, 24–47, 48+). A etapa de construção não renomeia a comunidade nem concede condição de capela, catedral ou basílica.
- Diocese é uma referência eclesial opcional na entrada; limites diocesanos não devem ser deduzidos da UF.
- Modelo pode registrar municípios atendidos por uma paróquia além da sede, sem obrigar esse detalhe no MVP.
- Há no máximo um pároco ativo por paróquia na regra do produto e zero ou mais vigários. A identificação de um pároco é necessária para completar o cadastro; não fabricar um padre para preencher o campo.
- Transferências encerram o vínculo anterior e registram o novo, preservando histórico. A identidade sacerdotal e o vínculo paroquial têm datas e evidências próprias.
- Posições das casas são fictícias. Não coletar endereço residencial nem representar localização real do fiel.

## Verificação exclusiva de padre

Indicação de fiel abre um pedido com perfil, nome e paróquia. A equipe confere fonte institucional, como página da diocese/paróquia, e confirma controle do perfil com um desafio temporário em interação combinada no Instagram. Verificar atividade recente manualmente, sem presumir capacidade de leitura automatizada de qualquer conta.

Estados: indicado → em análise → confirmado, recusado ou aguardando informação; permitir suspensão/revogação e registrar motivo. Confirmar controle do Instagram não comprova sacerdócio. Pontos não liberam padre, pároco ou vigário. A equipe resolve disputas e transferências; o título confirmado não concede automaticamente permissão de administrar o site.

Não há aprovação de funções comuns: a seleção válida é efetivada imediatamente. Moderação de abuso e correção de cadastros são ações posteriores, distintas de validação de cargo.

## Administração

Painel da AcutisTech deve oferecer:

- Cidades: ativar, editar apresentação e suspender exibição, preservando referência ao município oficial.
- Paróquias: criar, corrigir, renomear, adicionar aliases, fundir duplicadas e arquivar com tratamento das casas e vínculos afetados.
- Moradores/casas: buscar, corrigir vínculo, transferir lote, ocultar e atender solicitações de retirada.
- Padres: fila de análise, evidências privadas, decisões, pároco atual, múltiplos vigários e histórico.
- Catálogo: áreas, tipos de grupo, funções, nomes alternativos, escopos, compatibilidades e disponibilidade por paróquia.
- Progressão: pontos, limites, patamares, desbloqueios e simulação de impacto antes de publicar novas regras.
- Instagram: campanhas, eventos recebidos, erros, duplicidades, tentativas e reprocessamento.
- Auditoria: autor, data, ação, motivo e alterações; acesso restrito a evidências e dados sensíveis.

Títulos civis/paroquiais nunca se confundem com permissões técnicas. Administrador e moderador são acessos concedidos separadamente pela AcutisTech. Uma pessoa intitulada prefeita ou coordenadora não pode editar cadastros alheios por esse motivo.

## Privacidade incorporada ao fluxo

Associação religiosa identificável exige tratamento adequado de dados sensíveis. Projetar confirmação expressa de participação e exposição pública, registro da versão do aviso, minimização, retirada e política de retenção, com revisão da base legal aplicável. Pedido de remoção precisa alcançar projeções públicas, caches e cartões sob controle do projeto; backups seguem retenção definida.

Coroinhas e grupos juvenis tornam menores um caso previsível. Definir política de idade, melhor interesse e participação de responsáveis antes de aceitar cadastros identificáveis de menores; não presumir maioridade de todos. Não pontuar sacramentos, doações, frequência religiosa ou práticas íntimas. Não alegar que o projeto representa oficialmente a Igreja.
