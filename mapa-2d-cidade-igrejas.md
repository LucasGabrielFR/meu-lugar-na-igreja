# Mapa 2D, cidade isométrica e construção das igrejas

## Objetivo

Manter o Brasil em uma navegação cartográfica de cima, sem rotação, e abrir a cidade em uma cena isométrica com setores paroquiais. As igrejas crescem apenas em porte visual; seus níveis não atribuem títulos eclesiásticos.

## Tarefas

- [x] Obter coordenadas de municípios a partir da malha IBGE e mostrar cidades cadastradas no mapa.
- [x] Restringir a câmera nacional e a câmera da cidade a pan e zoom; distribuir as paróquias em setores ao redor de uma praça comum.
- [x] Criar níveis visuais de construção por quantidade de casas ativas, sem nomes de status canônico.
- [x] Registrar no produto, arquitetura e README; reconstruir o Docker e confirmar saúde.

Nota: o endpoint público de malhas IBGE disponibilizado durante a geração não trouxe a geometria do município de Boa Esperança do Norte (código 5101837); esse município não terá marcador até a malha oficial ser atualizada ou uma coordenada oficial ser adicionada. O catálogo e a busca continuam incluindo o município.

## Regra visual inicial

Cada paróquia recebe um setor dentro do município. A cidade não é duplicada quando há várias paróquias. As casas preenchem quadras estáveis; a cena pode ganhar quadras novas conforme necessário.

O porte da igreja usa quatro níveis numerados, derivados das casas ativas na paróquia: nível 1 até 7; nível 2 de 8 a 23; nível 3 de 24 a 47; nível 4 a partir de 48. O primeiro nível tem aparência de capelinha; os demais ampliam a construção. “Catedral” e “basílica” não são níveis.
