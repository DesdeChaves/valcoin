import {
  Users,
  Coins,
  BookOpen,
  GraduationCap,
  TrendingUp,
  Settings,
  Award,
  UserPlus, Zap, DollarSign,
} from 'lucide-react';

export const mockData = {
  users: [
    {
      id: '1e4f2a3b-4c5d-6e7f-8a9b-0c1d2e3f4a5b',
      numero_mecanografico: '2024001',
      nome: 'João Silva',
      email: 'joao@valpacos.edu.pt',
      password_hash: '$2a$10$...hashedpassword...',
      tipo_utilizador: 'ALUNO',
      ativo: true,
      data_criacao: '2024-07-08T10:00:00Z',
      data_atualizacao: '2024-07-08T10:00:00Z',
      ultimo_login: null,
      consentimento_rgpd: true,
      data_consentimento_rgpd: '2024-07-08T10:00:00Z',
    },
    {
      id: '2b3c4d5e-6f7a-8b9c-0d1e-2f3a4b5c6d7e',
      numero_mecanografico: '2024002',
      nome: 'Maria Santos',
      email: 'maria@valpacos.edu.pt',
      password_hash: '$2a$10$...hashedpassword...',
      tipo_utilizador: 'PROFESSOR',
      ativo: true,
      data_criacao: '2024-07-08T10:00:00Z',
      data_atualizacao: '2024-07-08T10:00:00Z',
      ultimo_login: '2024-07-08T12:00:00Z',
      consentimento_rgpd: true,
      data_consentimento_rgpd: '2024-07-08T10:00:00Z',
    },
    {
      id: '3c4d5e6f-7a8b-9c0d-1e2f-3a4b5c6d7e8f',
      numero_mecanografico: '2024003',
      nome: 'Ana Costa',
      email: 'ana@valpacos.edu.pt',
      password_hash: '$2a$10$...hashedpassword...',
      tipo_utilizador: 'ALUNO',
      ativo: true,
      data_criacao: '2024-07-08T10:00:00Z',
      data_atualizacao: '2024-07-08T10:00:00Z',
      ultimo_login: null,
      consentimento_rgpd: true,
      data_consentimento_rgpd: '2024-07-08T10:00:00Z',
    },
    {
      id: '4d5e6f7a-8b9c-0d1e-2f3a-4b5c6d7e8f9a',
      numero_mecanografico: '2024004',
      nome: 'Pedro Almeida',
      email: 'pedro@valpacos.edu.pt',
      password_hash: '$2a$10$...hashedpassword...',
      tipo_utilizador: 'ALUNO',
      ativo: true,
      data_criacao: '2024-07-10T10:00:00Z',
      data_atualizacao: '2024-07-10T10:00:00Z',
      ultimo_login: null,
      consentimento_rgpd: true,
      data_consentimento_rgpd: '2024-07-10T10:00:00Z',
    },
  ],
  ciclos_ensino: [
    { id: 'ciclo1-uuid-1234', nome: 'Básico' },
    { id: 'ciclo2-uuid-5678', nome: 'Secundário' },
  ],
  classes: [
    {
      id: 'c1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c',
      codigo: '10A',
      nome: '10º A',
      ano_letivo: '2024/2025',
      ciclo_id: 'ciclo2-uuid-5678',
      diretor_turma_id: '2b3c4d5e-6f7a-8b9c-0d1e-2f3a4b5c6d7e',
      numero_alunos: 2,
      ativo: true,
      data_criacao: '2024-07-08T10:00:00Z',
    },
  ],
  enrollments: [
    {
      id: '1e4f2a3b-4c5d-6e7f-8a9b-0c1d2e3f4a5b',
      numero_aluno_na_turma: '2024-10A-001',
      turma_id: 'c1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c',
      data_matricula: '2024-07-08T10:00:00Z',
    },
    {
      id: '3c4d5e6f-7a8b-9c0d-1e2f-3a4b5c6d7e8f',
      numero_aluno_na_turma: '2024-10A-002',
      turma_id: 'c1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c',
      data_matricula: '2024-07-08T10:00:00Z',
    },
  ],
  transactions: [
    {
      id: 't1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c',
      user_id: '1e4f2a3b-4c5d-6e7f-8a9b-0c1d2e3f4a5b',
      amount: 100,
      type: 'CREDIT',
      description: 'Participação em aula',
      date: '2024-07-08T10:00:00Z',
    },
  ],
  subjects: [
    {
      id: 's1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c',
      nome: 'Matemática',
      codigo: 'MAT',
      ativo: true,
    },
  ],
  criteria: [
    {
      id: 'cr1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c',
      nome: 'Participação',
      valor: 50,
      ativo: true,
    },
  ],
  aluno_disciplina: [
    // Example entry
    {
      id: 'ad1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c',
      aluno_id: '1e4f2a3b-4c5d-6e7f-8a9b-0c1d2e3f4a5b', // João Silva
      disciplina_id: 's1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c', // Matemática
      ano_letivo: '2024/2025',
      ativo: true,
    },
  ],
  disciplina_turma: [
    // Example entry
    {
      id: 'dt1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c',
      disciplina_id: 's1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c', // Matemática
      turma_id: 'c1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c', // 10º A
      ano_letivo: '2024/2025',
      ativo: true,
      data_criacao: '2024-07-08T10:00:00Z',
    },
  ],
  professor_disciplina_turma: [
    // Example entry
    {
      id: 'pdt1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c',
      professor_id: '2b3c4d5e-6f7a-8b9c-0d1e-2f3a4b5c6d7e', // Maria Santos
      disciplina_id: 's1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c', // Matemática
      turma_id: 'c1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c', // 10º A
      ano_letivo: '2024/2025',
      ativo: true,
    },
  ],
  settings: {
    sistemaAtivo: true,
    fasePiloto: true,
    limiteAcumulacao: 100,
    taxaIRS: 15,
    taxasIVA: {
      isento: 0,
      tipo1: 5,
      tipo2: 12,
      tipo3: 23,
    },
    isencao1Ciclo: true,
    plafondBaseMensal: 1000,
    taxaInatividade: 2,
  },
};

export const dashboardStats = {
  totalUsers: 1247,
  totalTransactions: 5689,
  totalVC: 12340.5,
  activeWallets: 1156,
  pendingTransactions: 23,
  monthlyGrowth: 15.3,
};

export const tabs = [
  { id: 'dashboard', label: 'Dashboard', icon: TrendingUp },
  { id: 'users', label: 'Utilizadores', icon: Users },
  { id: 'transactions', label: 'Transações', icon: Coins },
  { id: 'subjects', label: 'Disciplinas', icon: BookOpen },
  { id: 'classes', label: 'Turmas', icon: GraduationCap },
  { id: 'enrollments', label: 'Matrículas', icon: UserPlus },
  { id: 'tapTransactions', label: 'TAP Rápido', icon: Zap }, // Nova aba
  {
    id: 'transaction-rules',
    label: 'Regras de Transação',
    icon: Settings,
  },
  {
    id: 'school-revenues',
    label: 'Receitas Próprias',
    icon: DollarSign,
  },
  {
    id: 'settings',
    label: 'Definições',
    icon: Settings,
  },
];
