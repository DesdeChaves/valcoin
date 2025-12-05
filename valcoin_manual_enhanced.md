# Manual de Utilizador Avançado da Aplicação Aurora

A Aurora é um ecossistema gamificado de literacia financeira que transforma a aprendizagem económica numa experiência viva e prática. Este manual descreve em detalhe as funcionalidades da plataforma para os perfis de Administrador, Professor e Aluno (Valkid/Valteen).

---

## Introdução: Uma Nova Abordagem à Educação Financeira

### Pontos Fortes da Plataforma

#### 1. Pedagogia Através da Experiência
A Aurora distingue-se por não se limitar a *ensinar* literacia financeira — permite que os alunos a *vivam*. Ao criar uma economia funcional dentro da escola, onde as decisões financeiras têm consequências reais (ainda que em moeda virtual), a plataforma oferece uma aprendizagem pedagogicamente superior a qualquer manual teórico tradicional.

#### 2. Gamificação Sofisticada e Significativa
O sistema de Houses, pontos de Legado e a progressão natural de Valkid para Valteen demonstra uma compreensão profunda da motivação juvenil. Não se trata de gamificação superficial baseada em badges decorativos, mas de uma estrutura cuidadosamente desenhada que cria sentido de pertença, identidade comunitária e propósito duradouro.

#### 3. Empreendedorismo Descentralizado
A loja peer-to-peer (P2P) representa um dos aspetos mais inovadores da plataforma. Ao permitir que qualquer aluno comercialize produtos ou serviços — desde criações artísticas como poemas até competências práticas como tutoria académica — cada estudante pode tornar-se um micro-empreendedor. Esta funcionalidade ensina:

- **Valorização do Talento Próprio:** Reconhecimento do valor económico das suas capacidades únicas
- **Estratégia de Preços:** Aprendizagem prática sobre oferta, procura e posicionamento de mercado
- **Marketing Pessoal:** Desenvolvimento de competências de comunicação e promoção
- **Gestão de Inventário:** Planeamento de stock e controlo de recursos
- **Economia Circular:** Promoção da sustentabilidade através da comercialização de bens em segunda mão

#### 4. Complexidade Económica Realista
A plataforma não simplifica excessivamente a realidade económica. A inclusão de:

- Produtos financeiros diversificados (contas poupança, micro-crédito)
- Sistema fiscal completo (IVA com múltiplas taxas, deduções fiscais)
- Taxa de câmbio dinâmica baseada em indicadores reais
- Mecanismos de controlo da circulação monetária (taxa de inatividade)
- Remuneração automática de professores

...cria um ecossistema que espelha genuinamente os mecanismos de uma economia real, preparando os alunos para a complexidade do mundo financeiro adulto.

### Aspetos Particularmente Inteligentes

**Sistema de Legado:** O registo permanente de contribuições excepcionais cria um poderoso incentivo não-monetário. Ao valorizar o reconhecimento e a reputação duradouros, a plataforma ensina que nem toda a riqueza é material.

**Bilhética P2P:** A capacidade de qualquer membro da comunidade criar e gerir eventos através de um sistema de bilhética digital promove iniciativa pessoal, competências organizacionais e sentido de responsabilidade coletiva.

**Automação Inteligente (Cron Jobs):** Os processos automáticos de pagamento de juros, prestações de empréstimos e salários mantêm a economia dinâmica e funcional sem criar sobrecarga administrativa para professores e gestores.

**Arquitetura Técnica Profissional:** A utilização de microserviços orquestrados com Docker revela maturidade técnica, garantindo escalabilidade, modularidade e facilidade de manutenção — características essenciais para uma plataforma educativa de longo prazo.

---

## 1. Administrador

O Administrador detém o controlo estratégico sobre o ecossistema Aurora, sendo responsável pela sua configuração, personalização e supervisão económica.

### 1.1. Dashboard de Controlo

O dashboard constitui o centro nevrálgico da plataforma, apresentando métricas vitais em tempo real que permitem uma gestão informada e proativa:

#### Métricas de Utilizadores
- Total de utilizadores registados
- Utilizadores ativos no período
- Distribuição por perfil (Aluno, Professor, Administrador)

#### Métricas de Transações
- Volume total de transações processadas
- Estado das transações (concluídas, pendentes, rejeitadas)
- Análise por tipo (crédito/débito)

#### Métricas Económicas
- **Total de Valcoins (VC):** Soma dos VC em circulação (carteiras ativas) e VC gastos no sistema
- **Taxa de Câmbio:** 
  - Taxa fixa configurada
  - Taxa dinâmica calculada com base nas receitas da escola
- **Receitas da Escola:** Total de receitas registadas e processadas no sistema

#### Métricas de Legado
- Pontos de legado totais atribuídos
- Crescimento mensal
- Distribuição das distinções mais valiosas pelos alunos

### 1.2. Configuração da Economia

A principal responsabilidade estratégica do Administrador é modelar e equilibrar a economia da Aurora, garantindo a sua sustentabilidade e relevância pedagógica.

#### 1.2.1. Gestão de Regras de Transação

As "Transaction Rules" constituem o motor económico da plataforma. O Administrador pode criar, editar e desativar regras que definem como os Valcoins são ganhos e gastos. Cada regra é altamente configurável:

**Parâmetros Essenciais:**
- **Nome e Valor:** Identificação clara e montante em VC (ex: "Participação Ativa na Aula", +10 VC)
- **Permissões:** Definição precisa de quem pode iniciar e quem pode receber a transação (ex: Professor → Aluno)
- **Limites Temporais:** Restrições de utilização por período (mensal, anual)
- **Limites Disciplinares:** Aplicabilidade por disciplina específica

**Categoria Especial - Legado:**
Transações marcadas com a categoria "Legado" são registadas permanentemente no perfil do aluno, representando contribuições de excecional valor para a comunidade escolar. Este mecanismo cria um incentivo poderoso para a excelência e o envolvimento cívico.

**Requisitos Académicos:**
- Definição de ano de escolaridade mínimo/máximo para aplicação da regra
- Garantia de progressão adequada na complexidade das tarefas

#### 1.2.2. Produtos Financeiros

O Administrador desenha os produtos financeiros que permitem aos alunos (especialmente Valteens) experimentarem decisões financeiras mais complexas:

**Produtos de Poupança:**
- Prazo de investimento (em meses)
- Taxa de juro aplicável
- Depósitos mínimos e máximos
- Periodicidade de pagamento de juros

**Produtos de Crédito (Micro-empréstimos):**
- Montante máximo disponível
- Prazo de pagamento
- Taxas de juro associadas
- Condições de aprovação

#### 1.2.3. Configurações Gerais do Sistema

**Utilizadores de Sistema Especiais:**
- **ivaDestinationUserId:** Conta que recebe o IVA de todas as transações comerciais
- **interestSourceUserId:** Conta que financia os juros das poupanças e recebe os pagamentos dos empréstimos

Estas contas especiais simulam entidades governamentais e instituições financeiras, enriquecendo a compreensão sistémica da economia.

#### 1.2.4. Gestão Fiscal e de Produtos

Para simular fielmente uma economia real, o Administrador configura um sistema fiscal completo:

**Taxas de IVA:**
O sistema suporta múltiplas taxas de IVA (Normal, Reduzida, Isenta), permitindo que cada produto ou serviço na loja seja associado à taxa apropriada. Esta diversidade ensina aos alunos como a fiscalidade varia por tipo de bem.

**Categorias de Produtos:**
As categorias não são meramente organizacionais — têm função pedagógica fiscal:

- **Organização:** Estruturação lógica da loja (ex: "Material Escolar", "Alimentação", "Bilhetes de Eventos")
- **Dedução Fiscal:** Categorias marcadas como `is_deductible` permitem que gastos nelas efetuados possam reduzir a carga fiscal simulada, ensinando na prática os conceitos de benefícios fiscais e incentivos económicos

### 1.3. Gestão da Comunidade

#### 1.3.1. Gestão de Casas (Houses)

As "Houses" funcionam como micro-comunidades dentro da escola, inspiradas no modelo de Hogwarts, fomentando colaboração interna e competição saudável entre grupos.

**Criação e Personalização:**
- Definição de identidade visual (nome, cor corporativa, logótipo)
- Redação de descrição e valores da casa
- Criação de narrativa e cultura própria

**Estrutura de Liderança:**
- Nomeação de Professor como "Chefe de Casa"
- Designação opcional de Aluno como "Líder" (promoção de responsabilidade estudantil)

**Gestão de Membros:**
- Adição e remoção de alunos
- Monitorização de participação e contribuição individual

**Dashboard de Casa:**
Cada casa dispõe de um dashboard com estatísticas agregadas que promovem a transparência e o espírito de equipa:
- Saldo total acumulado pelos membros
- Dívida total contraída
- Percentagem de membros com contas poupança ativas
- Ranking comparativo entre casas

#### 1.3.2. Gestão de Utilizadores e Matrículas

**Criação Manual:**
Interface intuitiva para registo individual de utilizadores e respetiva configuração de perfil.

**Importação em Massa:**
Sistema robusto de importação através de ficheiros estruturados (CSV) que permite:
- Criação massiva de contas (alunos, professores)
- Registo de disciplinas
- Matrículas em turmas
- Inscrições em disciplinas

Esta funcionalidade é especialmente útil no início do ano letivo, utilizando as listas de serviços letivos da escola.

**Aprovação de Empréstimos:**
O Administrador (ou professor designado) avalia pedidos de micro-empréstimos submetidos pelos alunos, analisando:
- Justificação do pedido
- Histórico financeiro do aluno
- Capacidade de pagamento estimada

### 1.4. Processos Automáticos (Cron Jobs)

O sistema Aurora executa processos automáticos que garantem o funcionamento contínuo da economia e a aplicação consistente de regras financeiras, simulando a automatização presente no sistema financeiro real.

#### 1.4.1. Pagamento de Juros de Poupança

**Objetivo Pedagógico:** Recompensar e incentivar o comportamento de poupança, demonstrando os benefícios do investimento a médio/longo prazo.

**Funcionamento:**
- Execução diária automática
- Cálculo preciso baseado na taxa de juro do produto subscrito
- Depósito direto nas contas poupança ativas

**Mecânica Financeira:**
- Periodicidade configurável (diária, semanal, mensal, trimestral)
- Taxa de juro composta quando aplicável
- Origem dos fundos: conta de sistema `interestSourceUserId`

**Impacto Educativo:** Os alunos observam concretamente o crescimento do seu capital ao longo do tempo, consolidando a compreensão sobre o valor temporal do dinheiro.

#### 1.4.2. Pagamento de Empréstimos e Juros

**Objetivo Pedagógico:** Ensinar responsabilidade financeira e as consequências de contrair dívida.

**Funcionamento:**
- Execução diária automática
- Cálculo de prestações (capital + juros)
- Débito automático nas contas dos alunos mutuários

**Mecânica Financeira:**
- Aplicação de juros sobre capital em dívida
- Sistema de amortização progressiva
- Destino dos fundos: conta de sistema `interestSourceUserId`

**Impacto Educativo:** Experiência prática sobre compromissos financeiros, gestão de dívida e planeamento orçamental.

#### 1.4.3. Pagamento de Salário aos Professores

**Objetivo Pedagógico:** Valorizar o papel dos professores na dinamização da economia e simular remuneração laboral.

**Funcionamento:**
- Execução mensal no dia configurado pelo Administrador
- Cálculo baseado no número de alunos por disciplina
- Valor por aluno configurável

**Parâmetros de Configuração:**
- `professorSalaryEnabled`: Ativa/desativa a funcionalidade
- `professorSalaryDay`: Dia do mês para processamento
- `professorSalaryAmountPerStudent`: Valor em VC gerado por cada aluno

**Impacto Educativo:** Permite aos alunos compreenderem que os professores também participam ativamente da economia escolar, humanizando as relações económicas.

#### 1.4.4. Taxa de Penalização por Inatividade

**Objetivo Pedagógico:** Manter a economia dinâmica, incentivar participação ativa e ensinar que recursos parados perdem valor.

**Funcionamento:**
- Execução diária automática (01h00)
- Aplicação apenas a alunos ativos sem atividade há mais de 30 dias
- Débito percentual sobre o saldo atual

**Condições de Aplicação:**
- Perfil: ALUNO
- Estado: ativo no sistema
- Inatividade: `last_activity_date` superior a 30 dias

**Parâmetros de Configuração:**
- `inactivityFeePercentage`: Percentagem aplicada (se zero ou indefinida, funcionalidade desativada)
- `ivaDestinationUserId`: Destinatário do valor cobrado

**Impacto Educativo:** Conceito de "custo de oportunidade" e importância da participação ativa na economia.

---

## 2. Professor

O Professor é o principal agente dinamizador da economia Aurora no quotidiano escolar, utilizando as ferramentas pedagógicas criadas pelo Administrador para motivar e educar os alunos.

### Principais Funcionalidades

#### Atribuição de Valcoins
Utilização das "Transaction Rules" pré-definidas para recompensar comportamentos e conquistas dos alunos, criando um sistema de incentivos claro e consistente.

#### Atribuição de Pontos de Legado
Ao aplicar regras da categoria "Legado", o professor confere uma distinção especial e permanente ao aluno, reconhecendo contribuições excepcionais para a comunidade escolar.

#### Gestão de Turmas
- Visualização completa dos alunos nas suas turmas
- Acompanhamento do progresso financeiro individual
- Identificação de padrões e necessidades de apoio

#### Papel de Chefe de Casa
Professores designados como Chefes de Casa têm acesso a:
- Dashboard específico da sua casa
- Estatísticas de desempenho dos membros
- Ferramentas de motivação e coordenação

#### Acompanhamento Personalizado
Consulta detalhada de:
- Histórico completo de transações dos alunos
- Evolução do saldo ao longo do tempo
- Estado de produtos financeiros (poupanças, empréstimos)
- Padrões de consumo e poupança

#### Validação de Bilhetes
Interface dedicada para validação de bilhetes de eventos através de:
- Leitura de QR Code
- Verificação de autenticidade
- Marcação como "utilizado"

---

## 3. Aluno

O Aluno interage com o ecossistema Valcoin para desenvolver competências de literacia financeira de forma prática, motivadora e adequada à sua faixa etária.

### 3.1. Valkid (Alunos Mais Novos)

A interface Valkid é concebida para ser intuitiva e visualmente apelativa, focando-se em conceitos financeiros básicos através de:

**Funcionalidades Simplificadas:**
- Consulta de saldo com visualização clara
- Histórico de conquistas e recompensas
- Loja de recompensas com interface gamificada
- Sistema de feedback positivo constante

**Objetivo Pedagógico:** Introduzir conceitos de ganho, gasto e poupança de forma lúdica, sem complexidade excessiva.

### 3.2. Valteen (Alunos Mais Velhos)

A plataforma Valteen oferece um conjunto sofisticado de ferramentas financeiras que preparam os adolescentes para a gestão financeira adulta.

#### 3.2.1. A Tua Conta

**Dashboard Pessoal:**
Centro de controlo financeiro individual que apresenta:
- Visão consolidada do saldo atual
- Histórico completo de transações com filtros avançados
- Resumo de produtos financeiros ativos
- Indicadores de saúde financeira

**O Teu Legado:**
Secção especial de prestígio que exibe:
- Todas as distinções de categoria "Legado" recebidas
- Narrativa das contribuições excepcionais
- Reconhecimento permanente pela comunidade

#### 3.2.2. Funcionalidades Financeiras Avançadas

**Contas Poupança:**
- Subscrição de produtos de poupança disponíveis
- Realização de depósitos
- Acompanhamento do crescimento com juros compostos
- Visualização gráfica da evolução patrimonial

**Micro-Empréstimos:**
- Submissão de pedidos de empréstimo com justificação
- Simulação de prestações e juros
- Responsabilização pelo cumprimento de pagamentos
- Aprendizagem sobre gestão de dívida

#### 3.2.3. Vida em Comunidade

**A Minha Casa (House):**
- Sentimento de pertença a uma comunidade específica
- Colaboração com colegas em objetivos comuns
- Acompanhamento de ranking entre casas
- Visualização de estatísticas agregadas do grupo
- Participação em desafios e competições inter-casas

---

## 4. A Loja Aurora: Mercado de Empreendedorismo e Aprendizagem

A loja representa o coração pulsante da economia Aurora. Mais do que um simples marketplace, constitui uma plataforma de micro-empreendedorismo onde qualquer membro da comunidade escolar pode criar, comercializar e adquirir produtos e serviços, transformando talentos e bens em valor económico real.

### 4.1. Objetivos Pedagógicos

#### Empreendedorismo Prático
A loja capacita os alunos a tornarem-se pequenos empreendedores. Ao permitirem vender os seus próprios produtos e serviços, a plataforma proporciona aprendizagem experiencial sobre:
- Identificação de oportunidades de mercado
- Conceitos de oferta e procura
- Estratégias de marketing e comunicação
- Fixação de preços competitivos
- Gestão operacional de um pequeno negócio

#### Valorização do Talento e do Trabalho
Os alunos podem monetizar as suas competências únicas:
- **Criações Artísticas:** Poemas, desenhos, artesanato
- **Serviços Académicos:** Mentoria, tutoria, apoio em disciplinas
- **Competências Especiais:** Workshops, demonstrações, performances
- **Trabalho Manual:** Produtos manufaturados

#### Economia Circular e Sustentabilidade
A plataforma incentiva ativamente:
- Comercialização de produtos em segunda mão
- Reutilização de livros escolares
- Partilha de vestuário e equipamentos
- Consciencialização sobre consumo sustentável
- Prolongamento da vida útil dos bens

#### Literacia Financeira Aplicada
Para além dos conceitos fundamentais, a loja consolida a compreensão sobre:
- Orçamentação pessoal e planeamento de compras
- Impacto fiscal (IVA) no preço final
- Tomada de decisões de consumo consciente
- Análise custo-benefício
- Gestão de recursos limitados

### 4.2. Funcionamento do Marketplace

#### Qualquer Membro é um Potencial Vendedor
Democratização total do empreendedorismo: qualquer utilizador autenticado (aluno ou professor) pode tornar-se vendedor através de um processo simples e intuitivo.

**Tipos de Oferta:**

**Produtos Físicos:**
- Criações originais do aluno (artesanato, arte, produtos manufaturados)
- Bens em segunda mão (livros, material escolar, vestuário, equipamentos desportivos)
- Alimentos ou produtos artesanais

**Serviços:**
- Tempo e conhecimento especializados
- Sessões de tutoria académica
- Mentoria em competências específicas
- Workshops temáticos
- Apoio em projetos

#### Processo de Criação de Produtos

**Formulário Intuitivo** que requer:
- **Nome:** Identificação clara e apelativa
- **Descrição:** Detalhamento das características e benefícios
- **Preço:** Valor em Valcoins (sem IVA)
- **Stock:** Quantidade disponível (se aplicável; serviços podem ter disponibilidade ilimitada)
- **Categoria:** Classificação para organização e fins fiscais
- **Taxa de IVA:** Seleção entre as taxas pré-definidas pelo Administrador
- **Imagem:** Upload opcional para melhor apresentação

#### Mecânica de Transação

**Processo de Compra:**
1. Aluno navega pela loja e seleciona produto/serviço
2. Sistema apresenta preço total (preço base + IVA)
3. Confirmação da compra
4. Transferência automática de Valcoins:
   - Da conta do comprador
   - Para a conta do vendedor (valor líquido)
   - Para a conta `ivaDestinationUserId` (componente de IVA)

**Segurança e Integridade:**
- Validação de saldo suficiente
- Verificação de stock disponível
- Registo permanente da transação
- Sistema de feedback/avaliação (opcional)

---

## 5. Sistema de Bilhética Digital P2P (Peer-to-Peer)

O sistema de bilhética representa uma extensão natural e poderosa da loja, permitindo que qualquer membro da comunidade organize e gira os seus próprios eventos, promovendo iniciativa, criatividade e responsabilidade.

### 5.1. Criação Descentralizada de Eventos

#### Qualquer Membro é um Potencial Promotor
Democratização da organização cultural e social: qualquer aluno ou professor pode criar eventos (workshops de programação, recitais de poesia, torneios de xadrez, festas temáticas, exposições) e comercializar bilhetes através da plataforma.

#### Produto-Bilhete: Integração com a Loja

**Criação:**
- O promotor cria um novo produto na loja
- Define características específicas:
  - Nome do evento
  - Data, hora e local
  - Preço do bilhete em Valcoins
  - Número total de bilhetes disponíveis (lotação)
  - Descrição detalhada do evento
- **Marcação Especial:** Assinala o produto como `is_ticket`

**Diferenciação:**
O sistema reconhece automaticamente produtos marcados como bilhetes e aplica-lhes funcionalidades especiais de validação e controlo de acesso.

#### Segurança e Controlo

**Compra Segura:**
Quando um utilizador adquire um bilhete, o sistema:
- Gera uma entrada única na base de dados
- Associa o bilhete ao comprador específico
- Cria um código QR único e não replicável
- Regista timestamp e detalhes da transação

### 5.2. Utilização e Validação de Bilhetes

#### Download do Bilhete Digital

O comprador pode descarregar um ficheiro PDF profissional que contém:
- Informações completas do evento (nome, data, hora, local)
- Dados do bilhete (número, tipo, preço)
- QR Code único gerado pelo sistema
- Instruções de utilização
- Termos e condições

#### Sistema de Validação pelo Promotor

**Interface de Validação:**
No dia do evento, o organizador ou pessoa designada:

1. **Acesso à Plataforma:**
   - Login na interface de validação
   - Seleção do evento específico

2. **Processo de Validação:**
   - Digitalização do QR Code do bilhete
   - Verificação automática de:
     - Autenticidade do código
     - Correspondência ao evento correto
     - Estado do bilhete (válido/já utilizado)
   - Visualização dos dados do comprador

3. **Marcação como Utilizado:**
   - Confirmação de entrada
   - Invalidação automática do bilhete
   - Prevenção de fraude e reutilização

**Feedback Visual:**
- Indicadores claros (verde/vermelho)
- Mensagens de confirmação
- Alertas em caso de problemas

#### Painel de Gestão do Promotor

O criador do evento tem acesso a um dashboard completo onde pode:

**Monitorização em Tempo Real:**
- Número total de bilhetes vendidos vs. disponíveis
- Receita total gerada
- Lista de compradores
- Estado de cada bilhete (válido/utilizado/cancelado)

**Análise de Dados:**
- Taxa de ocupação
- Padrão de vendas ao longo do tempo
- Identificação de picos de procura

**Gestão Operacional:**
- Comunicação com participantes
- Cancelamento de bilhetes (com política de reembolso)
- Geração de relatórios

**Benefícios Pedagógicos:**
Esta autonomia total ensina:
- Planeamento e organização de eventos
- Gestão de logística e recursos
- Controlo financeiro
- Atendimento ao cliente
- Resolução de problemas em tempo real

---

## 6. Arquitetura e Instalação

Esta secção detalha a arquitetura técnica da plataforma Aurora, as tecnologias utilizadas, os requisitos de hardware e o processo de instalação e configuração.

### 6.1. Arquitetura da Plataforma

A plataforma Aurora é construída sobre uma **arquitetura de microserviços moderna**, orquestrada com Docker e Docker Compose. Esta abordagem arquitetural garante modularidade, escalabilidade horizontal, facilidade de manutenção e isolamento de responsabilidades.

#### Componentes do Sistema

**`aurora-admin-server`**
- Backend da aplicação de administração
- Responsável pela lógica de negócio central
- Gestão de utilizadores, autenticação e autorização
- Configurações da economia e regras de transação
- API RESTful para comunicação com o frontend

**`aurora-admin-client`**
- Interface de frontend desenvolvida em React
- Destinada a administradores e professores
- UI/UX otimizada para gestão e supervisão
- Visualizações de dados e dashboards interativos

**`aurora-store-server`**
- Backend dedicado à loja Valcoin
- Gestão de produtos, inventário e transações comerciais
- Sistema de bilhética integrado
- Processamento de pagamentos em Valcoins

**`aurora-store-client`**
- Interface de frontend da loja (React)
- Acessível a todos os membros da comunidade
- Experiência de compra otimizada
- Interface de criação de produtos e eventos

**`postgres`**
- Base de dados relacional PostgreSQL 13
- Armazenamento persistente de todos os dados
- Garantia de integridade referencial e transacional
- Backup e recuperação de dados

**`redis`**
- Servidor Redis para caching em memória
- Otimização de performance em queries frequentes
- Gestão de sessões de utilizador
- Redução de carga na base de dados principal

**`nginx`**
- Servidor web e reverse proxy
- Direcionamento de tráfego baseado em URL
- Balanceamento de carga
- Terminação SSL/TLS
- Compressão e cache de conteúdos estáticos

**`pgadmin`**
- Interface web para administração de PostgreSQL
- Gestão visual de bases de dados
- Execução de queries e análise de dados
- Ferramenta de diagnóstico e manutenção

**`watchtower`**
- Serviço de monitorização e atualização automática
- Verifica novas versões de imagens Docker
- Atualização contínua sem downtime
- Garantia de segurança e patches

#### Comunicação entre Serviços

Todos os serviços comunicam através de uma **rede Docker privada isolada**, garantindo:
- Segurança por isolamento de rede
- Comunicação interna rápida
- Resolução de nomes automática
- Proteção contra acessos externos não autorizados

### 6.2. Tecnologias Utilizadas

#### Backend
- **Node.js:** Plataforma JavaScript assíncrona e de alto desempenho
- **Express.js:** Framework web minimalista e flexível para construção de APIs REST
- **JWT (JSON Web Tokens):** Autenticação stateless e segura
- **Bcrypt:** Hashing seguro de passwords

#### Frontend
- **React.js:** Biblioteca JavaScript para interfaces de utilizador reativas
- **React Router:** Navegação client-side
- **Axios:** Cliente HTTP para comunicação com APIs
- **Context API / Redux:** Gestão de estado global (conforme implementação)

#### Base de Dados
- **PostgreSQL 13:** Sistema de gestão de base de dados relacional robusto e escalável
- **SQL:** Linguagem de query estruturada
- **Transações ACID:** Garantia de consistência e integridade

#### Caching e Performance
- **Redis 6.2:** Armazenamento em memória de estruturas de dados
- **Cache de sessões:** Melhor experiência do utilizador
- **Rate limiting:** Proteção contra abuso

#### Servidor Web / Proxy
- **Nginx:** Servidor web de alta performance
- **Reverse proxy:** Encaminhamento inteligente de requisições
- **Load balancing:** Distribuição de carga entre serviços
- **SSL/TLS:** Encriptação de comunicações

#### Containerização e Orquestração
- **Docker:** Plataforma de containerização para isolamento de aplicações
- **Docker Compose:** Orquestração multi-container
- **Docker Networks:** Isolamento e comunicação segura entre serviços
- **Docker Volumes:** Persistência de dados

### 6.3. Requisitos de Hardware

Os seguintes requisitos constituem recomendações para um ambiente de produção estável. Podem variar significativamente com base no número de utilizadores simultâneos e na intensidade de utilização da plataforma.

#### Servidor de Produção

**Sistema Operativo:**
- Linux (Ubuntu 20.04 LTS ou superior recomendado)
- Debian 10+ (alternativa estável)
- CentOS 8+ / Rocky Linux (para ambientes enterprise)

**Processamento:**
- **Mínimo:** 2 cores/vCPUs
- **Recomendado:** 4+ cores para melhor desempenho
- **Ideal:** 8 cores para escolas com mais de 500 utilizadores ativos

**Memória RAM:**
- **Mínimo:** 4 GB (para ambientes de teste ou escolas pequenas)
- **Recomendado:** 8 GB para desempenho ótimo
- **Ideal:** 16 GB para ambientes com alto tráfego e múltiplos processos simultâneos

**Armazenamento:**
- **Mínimo:** 20 GB de espaço livre em disco
- **Recomendado:** 50 GB para logs, backups e crescimento de dados
- **Tipo:** SSD preferencial para melhor performance de I/O da base de dados

**Rede:**
- Conexão de internet estável
- Largura de banda mínima: 10 Mbps
- Recomendado: 100 Mbps para resposta rápida

#### Cliente (Utilizador Final)

**Dispositivos Suportados:**
- Computadores desktop/portáteis
- Tablets (iPad, Android tablets)
- Smartphones (modo responsivo)

**Navegadores Web Modernos:**
- Google Chrome 90+ (recomendado)
- Mozilla Firefox 88+
- Safari 14+ (macOS/iOS)
- Microsoft Edge 90+

**Requisitos Mínimos:**
- Conexão à internet (Wi-Fi ou dados móveis)
- JavaScript ativado
- Cookies ativados para gestão de sessão

### 6.4. Processo de Instalação

A instalação da plataforma Aurora é simplificada através da utilização de Docker Compose, que automatiza o deployment e a configuração de todos os serviços necessários.

#### Passo 1: Pré-requisitos

Certifique-se de que o servidor possui as seguintes ferramentas instaladas:

**Git:**
```bash
sudo apt update
sudo apt install git
```

**Docker:**
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
```

**Docker Compose:**
```bash
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

**Verificação:**
```bash
docker --version
docker-compose --version
```

#### Passo 2: Clonar o Repositório

```bash
git clone <URL_DO_REPOSITORIO>
cd <NOME_DA_PASTA_DO_PROJETO>
```

#### Passo 3: Configuração do Ambiente

**Criar Ficheiro de Variáveis de Ambiente:**

Crie um ficheiro `.env.admin` na raiz do projeto com as configurações necessárias:

```bash
nano .env.admin
```

**Conteúdo Mínimo Recomendado:**
```env
# Segurança
JWT_SECRET=seu-segredo-jwt-super-secreto-e-aleatorio-com-minimo-32-caracteres

# Base de Dados
DB_HOST=postgres
DB_PORT=5432
DB_NAME=aurora
DB_USER=aurora_user
DB_PASSWORD=password-seguro-da-base-de-dados

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# Configurações da Aplicação
NODE_ENV=production
PORT=3000

# URLs
API_URL=https://seu-dominio.com/api
FRONTEND_URL=https://seu-dominio.com
```

**Revisão do Docker Compose:**

Abra o ficheiro `docker-compose.yml` e ajuste configurações como:
- Portas expostas (se necessário evitar conflitos)
- Volumes para persistência de dados
- Recursos alocados (limits de CPU/RAM)
- Variáveis de ambiente específicas

#### Passo 4: Inicialização da Base de Dados

O ficheiro `schema.sql` contém a estrutura completa da base de dados e será automaticamente executado no primeiro arranque do serviço PostgreSQL.

**Verificar Ficheiro Schema:**
```bash
ls -lh schema.sql
```

Este ficheiro deve conter:
- Definição de todas as tabelas
- Índices para otimização
- Constraints e chaves estrangeiras
- Funções e triggers
- Dados iniciais essenciais

#### Passo 5: Iniciar a Plataforma

**Modo Produção (Background):**
```bash
docker-compose up -d
```

**Modo Desenvolvimento (Com Logs):**
```bash
docker-compose up
```

**Verificar Estado dos Serviços:**
```bash
docker-compose ps
```

Todos os serviços devem mostrar estado "Up" ou "healthy".

**Visualizar Logs em Tempo Real:**
```bash
docker-compose logs -f
```

#### Passo 6: Povoamento Inicial da Base de Dados

Após os contentores estarem operacionais, é necessário popular a base de dados com os dados iniciais da comunidade escolar.

**Instalação de Dependências Python:**

Na máquina local ou no servidor (fora dos contentores):
```bash
pip install psycopg2-binary bcrypt
```

**Preparação dos Ficheiros CSV:**

Certifique-se de que os ficheiros de dados estão na pasta `dados/`:
- `profs.csv` - Lista de professores
- `alunos_rita.csv` - Lista de alunos
- `cts.csv` - Estrutura de disciplinas e turmas

**Execução dos Scripts de Povoamento:**

Execute os scripts na seguinte ordem específica:

```bash
# 1. Inserir professores
python3 inserir_professores.py

# 2. Matricular alunos
python3 matricular_alunos.py

# 3. Atribuir disciplinas
python3 atribuir_disciplinas.py
```

**Verificação:**

Aceda ao PgAdmin (tipicamente `http://seu-servidor:5050`) e verifique:
- Tabela `users` contém professores e alunos
- Tabela `classes` tem as turmas criadas
- Tabela `subjects` contém as disciplinas
- Tabelas de relação estão corretamente populadas

#### Passo 7: Configuração Inicial via Interface

**Aceder à Plataforma:**
```
https://seu-dominio.com/admin
```

**Login Inicial:**
Utilize as credenciais do utilizador administrador criado durante o povoamento.

**Configurações Essenciais:**

1. **Sistema:**
   - Definir `ivaDestinationUserId`
   - Definir `interestSourceUserId`
   - Configurar taxas de IVA

2. **Economia:**
   - Criar primeiras Transaction Rules
   - Definir produtos financeiros básicos
   - Configurar taxa de câmbio inicial

3. **Comunidade:**
   - Criar Houses
   - Atribuir alunos às casas
   - Nomear Chefes de Casa

#### Passo 8: Configuração de SSL/TLS (Recomendado)

Para produção, configure certificados SSL:

**Usando Let's Encrypt com Certbot:**
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d seu-dominio.com
```

**Renovação Automática:**
```bash
sudo certbot renew --dry-run
```

#### Passo 9: Configuração de Backups Automáticos

**Script de Backup PostgreSQL:**

```bash
#!/bin/bash
# backup_aurora.sh

BACKUP_DIR="/var/backups/valcoin"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

docker exec postgres pg_dump -U aurora_user aurora | gzip > $BACKUP_DIR/aurora_backup_$DATE.sql.gz

# Manter apenas backups dos últimos 30 dias
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete
```

**Agendar com Cron:**
```bash
crontab -e
# Adicionar: Backup diário às 2h da manhã
0 2 * * * /path/to/backup_valcoin.sh
```

#### Passo 10: Monitorização e Manutenção

**Verificar Saúde dos Contentores:**
```bash
docker-compose ps
docker stats
```

**Logs de Aplicação:**
```bash
docker-compose logs -f aurora-admin-server
docker-compose logs -f aurora-store-server
```

**Atualizar Serviços:**
```bash
git pull origin main
docker-compose down
docker-compose up -d --build
```

**Watchtower** (se ativado) automaticamente verifica e aplica atualizações de imagens Docker.

---

## 7. Potencial Transformador e Visão Futura

### 7.1. Impacto Educativo

A plataforma Aurora transcende o conceito tradicional de "aplicação escolar" para se constituir como um **laboratório social e económico vivo**, onde os alunos não apenas aprendem conceitos teóricos, mas experimentam as dinâmicas reais de uma economia funcional.

#### Aprendizagens Fundamentais

**Consequências das Escolhas Financeiras:**
Os alunos vivenciam diretamente como decisões de consumo, poupança e investimento afetam a sua capacidade financeira futura, desenvolvendo pensamento crítico sobre gestão de recursos.

**Valor do Trabalho e do Talento:**
Ao monetizarem as suas competências e criações através da loja P2P, os jovens compreendem que o valor económico pode ser gerado através de múltiplas formas de contribuição, não apenas trabalho assalariado tradicional.

**Importância da Poupança e Risco do Crédito:**
A experiência prática com produtos financeiros ensina o poder dos juros compostos na poupança e o peso das dívidas na liberdade financeira.

**Funcionamento do Sistema Fiscal:**
A exposição a IVA, deduções fiscais e tributação ajuda a desmistificar conceitos que frequentemente confundem adultos, preparando cidadãos mais conscientes.

**Empreendedorismo e Inovação:**
A capacidade de criar produtos, serviços e eventos promove mentalidade empreendedora, criatividade e iniciativa pessoal.

**Colaboração e Competição Saudável:**
O sistema de Houses equilibra o espírito competitivo com a cooperação intra-grupo, ensinando que sucesso individual e coletivo podem ser complementares.

### 7.2. Preparação para a Vida Adulta

A Aurora prepara os jovens para enfrentar desafios financeiros reais:
- Gestão de orçamento pessoal e familiar
- Tomada de decisões de investimento informadas
- Compreensão de produtos financeiros complexos
- Consciência dos direitos e deveres fiscais
- Capacidade de avaliar riscos e oportunidades

### 7.3. Escalabilidade e Adaptação

A arquitetura modular da plataforma permite:
- Adaptação a diferentes contextos educativos (escolas, universidades, organizações juvenis)
- Personalização de regras económicas conforme objetivos pedagógicos específicos
- Integração com outros sistemas educativos
- Expansão para múltiplas instituições mantendo economias separadas ou interligadas

### 7.4. Conclusão

Se implementada com dedicação pedagógica e suporte técnico adequado, a Aurora tem potencial para **revolucionar a educação financeira** em Portugal e além-fronteiras. Ao transformar conceitos abstratos em experiências tangíveis, a plataforma pode genuinamente alterar a relação das novas gerações com o dinheiro, criando adultos mais conscientes, responsáveis e preparados para navegar a complexidade económica do século XXI.

---

## Suporte e Contacto

Para questões técnicas, sugestões de melhoria ou suporte na implementação, contacte a equipa de desenvolvimento através dos canais oficiais da instituição.

**Nota:** Este manual está em constante evolução. Consulte regularmente a documentação para atualizações e novas funcionalidades.