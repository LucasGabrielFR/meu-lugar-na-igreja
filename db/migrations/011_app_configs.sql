CREATE TABLE IF NOT EXISTS app_configs (
  key text PRIMARY KEY,
  title text NOT NULL,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO app_configs (key, title, value) VALUES
(
  'privacy_policy',
  'Política de Privacidade',
  '# Política de Privacidade · Meu Lugar na Igreja

**Última atualização:** 25 de outubro de 2026  
**Responsável:** AcutisTech (Acutis Tecnologia e Inovação)  
**Contato:** privacidade@acutistech.com.br

---

### 1. Visão Geral e Compromisso
O **Meu Lugar na Igreja** é uma iniciativa desenvolvida pela **AcutisTech** para conectar católicos em todo o território nacional através de uma representação virtual comunitária. Valorizamos profundamente a privacidade de cada participante e nos comprometemos com a transparência e a proteção de seus dados pessoais, em conformidade com a Lei Geral de Proteção de Dados Pessoais (LGPD - Lei nº 13.709/2018) e as Políticas de Dados da Plataforma Meta (Instagram).

---

### 2. Dados que Coletamos
Para permitir a participação na comunidade ilustrada, coletamos apenas as informações estritamente necessárias fornecidas voluntariamente pelo participante:
- **Nome de Exibição / Nome Público:** O nome ou apelido pelo qual o participante deseja ser identificado em sua casa virtual.
- **Nome de Usuário no Instagram (`@username`):** Utilizado exclusivamente para identificar a presença na rede e permitir a verificação comunitária.
- **Vínculo Paroquial e Município:** A paróquia e a cidade informadas pelo participante para associação ao bairro virtual correspondente.
- **Cor da Casa Ilustrativa:** Preferência estética escolhida para a casa virtual.
- **Dados Técnicos de Navegação:** Logs de acesso técnicos essenciais para a segurança e estabilidade dos servidores (endereço IP, navegador e registros de requisições).

> **Aviso Importante sobre Localização Real:** O Meu Lugar na Igreja **NUNCA coleta nem exibe o endereço físico real** de seus participantes. As casas e bairros no mapa ocupam lotes fictícios e ilustrativos dentro do município selecionado, preservando integralmente a intimidade e a segurança do seu lar.

---

### 3. Finalidade do Tratamento
Os dados coletados são utilizados para:
1. Posicionar sua casa virtual na comunidade paroquial escolhida;
2. Exibir sua identificação pública no mapa interativo;
3. Integrar interações autorizadas com a API do Instagram (como confirmações e eventos de participação via webhook);
4. Garantir a moderação e prevenir fraudes, spams ou abusos na plataforma.

---

### 4. Integração com a Plataforma Meta (Instagram)
Nossa plataforma utiliza ferramentas da Meta para verificação e interação social. Nenhuma informação confidencial da sua conta do Instagram é acessada, alterada ou transferida a terceiros sem seu expresso consentimento. Cumprimos rigorosamente os Termos de Plataforma e as Políticas para Desenvolvedores da Meta.

---

### 5. Compartilhamento de Dados
A AcutisTech **não vende, não aluga e não comercializa** dados pessoais de usuários com parceiros comerciais ou empresas de publicidade. Os dados são mantidos em infraestrutura de servidores segura e isolada.

---

### 6. Seus Direitos (LGPD) e Exclusão de Dados
Você tem o direito de, a qualquer momento:
- Confirmar a existência de tratamento e acessar seus dados;
- Corrigir dados incompletos ou desatualizados;
- **Solicitar a exclusão definitiva:** Você pode pedir a remoção da sua casa e dos seus dados do mapa a qualquer instante enviando uma solicitação para **privacidade@acutistech.com.br** ou solicitando a um administrador da paróquia. Seu registro será removido em até 48 horas úteis.

---

### 7. Contato e Encarregado de Dados (DPO)
Em caso de dúvidas, solicitações ou exercício de direitos de privacidade, entre em contato com nossa equipe:
- **E-mail:** privacidade@acutistech.com.br
- **AcutisTech:** https://acutistech.com.br'
),
(
  'terms_of_service',
  'Termos de Serviço',
  '# Termos de Serviço · Meu Lugar na Igreja

**Última atualização:** 25 de outubro de 2026  
**Plataforma:** Meu Lugar na Igreja (serviço mantido pela AcutisTech)  
**Contato:** contato@acutistech.com.br

---

### 1. Aceitação dos Termos
Ao navegar, visualizar ou cadastrar uma casa na plataforma **Meu Lugar na Igreja**, você concorda integralmente com estes Termos de Serviço e com nossa Política de Privacidade. Caso não concorde com alguma disposição, pedimos que não utilize a plataforma.

---

### 2. Natureza Ilustrativa do Mapa
O Meu Lugar na Igreja é uma representação simbólica, artística e comunitária:
- **Território e Sedes:** As coordenadas das cidades e malhas rodoviárias provêm de dados públicos abertos do IBGE.
- **Casas, Ruas e Construções:** O posicionamento de casas e quarteirões paroquiais é puramente ilustrativo. **Não corresponde nem indica divisões geográficas oficiais, nem limites paroquiais canônicos, nem endereços residenciais reais.**
- **Progresso Comunitário:** O desenvolvimento visual das construções representa o engajamento e a participação dos membros e não confere direitos de propriedade real.

---

### 3. Regras de Participação e Conduta
Ao solicitar a inclusão de sua casa ou interagir com a comunidade:
1. Você declara possuir o direito de utilizar o perfil do Instagram informado;
2. Compromete-se a não fornecer nomes difamatórios, ofensivos, obscenos ou que incitem ódio e preconceito;
3. Compromete-se a não realizar ataques de negação de serviço, tentativas de invasão ou envio automatizado de solicitações (spam);
4. Reconhece que dados falsos ou maliciosos serão descartados imediatamente.

---

### 4. Moderação e Gestão Comunitária
A equipe da **AcutisTech** e os moderadores credenciados reservam-se o direito de:
- Revisar solicitações de participação antes da publicação no mapa;
- Arquivar, editar ou remover cadastros que violem estes termos ou as diretrizes comunitárias;
- Atualizar a organização dos bairros virtuais conforme novas paróquias ou municípios sejam adicionados.

---

### 5. Propriedade Intelectual
As ilustrações, marcas, elementos visuais, identidade artística do mapa e códigos do software Meu Lugar na Igreja são de titularidade da AcutisTech ou utilizados sob licença. O uso não autorizado para fins comerciais é expressamente proibido sem prévia autorização por escrito.

---

### 6. Isenção e Limitação de Responsabilidade
A plataforma é fornecida "como está", buscando a melhor experiência e disponibilidade contínua. Não nos responsabilizamos por indisponibilidades temporárias decorrentes de manutenção técnica, falhas de conexão de terceiros ou atualizações de serviços externos integrados (como Instagram/Meta).

---

### 7. Alterações destes Termos
Estes termos poderão ser revisados periodicamente para refletir novidades da plataforma ou adequações legais. A data da última atualização no início desta página refletirá sempre a versão vigente.

---

### 8. Foro e Legislação Aplicável
Estes Termos são regidos pelas leis da República Federativa do Brasil. Para dirimir eventuais controvérsias decorrentes deste instrumento, fica eleito o Foro da Comarca da sede da AcutisTech.'
)
ON CONFLICT (key) DO NOTHING;
