# Desempenho do mapa

A versão 0.18.1 evita reprojetar toda a malha regional e recalcular acessos nacionais a cada mudança do entorno. Caches fracos por referência preservam a geometria enquanto os dados estão carregados e permitem sua coleta ao descartar células. Mudanças nos dados produzem novas geometrias. A filtragem considera caixas de trechos inteiros, incluindo vias cujas extremidades estejam fora da tela.

As conexões usam cidades do enquadramento com margem, mantendo a lista nacional para buscar municípios vizinhos. Ruas e rodovias usam subcaminhos agrupados, preservando pavimento, borda e sinalização. A máscara SVG ocupa apenas a tela com margem. Eventos da câmera são acumulados por `requestAnimationFrame`; as células rodoviárias continuam sendo atualizadas após 180 ms de estabilização. Os níveis de detalhe, igrejas, casas e aviões permanecem disponíveis.

## Reprodução

Com o ambiente saudável após `docker compose up --build -d --wait`, execute em PowerShell:

```powershell
docker compose run --rm -T --volume "${PWD}/src:/app/src:ro" --volume "${PWD}/docs:/app/docs" migrate node scripts/profile-map.mjs
```

O script lê o banco e a cartografia local, sem modificar registros, e grava `map-performance.json`. Compara a implementação anterior global com a projeção regional e os acessos regionais no mesmo processo: Jandira, zoom 128, tela 1280 × 720, 4.019 municípios, 22.128 trechos carregados. É uma amostra de CPU em Node/Docker; não mede FPS, INP, tempo de rede ou fluidez em celulares. Os valores variam por máquina e carga. Evite executar em paralelo com builds.

## Amostra registrada

| Cálculo | Antes | Depois |
| --- | ---: | ---: |
| Projeção das vias | 367,57 ms, região inteira | 98,19 ms, primeiro enquadramento |
| Projeção ao mover novamente | 367,57 ms, sem reutilização | 5,61 ms, cache aquecido |
| Conexões municipais | 1.007,68 ms, cálculo nacional | 26,48 ms, 30 municípios do entorno |

O novo enquadramento selecionou 1.653 dos 22.128 trechos carregados. A escala nacional inicial custou 83,04 ms e passa a ser reutilizada enquanto os raios municipais permanecerem iguais. Os dados completos da execução estão em [map-performance.json](map-performance.json).

Validação: build Docker, lint, TypeScript e 43 testes aprovados; auditoria sem vulnerabilidades. No navegador local foram exercitados arraste, afastamento e aproximação na região de Jandira, sem erros de console. Verifique também em aparelhos reais: o perfil de CPU complementa essa verificação e não garante uma taxa de quadros universal.
