# Documentação da API da Plataforma Aurora

## 1. Visão Geral

A plataforma Aurora é um sistema de economia virtual desenhado para um ambiente educacional. O seu propósito é simular um sistema financeiro real, permitindo que alunos, professores e administradores interajam através de uma moeda digital, o "Valcoin".

A plataforma divide-se em duas componentes principais:

1.  **Aurora Admin (O Banco):** Uma aplicação de back-office (servidor e painel de administração) que funciona como o "banco central". Permite a gestão completa de utilizadores (alunos, professores, administradores), turmas, disciplinas, transações, regras de negócio, produtos financeiros (poupanças, créditos) e a visualização de dashboards com métricas vitais.
2.  **Aurora Store (A Loja):** Uma aplicação completa com frontend e backend que representa o "mercado". Aqui, os utilizadores podem gastar os seus Valcoins para comprar produtos e serviços (incluindo bilhetes para eventos) listados por outros utilizadores.

Este documento detalha todos os endpoints da API para ambas as componentes.

---

## 2. Aurora Admin API (`valcoin-admin/valcoin_server.js`)

Este servidor gere toda a lógica de negócio, utilizadores e transações.

### 2.1. Autenticação

| Método | Endpoint | Descrição | Autenticação |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/login` | Autentica um utilizador e retorna um token JWT juntamente com os dados do utilizador. | N/A |
| `GET` | `/api/user` | Retorna os dados do utilizador atualmente autenticado. | Qualquer Utilizador Autenticado |

### 2.2. Dashboard

| Método | Endpoint | Descrição | Autenticação |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/dashboard` | Retorna as principais métricas da plataforma para o dashboard de administração. | Admin / Professor |

### 2.3. Utilizadores (Users)

| Método | Endpoint | Descrição | Autenticação |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/users` | Lista todos os utilizadores do sistema. | Admin / Professor |
| `GET` | `/api/users/:id` | Obtém os detalhes de um utilizador específico. | Qualquer Utilizador Autenticado |
| `POST` | `/api/users` | Cria um novo utilizador. | Admin / Professor |
| `PUT` | `/api/users/:id` | Atualiza os dados de um utilizador existente. | Admin / Professor |
| `PUT` | `/api/admin/users/:id/password` | Atualiza a password de um utilizador. | Apenas Admin |
| `DELETE` | `/api/users/:id` | Remove um utilizador do sistema. | Admin / Professor |
| `GET` | `/api/unassigned-students` | Lista todos os alunos que não estão associados a uma turma. | Qualquer Utilizador Autenticado |

### 2.4. Transações (Transactions)

| Método | Endpoint | Descrição | Autenticação |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/transactions` | Lista todas as transações com filtros. | Admin / Professor |
| `GET` | `/api/transactions/:id` | Obtém os detalhes de uma transação específica. | Admin / Professor |
| `GET` | `/api/transactions/group/:groupId` | Obtém um grupo de transações (ex: salário de professores). | Admin / Professor |
| `POST` | `/api/transactions` | Cria uma nova transação manual (ex: bónus, multa). | Admin / Professor |
| `PUT` | `/api/transactions/:id` | Atualiza uma transação pendente. | Admin / Professor |
| `DELETE` | `/api/transactions/:id` | Remove uma transação. | Admin / Professor |
| `PATCH` | `/api/transactions/:id/approve` | Aprova uma transação pendente. | Admin / Professor |
| `PATCH` | `/api/transactions/:id/reject` | Rejeita uma transação pendente. | Admin / Professor |

### 2.5. Endpoints de Professores

| Método | Endpoint | Descrição | Autenticação |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/professor/dashboard` | Retorna os dados para o dashboard do professor. | Professor |
| `POST` | `/api/professor/transactions` | Cria uma transação iniciada por um professor (ex: prémio em aula). | Professor |
| `GET` | `/api/professor/tap-rules` | Obtém as regras de transação rápida ("Tap") disponíveis para o professor. | Professor |
| `POST` | `/api/professor/tap-transactions` | Executa uma transação rápida ("Tap") de um professor para um aluno. | Professor |
| `GET` | `/api/professor/student-transaction-history` | Obtém o histórico de transações de um aluno específico. | Professor |
| `POST` | `/api/professor/check-rule-applicability` | Verifica se uma regra de transação pode ser aplicada. | Professor |

### 2.6. Endpoints de Alunos

| Método | Endpoint | Descrição | Autenticação |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/student/dashboard` | Retorna os dados para o dashboard do aluno. | Aluno |
| `POST` | `/api/student/manual-payment` | Permite a um aluno pagar a outro utilizador (aluno ou professor). | Aluno |
| `GET` | `/api/student/payable-users` | Lista os utilizadores a quem o aluno pode fazer pagamentos. | Aluno |
| `GET` | `/api/student/settings` | Obtém as configurações específicas do aluno. | Aluno |
| `GET` | `/api/student/transaction-rules` | Lista as regras de transação disponíveis para o aluno. | Aluno |
| `POST` | `/api/student/transaction-rules/apply` | Permite que um aluno aplique uma regra de transação (ex: converter item). | Aluno |
| `GET` | `/api/student/legado-history` | Retorna o histórico de "Legado" (conquistas) do aluno. | Aluno |

### 2.7. Produtos Financeiros (Poupança e Crédito)

| Método | Endpoint | Descrição | Autenticação |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/savings-products` | Lista os produtos de poupança disponíveis. | Qualquer Utilizador Autenticado |
| `POST` | `/api/savings-products` | Cria um novo produto de poupança. | Admin / Professor |
| `PUT` | `/api/savings-products/:id` | Atualiza um produto de poupança. | Admin / Professor |
| `DELETE` | `/api/savings-products/:id` | Remove um produto de poupança. | Admin / Professor |
| `GET` | `/api/student/savings-accounts` | Lista as contas de poupança de um aluno. | Aluno |
| `POST` | `/api/student/savings-accounts` | Permite a um aluno subscrever um produto de poupança. | Aluno |
| `GET` | `/api/credit-products` | Lista os produtos de crédito (empréstimos) disponíveis. | Qualquer Utilizador Autenticado |
| `POST` | `/api/credit-products` | Cria um novo produto de crédito. | Admin / Professor |
| `PUT` | `/api/credit-products/:id` | Atualiza um produto de crédito. | Admin / Professor |
| `DELETE` | `/api/credit-products/:id` | Remove um produto de crédito. | Admin / Professor |
| `POST` | `/api/student/loans` | Permite a um aluno pedir um empréstimo. | Aluno |
| `GET` | `/api/student/loans/my-loans` | Lista os empréstimos de um aluno. | Aluno |
| `POST` | `/api/student/loans/:id/repay` | Permite a um aluno amortizar um empréstimo. | Aluno |
| `GET` | `/api/student/loans` | (Admin) Lista todos os pedidos de empréstimo. | Admin / Professor |
| `PATCH` | `/api/student/loans/:id/approve` | (Admin) Aprova um pedido de empréstimo. | Admin / Professor |
| `PATCH` | `/api/student/loans/:id/reject` | (Admin) Rejeita um pedido de empréstimo. | Admin / Professor |

### 2.8. Gestão Académica

| Método | Endpoint | Descrição | Autenticação |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/subjects` | Lista todas as disciplinas. | Admin / Professor |
| `POST` | `/api/subjects` | Cria uma nova disciplina. | Admin / Professor |
| `PUT` | `/api/subjects/:id` | Atualiza uma disciplina. | Admin / Professor |
| `DELETE` | `/api/subjects/:id` | Desativa uma disciplina (soft delete). | Admin / Professor |
| `GET` | `/api/classes` | Lista todas as turmas. | Qualquer Utilizador Autenticado |
| `POST` | `/api/classes` | Cria uma nova turma. | Admin / Professor |
| `PUT` | `/api/classes/:id` | Atualiza uma turma. | Admin / Professor |
| `DELETE` | `/api/classes/:id` | Remove uma turma. | Admin / Professor |
| `GET` | `/api/classes/:id/students` | Lista os alunos de uma turma específica. | Aluno (para ver a sua turma) |
| `GET` | `/api/enrollments` | Lista todas as matrículas de alunos em disciplinas. | Admin / Professor |
| `POST` | `/api/enrollments` | Cria uma nova matrícula. | Admin / Professor |
| `GET` | `/api/admin/ciclos` | Lista todos os ciclos de ensino. | Admin / Professor |
| `POST` | `/api/admin/ciclos` | Cria um novo ciclo de ensino. | Admin / Professor |
| `GET` | `/api/aluno_turma` | Associações de alunos a turmas. | Admin / Professor |
| `POST` | `/api/aluno_turma` | Cria uma nova associação aluno-turma. | Admin / Professor |

### 2.9. Casas (Houses)

| Método | Endpoint | Descrição | Autenticação |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/houses` | Lista todas as casas. | Qualquer Utilizador Autenticado |
| `POST` | `/api/houses` | Cria uma nova casa. | Apenas Admin |
| `GET` | `/api/my-house` | Obtém detalhes da casa do utilizador autenticado. | Qualquer Utilizador Autenticado |
| `GET` | `/api/houses/available-students` | Lista alunos disponíveis para se juntarem a uma casa. | Qualquer Utilizador Autenticado |
| `GET` | `/api/houses/:id` | Obtém detalhes de uma casa específica. | Qualquer Utilizador Autenticado |
| `PUT` | `/api/houses/:id` | Atualiza os dados de uma casa (líder ou admin). | Líder da Casa / Admin |
| `POST` | `/api/houses/:id/members` | Adiciona ou remove membros de uma casa (líder ou admin). | Líder da Casa / Admin |
| `DELETE` | `/api/houses/:id` | Remove uma casa. | Apenas Admin |
| `GET` | `/api/student/house-history` | Retorna o histórico de um aluno nas casas. | Aluno |

### 2.10. Configurações e Regras

| Método | Endpoint | Descrição | Autenticação |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/settings` | Obtém as configurações globais da plataforma. | Qualquer Utilizador Autenticado |
| `PUT` | `/api/settings` | Atualiza as configurações globais. | Admin / Professor |
| `GET` | `/api/transactionRules` | Lista todas as regras de transação. | Admin / Professor |
| `POST` | `/api/transactionRules` | Cria uma nova regra de transação. | Admin / Professor |
| `PUT` | `/api/transactionRules/:id` | Atualiza uma regra de transação. | Admin / Professor |
| `DELETE` | `/api/transactionRules/:id` | Remove uma regra de transação. | Admin / Professor |
| `POST` | `/api/transaction-rules/apply` | Aplica uma regra de transação (Admin). | Admin / Professor |

---

## 3. Aurora Store API (`valcoin-store/server/store_server.js`)

Este servidor gere a loja, incluindo produtos, compras e categorias. Funciona como um proxy para o `aurora-admin` para autenticação e transações monetárias.

### 3.1. Saúde e Autenticação

| Método | Endpoint | Descrição | Autenticação |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | Verifica o estado do servidor da loja e das suas dependências (BD, Redis). | N/A |
| `POST` | `/login` | Faz proxy do pedido de login para o servidor de administração. | N/A |
| `GET` | `/users/:id` | Faz proxy para obter dados públicos de um utilizador do servidor admin. | Utilizador Autenticado |

### 3.2. Produtos

| Método | Endpoint | Descrição | Autenticação |
| :--- | :--- | :--- | :--- |
| `GET` | `/products` | Lista todos os produtos ativos, com filtros por categoria e pesquisa. | N/A |
| `GET` | `/products/most-sold` | Lista os produtos mais vendidos. | N/A |
| `GET` | `/products/my-purchases` | Lista os produtos comprados pelo utilizador autenticado. | Utilizador Autenticado |
| `GET` | `/products/my-sales` | Lista os produtos vendidos pelo utilizador autenticado. | Utilizador Autenticado |
| `GET` | `/products/:id` | Obtém os detalhes de um produto específico. | N/A |
| `POST` | `/products` | Cria um novo produto para venda na loja. | Utilizador Autenticado |
| `PUT` | `/products/:id` | Atualiza um produto. Apenas o vendedor pode atualizar. | Utilizador Autenticado (Vendedor) |
| `DELETE` | `/products/:id` | Desativa um produto (soft delete). Apenas o vendedor pode desativar. | Utilizador Autenticado (Vendedor) |
| `POST` | `/products/:id/feedback` | Permite a um comprador deixar feedback num produto. | Utilizador Autenticado (Comprador) |

### 3.3. Compras

| Método | Endpoint | Descrição | Autenticação |
| :--- | :--- | :--- | :--- |
| `POST` | `/buy` | Realiza a compra de um produto. O servidor comunica com a API Admin para fazer a transação de Valcoins. | Utilizador Autenticado |

### 3.4. Bilhetes (Tickets)

| Método | Endpoint | Descrição | Autenticação |
| :--- | :--- | :--- | :--- |
| `GET` | `/products/:id/ticket-pdf` | Gera e descarrega um PDF do bilhete para um produto do tipo "ticket" que o utilizador comprou. | Utilizador Autenticado (Comprador) |
| `GET` | `/validate-ticket/:ticketId` | Endpoint público para validar um bilhete através do seu ID (usado pelo QR code). | N/A |
| `GET` | `/admin/tickets` | Lista todos os bilhetes emitidos para os produtos de um vendedor. | Utilizador Autenticado (Vendedor) |
| `POST` | `/use-ticket/:ticketId` | Marca um bilhete como utilizado. | Utilizador Autenticado (Vendedor/Professor) |

### 3.5. Categorias

| Método | Endpoint | Descrição | Autenticação |
| :--- | :--- | :--- | :--- |
| `GET` | `/categories` | Lista todas as categorias de produtos disponíveis. | N/A |
