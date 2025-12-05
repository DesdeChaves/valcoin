# Manual de Utilizador Avançado da Aplicação Aurora

Este manual descreve em detalhe as funcionalidades da plataforma Aurora, um ecossistema gamificado de literacia financeira. Abrange os perfis de Administrador, Professor e Aluno (Valkid/Valteen).

---

## 1. Administrador

O Administrador detém o controlo total sobre o ecossistema Aurora, sendo responsável pela sua configuração, personalização e supervisão económica.

### 1.1. Dashboard de Controlo

O dashboard é o centro nevrálgico da plataforma, apresentando métricas vitais em tempo real:
- **Métricas de Utilizadores:** Total de utilizadores, utilizadores ativos, e a sua distribuição (Aluno, Professor, Admin).
- **Métricas de Transações:** Volume total de transações, estado (concluídas, pendentes, rejeitadas) e tipo (crédito/débito).
- **Métricas Económicas:**
    - **Total de Valcoins (VC):** Soma dos VC em todas as carteiras e os VC gastos.
    - **Taxa de Câmbio:** Valor de 1 VC em Euros, tanto a taxa fixa como uma taxa dinâmica calculada com base nas receitas da escola.
    - **Receitas da Escola:** Total de receitas registadas no sistema.
- **Métricas de Legado:** Pontos de legado totais e crescimento mensal, refletindo as contribuições mais valiosas dos alunos.

### 1.2. Configuração da Economia

A principal responsabilidade do Admin é modelar a economia da Aurora.

#### 1.2.1. Gestão de Regras de Transação
As "Transaction Rules" são o motor da economia. O Admin pode criar, editar e desativar regras que definem como os Valcoins são ganhos e gastos. Cada regra pode ter:
- **Nome e Valor:** Ex: "Participação na Aula", +10 VC.
- **Permissões:** Quem pode iniciar e quem pode receber a transação (e.g., Professor -> Aluno).
- **Limites:** Restrições de utilização por período (mensal, anual) e por disciplina.
- **Categoria:** Uma categoria especial é **"Legado"**. Transações com esta categoria são registadas permanentemente no perfil do aluno, significando uma contribuição de grande valor.
- **Requisitos:** Pode exigir um ano de escolaridade mínimo/máximo para a sua aplicação.

#### 1.2.2. Produtos Financeiros
O Admin cria os produtos financeiros que os alunos (Valteens) podem subscrever:
- **Produtos de Poupança:** Define contas poupança com prazo (em meses), taxa de juro, e depósitos mínimos/máximos.
- **Produtos de Crédito:** Define as condições dos micro-empréstimos, como o montante máximo, prazo de pagamento e taxas de juro associadas.

#### 1.2.3. Configurações Gerais do Sistema
- **Utilizadores Especiais:** Designar contas de sistema cruciais, como o `ivaDestinationUserId` (para onde vai o IVA das transações) e o `interestSourceUserId` (a conta que financia os juros das poupanças).

#### 1.2.4. Gestão Fiscal e de Produtos
Para simular uma economia real, o Admin gere um sistema fiscal e de categorização de produtos:
- **Taxas de IVA:** O sistema permite a configuração de múltiplas taxas de IVA (e.g., Normal, Reduzida, Isenta). Cada produto ou serviço na loja é associado a uma destas taxas.
- **Categorias de Produtos:** O Admin pode criar categorias para os produtos da loja (e.g., "Material Escolar", "Alimentação", "Bilhetes"). Estas categorias têm um propósito de literacia fiscal:
    - **Dedução Fiscal:** Uma categoria pode ser marcada como `is_deductible`, permitindo que uma parte ou a totalidade do valor gasto em produtos dessa categoria possa ser "deduzida" da coleta de impostos, ensinando na prática como funcionam os benefícios fiscais.



### 1.3. Gestão da Comunidade

#### 1.3.1. Gestão de Casas (Houses)
As "Houses" são comunidades dentro da escola (semelhante às casas de Hogwarts), fomentando a colaboração e competição saudável.
- **Criação:** O Admin cria as casas, definindo nome, cor, logo e descrição.
- **Atribuição:** Associa um Professor como "Chefe de Casa" e pode nomear um Aluno como "Líder".
- **Gestão de Membros:** Adiciona e remove alunos das casas.
- **Supervisão:** O dashboard de cada casa mostra estatísticas agregadas: saldo total dos membros, dívida total, e a percentagem de membros com contas poupança ativas.

#### 1.3.2. Gestão de Utilizadores e Matrículas
- **Importação em Massa:** Para além da criação manual, o Admin pode carregar ficheiros (e.g., CSV) para criar em massa utilizadores (alunos, professores), disciplinas, e realizar matrículas em turmas e inscrições em disciplinas, utilizando listas de serviços letivos da escola.
- **Aprovação de Empréstimos:** Avalia e aprova ou rejeita os pedidos de micro-empréstimos feitos pelos alunos.

### 1.4. Processos Automáticos (Cron Jobs)
O sistema Aurora executa uma série de processos automáticos para garantir o bom funcionamento da economia e a aplicação de regras financeiras de forma consistente.

#### 1.4.1. Pagamento de Juros de Poupança
- **Objetivo:** Recompensar os alunos que poupam.
- **Funcionamento:** Executado diariamente, este processo calcula e deposita os juros nas contas poupança ativas dos alunos.
- **Lógica:** O cálculo baseia-se na taxa de juro e no período de pagamento (diário, semanal, mensal, etc.) definidos no produto de poupança subscrito pelo aluno.
- **Origem dos Fundos:** O montante dos juros é transferido da conta de sistema `interestSourceUserId`.

#### 1.4.2. Pagamento de Empréstimos e Juros
- **Objetivo:** Garantir que os empréstimos são pagos de acordo com as condições.
- **Funcionamento:** Executado diariamente, este processo debita as prestações e os juros das contas dos alunos com empréstimos ativos.
- **Lógica:** O sistema calcula os juros sobre o capital em dívida e, no dia de pagamento, debita a prestação (capital + juros) da conta do aluno.
- **Destino dos Fundos:** O montante pago é transferido para a conta de sistema `interestSourceUserId`.

#### 1.4.3. Pagamento de Salário aos Professores
- **Objetivo:** Compensar os professores pela sua participação na dinamização da economia.
- **Funcionamento:** É executado no dia do mês definido pelo administrador.
- **Lógica:** O sistema calcula o salário de cada professor com base no número de alunos que tem nas suas disciplinas. O valor por aluno é configurável.
- **Configuração:**
    - `professorSalaryEnabled`: Ativa ou desativa o pagamento de salários.
    - `professorSalaryDay`: O dia do mês em que o pagamento é efetuado.
    - `professorSalaryAmountPerStudent`: O valor em Valcoins que cada aluno "gera" para o salário dos seus professores.

#### 1.4.4. Taxa de Penalização por Inatividade
- **Objetivo:** Manter a economia dinâmica e garantir que os Valcoins circulam.
- **Funcionamento:** Um processo automático é executado diariamente (à 1h da manhã).
- **Condições:** A taxa é aplicada a todos os alunos (`ALUNO`) que estejam marcados como `ativos` no sistema, mas cuja data da última atividade (`last_activity_date`) seja superior a 30 dias.
- **Cálculo:** A taxa corresponde a uma percentagem do saldo atual do aluno.
- **Configuração:**
    - `inactivityFeePercentage`: A percentagem a ser aplicada como taxa. Se não estiver definida ou for zero, a funcionalidade é desativada.
    - `ivaDestinationUserId`: O ID do utilizador que receberá o valor cobrado pela taxa.
- **Execução:** O valor é deduzido do saldo do aluno inativo e transferido para a conta do `ivaDestinationUserId`. A data da última atividade do aluno é então atualizada.

---

## 2. Professor

O Professor é o principal agente de dinamização da economia Aurora no dia-a-dia, utilizando as regras criadas pelo Admin para interagir com os alunos.

### Principais Funcionalidades

- **Atribuir Valcoins:** Utiliza as "Transaction Rules" pré-definidas para atribuir Valcoins aos alunos.
- **Atribuir Pontos de Legado:** Ao usar uma regra da categoria "Legado", o professor confere uma honra especial ao aluno.
- **Gestão de Turmas:** Visualiza os alunos das suas turmas e o seu progresso individual.
- **Chefe de Casa (se aplicável):** Se for designado Chefe de uma Casa, tem acesso ao dashboard dessa casa.
- **Acompanhamento:** Pode consultar o histórico de transações, o saldo, as poupanças e os empréstimos dos seus alunos.
- **Validação de Bilhetes:** Pode usar a interface de validação para marcar bilhetes de eventos como "utilizados".

---

## 3. Aluno

O Aluno interage com o ecossistema Aurora para aprender a gerir as suas finanças pessoais de forma prática e motivadora.

### 3.1. Valkid (Alunos mais novos)

A interface é simples e visual, focada em conceitos básicos: consulta de saldo, histórico de conquistas e uma loja de recompensas simples.

### 3.2. Valteen (Alunos mais velhos)

A plataforma oferece um conjunto robusto de ferramentas de literacia financeira.

#### 3.2.1. A Tua Conta
- **Dashboard Pessoal:** Um resumo da sua vida financeira: saldo, histórico, poupanças e empréstimos.
- **O Teu Legado:** Uma secção especial no perfil que exibe todas as distinções da categoria "Legado" que recebeu.

#### 3.2.2. Funcionalidades Financeiras
- **Contas Poupança:** Pode subscrever produtos de poupança, depositar Valcoins e acompanhar o crescimento com juros.
- **Micro-Empréstimos:** Pode solicitar um empréstimo, justificando o pedido, e tem a responsabilidade de o pagar.

#### 3.2.3. Vida em Comunidade
- **A Minha Casa (House):** Pertence a uma casa, colabora com colegas e acompanha o ranking e estatísticas do grupo.

---

## 4. A Loja Aurora: Um Mercado de Empreendedorismo e Aprendizagem

A loja é o coração pulsante da economia Aurora. Mais do que um simples mercado, é uma plataforma de micro-empreendedorismo onde qualquer membro da comunidade escolar pode criar, vender e comprar produtos e serviços, transformando talentos e bens em valor.

### 4.1. Objetivos Pedagógicos
- **Empreendedorismo na Prática:** A loja capacita os alunos a tornarem-se pequenos empreendedores. Ao permitir que vendam os seus próprios produtos e serviços, a plataforma ensina na prática os conceitos de oferta e procura, marketing, fixação de preços e gestão de um pequeno negócio.
- **Valorização do Talento e do Trabalho:** Alunos podem monetizar as suas competências e talentos, seja através da venda de um poema, de uma peça de artesanato, ou oferecendo serviços como mentoria a colegas mais novos ou apoio tutorial numa disciplina que dominam.
- **Economia Circular:** A plataforma incentiva a venda de produtos em segunda mão, como livros ou roupa, promovendo a sustentabilidade e ensinando o valor de prolongar a vida útil dos bens.
- **Literacia Financeira Aplicada:** Para além dos conceitos já mencionados, a loja solidifica a aprendizagem sobre orçamentação, o impacto dos impostos (IVA) no preço final e a tomada de decisões de consumo e de negócio.

### 4.2. Funcionamento
- **Qualquer Membro é um Vendedor:** Qualquer utilizador autenticado (aluno ou professor) pode tornar-se um vendedor. Através de um formulário simples, pode colocar à venda:
    - **Produtos Físicos:** Itens produzidos pelo aluno (artesanato, desenhos), bens em segunda mão (livros, roupa), etc.
    - **Serviços:** Tempo e conhecimento, como sessões de tutoria, mentoria, workshops, etc.
- **Criação de Produtos:** Ao criar um produto, o vendedor define o nome, a descrição, o preço em Valcoins, a quantidade em stock (se aplicável), a categoria e a taxa de IVA (escolhendo das taxas pré-definidas pelo Admin).
- **Compra e Venda:** Um aluno que navega na loja pode comprar qualquer produto ou serviço. O sistema transfere automaticamente os Valcoins (preço + IVA) da conta do comprador para a conta do vendedor, garantindo a transação.

---

## 5. Sistema de Bilhética Digital P2P (Peer-to-Peer)

O sistema de bilhética é uma extensão natural da loja, permitindo que qualquer membro da comunidade possa criar e gerir os seus próprios eventos.

### 5.1. Criação Descentralizada de Eventos
- **Qualquer Membro é um Promotor:** Qualquer aluno ou professor pode organizar um evento (um workshop de programação, um recital de poesia, um torneio de xadrez, uma festa) e vender os bilhetes através da plataforma.
- **Produto-Bilhete:** Para tal, o utilizador cria um novo produto na loja, define as suas características (preço, número de bilhetes disponíveis) e marca-o especificamente como sendo um "bilhete" (`is_ticket`).
- **Compra Segura:** Quando outro utilizador compra este produto, o sistema gera uma entrada única e pessoal na base de dados – o bilhete digital – associada ao comprador.

### 5.2. Utilização e Validação
- **Download do Bilhete:** O comprador pode descarregar um ficheiro PDF que contém os detalhes do evento e um QR Code único, gerado pelo sistema.
- **Validação pelo Promotor:** No dia do evento, o próprio organizador (o aluno ou professor que criou o evento) ou alguém por ele designado, utiliza a interface de validação:
    1.  Acede à página de validação.
    2.  Escaneia o QR Code do bilhete.
    3.  O sistema verifica a sua validade e autenticidade.
- **Marcação como "Utilizado":** Após a validação, o promotor marca o bilhete como "utilizado", invalidando-o para prevenir fraudes.
- **Gestão pelo Promotor:** O criador do evento tem acesso a um painel onde pode ver todos os bilhetes que vendeu, quem comprou, e o estado de cada um (válido ou utilizado), permitindo uma gestão autónoma e completa do seu evento.

---

## 6. Arquitetura e Instalação

Esta secção detalha a arquitetura técnica da plataforma Aurora, as tecnologias utilizadas, os requisitos de hardware e o processo de instalação.

### 6.1. Arquitetura da Plataforma

A plataforma Aurora é construída sobre uma arquitetura de microserviços, orquestrada com Docker e Docker Compose. Esta abordagem garante a modularidade, escalabilidade e facilidade de manutenção de cada componente do sistema.

A arquitetura é composta pelos seguintes serviços:

- **`valcoin-admin-server`**: O backend da aplicação de administração, responsável pela lógica de negócio, gestão de utilizadores, e configurações da economia.
- **`valcoin-admin-client`**: A interface de frontend (React) para os administradores e professores (Aurora Admin).
- **`valcoin-store-server`**: O backend da loja Valcoin, que gere os produtos, as transações da loja e o sistema de bilhética.
- **`valcoin-store-client`**: A interface de frontend (React) para a loja (Aurora Store), utilizada por todos os membros da comunidade.
- **`postgres`**: A base de dados PostgreSQL, que armazena toda a informação persistente da plataforma.
- **`redis`**: Um servidor Redis utilizado para caching, otimizando o desempenho de queries frequentes.
- **`nginx`**: Atua como um reverse proxy, direcionando o tráfego para os diferentes serviços (admin e loja) com base no URL.
- **`pgadmin`**: Uma interface web para a gestão e administração da base de dados PostgreSQL.
- **`watchtower`**: Um serviço que monitoriza e atualiza automaticamente as imagens Docker dos serviços para as suas versões mais recentes.

Todos os serviços comunicam entre si através de uma rede Docker privada, garantindo um ambiente seguro e isolado.

### 6.2. Tecnologias Utilizadas

- **Backend:**
  - **Node.js** com o framework **Express.js** para a construção das APIs REST.
- **Frontend:**
  - **React.js** para a criação de interfaces de utilizador dinâmicas e reativas.
- **Base de Dados:**
  - **PostgreSQL 13** como sistema de gestão de base de dados relacional.
- **Caching:**
  - **Redis 6.2** para armazenamento em memória de dados temporários.
- **Servidor Web / Reverse Proxy:**
  - **Nginx** para gerir o tráfego HTTP e servir as aplicações.
- **Containerização:**
  - **Docker** e **Docker Compose** para a gestão do ciclo de vida dos contentores.

### 6.3. Requisitos de Hardware

Os seguintes requisitos são recomendações para um ambiente de produção. Podem variar com base no número de utilizadores e na intensidade de utilização.

- **Servidor:**
  - **Sistema Operativo:** Linux (recomendado Ubuntu 20.04 ou superior).
  - **CPU:** 2 cores ou mais.
  - **RAM:** Mínimo de 4 GB. Recomendado 8 GB para um desempenho ótimo.
  - **Armazenamento:** 20 GB de espaço livre em disco.
- **Cliente (Utilizador Final):**
  - Qualquer browser moderno como Google Chrome, Mozilla Firefox, Safari ou Microsoft Edge.

### 6.4. Processo de Instalação

A instalação da plataforma é realizada através do Docker Compose, o que simplifica o processo.

1.  **Pré-requisitos:**
    - Ter o **Git**, **Docker** e **Docker Compose** instalados no servidor.

2.  **Clonar o Repositório:**
    ```bash
    git clone <URL_DO_REPOSITORIO>
    cd <NOME_DA_PASTA_DO_PROJETO>
    ```

3.  **Configuração do Ambiente:**
    - Crie um ficheiro `.env.admin` na raiz do projeto. Este ficheiro deve conter as variáveis de ambiente necessárias, como por exemplo o segredo para os tokens JWT:
      ```
      JWT_SECRET=o-seu-segredo-super-secreto
      ```
    - Reveja o ficheiro `docker-compose.yml` para ajustar configurações, como as portas expostas, se necessário.

4.  **Iniciar a Plataforma:**
    - O `docker-compose.yml` está configurado para utilizar o ficheiro `schema.sql` para criar a estrutura inicial da base de dados automaticamente no primeiro arranque.
    - Execute o seguinte comando para iniciar todos os serviços em background:
      ```bash
      docker-compose up -d
      ```

5.  **Povoamento Inicial da Base de Dados:**
    - Após os contentores estarem a correr, é necessário povoar a base de dados com os dados iniciais (professores, alunos, disciplinas). Para tal, existem três scripts Python na raiz do projeto.
    - Certifique-se que tem o Python 3 e a biblioteca `psycopg2-binary` e `bcrypt` instalados na sua máquina local (`pip install psycopg2-binary bcrypt`).
    - Execute os scripts pela seguinte ordem:
      ```bash
      python3 inserir_professores.py
      python3 matricular_alunos.py
      python3 atribuir_disciplinas.py
      ```
    - **Nota:** Estes scripts assumem que os ficheiros CSV (`profs.csv`, `alunos_rita.csv`, `cts.csv`) se encontram na pasta `dados/`.

Após estes passos, a plataforma Aurora estará instalada e acessível através do endereço IP ou nome de domínio do servidor.