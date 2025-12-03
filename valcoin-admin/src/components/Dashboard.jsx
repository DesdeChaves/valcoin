import React from 'react';
import { TrendingUp, Users, Coins, Wallet, AlertCircle, Info, Clock, CheckCircle, BookOpen, Euro, Settings } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import ValCoinIcon from './icons/ValCoinIcon';

const Dashboard = ({ metrics = null, isLoading = false, error = null }) => {
  console.log('🔄 Dashboard: Props received:', {
    hasMetrics: !!metrics,
    metricsType: typeof metrics,
    isLoading,
    error: !!error,
    metricsRaw: metrics,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-800">Dashboard</h2>
          <div className="text-sm text-gray-500 animate-pulse">Carregando...</div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <div className="flex items-center space-x-3">
            <Info className="w-5 h-5 text-blue-600 animate-spin" />
            <p className="text-blue-800">Carregando dados do dashboard...</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="bg-white p-6 rounded-xl shadow-sm animate-pulse border border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded mb-3"></div>
                  <div className="h-8 bg-gray-200 rounded mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </div>
                <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-800">Dashboard</h2>
          <div className="text-sm text-red-500">❌ Erro no carregamento</div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <div className="flex items-center space-x-3">
            <AlertCircle className="w-6 h-6 text-red-600" />
            <div className="flex-1">
              <h3 className="text-red-800 font-medium">Erro ao carregar dados</h3>
              <p className="text-red-600 text-sm mt-1">{error}</p>
            </div>
          </div>
          <div className="mt-4 text-sm text-red-600">
            <p><strong>Possíveis soluções:</strong></p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Verifique se o servidor está a executar</li>
              <li>Confirme a conectividade de rede</li>
              <li>Atualize a página (F5)</li>
              <li>Contacte o administrador do sistema se o problema persistir</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-800">Dashboard</h2>
          <div className="text-sm text-yellow-500">⚠️ Sem dados</div>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
          <div className="flex items-center space-x-3">
            <AlertCircle className="w-6 h-6 text-yellow-600" />
            <div className="flex-1">
              <h3 className="text-yellow-800 font-medium">Nenhum dado disponível</h3>
              <p className="text-yellow-600 text-sm mt-1">Os dados do dashboard não foram carregados.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const safeMetrics = {
    totalUsers: metrics.totalUsers || 0,
    activeUsers: metrics.activeUsers || 0,
    totalTransactions: metrics.totalTransactions || 0,
    completedTransactions: metrics.completedTransactions || 0,
    pendingTransactions: metrics.pendingTransactions || 0,
    rejectedTransactions: metrics.rejectedTransactions || 0,
    creditTransactions: metrics.creditTransactions || 0,
    debitTransactions: metrics.debitTransactions || 0,
    totalVC: metrics.totalVC || 0,
    activeWallets: metrics.activeWallets || 0,
    totalTransactionVolume: metrics.totalTransactionVolume || 0,
    valCoinDynamicEuroRate: metrics.valCoinDynamicEuroRate || 0,
    totalVCInEuros: (metrics.totalVC || 0) * (metrics.valCoinDynamicEuroRate || 0),
    totalSchoolRevenues: metrics.totalSchoolRevenues || 0,
    activeRules: metrics.activeRules || 0,
    monthlyGrowth: metrics.monthlyGrowth || 0,
    approvalRate: metrics.approvalRate || 0,
    totalSubjects: metrics.totalSubjects || 0,
    totalClasses: metrics.totalClasses || 0,
    studentCount: metrics.studentCount || 0,
    teacherCount: metrics.teacherCount || 0,
    adminCount: metrics.adminCount || 0,
    settings: metrics.settings || {
      sistemaAtivo: false,
      fasePiloto: false,
      limiteAcumulacao: 100,
      taxaIRS: 15,
      taxasIVA: { isento: 0, tipo1: 5, tipo2: 12, tipo3: 23 },
      isencao1Ciclo: true,
      plafondBaseMensal: 1000,
      taxaInatividade: 2,
    },
  };

  console.log('✅ Dashboard: Processando métricas:', safeMetrics);

  const userDistributionData = [
    { name: 'Alunos', value: safeMetrics.studentCount, color: '#3B82F6' },
    { name: 'Professores', value: safeMetrics.teacherCount, color: '#10B981' },
    { name: 'Admins', value: safeMetrics.adminCount, color: '#F59E0B' },
  ].filter(item => item.value > 0);

  const transactionData = [
    { name: 'Crédito', value: safeMetrics.creditTransactions, color: '#10B981' },
    { name: 'Débito', value: safeMetrics.debitTransactions, color: '#EF4444' },
    { name: 'Pendentes', value: safeMetrics.pendingTransactions, color: '#F59E0B' },
    { name: 'Rejeitadas', value: safeMetrics.rejectedTransactions, color: '#6B7280' },
  ].filter(item => item.value > 0);

  const transactionStatusData = [
    { name: 'Concluídas', value: safeMetrics.completedTransactions, color: '#10B981' },
    { name: 'Pendentes', value: safeMetrics.pendingTransactions, color: '#F59E0B' },
    { name: 'Rejeitadas', value: safeMetrics.rejectedTransactions, color: '#EF4444' },
  ].filter(item => item.value > 0);

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Dashboard Aurora</h2>
        <div className="text-sm text-gray-500">
          Sistema: {safeMetrics.settings.sistemaAtivo ? '🟢 Ativo' : '🔴 Inativo'} | 
          Fase: {safeMetrics.settings.fasePiloto ? '🧪 Piloto' : '🚀 Produção'}
        </div>
      </div>

      {safeMetrics.settings.fasePiloto && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center space-x-3">
            <Info className="w-5 h-5 text-blue-600" />
            <p className="text-blue-800">
              <strong>Modo Piloto Ativo:</strong> O sistema está em fase de testes.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-yellow-50 to-orange-50 p-6 rounded-xl shadow-sm border-2 border-yellow-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-yellow-700 font-medium">Cotação Euro/ValCoin</p>
              <h3 className="text-3xl font-bold text-yellow-800">
                {safeMetrics.valCoinDynamicEuroRate.toLocaleString('pt-PT', { 
                  minimumFractionDigits: 4,
                  maximumFractionDigits: 4 
                })} Euro/VC
              </h3>
              <p className="text-sm text-yellow-600">Taxa dinâmica baseada em receitas</p>
            </div>
            <Euro className="w-12 h-12 text-yellow-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total de Utilizadores</p>
              <h3 className="text-2xl font-bold text-gray-800">{safeMetrics.totalUsers.toLocaleString()}</h3>
              <p className="text-sm text-green-600">{safeMetrics.activeUsers.toLocaleString()} ativos</p>
            </div>
            <Users className="w-12 h-12 text-blue-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Transações</p>
              <h3 className="text-2xl font-bold text-gray-800">{safeMetrics.totalTransactions.toLocaleString()}</h3>
              <p className="text-sm text-gray-500">
                {safeMetrics.completedTransactions.toLocaleString()} concluídas
              </p>
            </div>
            <Coins className="w-12 h-12 text-green-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">ValCoins em Circulação</p>
              <h3 className="text-2xl font-bold text-gray-800">{safeMetrics.totalVC.toLocaleString()} <ValCoinIcon className="w-6 h-6 inline-block" /></h3>
              <p className="text-sm text-gray-500">
                ≈ {(safeMetrics.totalVC * safeMetrics.valCoinDynamicEuroRate).toLocaleString('pt-PT', { minimumFractionDigits: 2 })} Euro
              </p>
            </div>
            <Wallet className="w-12 h-12 text-purple-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total de Pontos de Legado</p>
              <h3 className="text-2xl font-bold text-gray-800">{safeMetrics.activeWallets.toLocaleString()}</h3>
              <p className="text-sm text-gray-500">total acumulado</p>
            </div>
            <Wallet className="w-12 h-12 text-indigo-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Volume de Transações</p>
              <h3 className="text-2xl font-bold text-gray-800">
                {safeMetrics.totalTransactionVolume.toLocaleString()} <ValCoinIcon className="w-6 h-6 inline-block" />
              </h3>
              <p className="text-sm text-gray-500">
                ≈ {(safeMetrics.totalTransactionVolume * safeMetrics.valCoinDynamicEuroRate).toLocaleString('pt-PT', { minimumFractionDigits: 2 })} <ValCoinIcon className="w-4 h-4 inline-block" />
              </p>
            </div>
            <TrendingUp className="w-12 h-12 text-blue-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Receitas da Escola</p>
              <h3 className="text-2xl font-bold text-gray-800">
                {safeMetrics.totalSchoolRevenues.toLocaleString()} Euro
              </h3>
              <p className="text-sm text-gray-500">receitas próprias</p>
            </div>
            <Euro className="w-12 h-12 text-green-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Disciplinas</p>
              <h3 className="text-2xl font-bold text-gray-800">{safeMetrics.totalSubjects.toLocaleString()}</h3>
              <p className="text-sm text-gray-500">{safeMetrics.totalClasses.toLocaleString()} turmas</p>
            </div>
            <BookOpen className="w-12 h-12 text-orange-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Transações Pendentes</p>
              <h3 className="text-2xl font-bold text-gray-800">{safeMetrics.pendingTransactions.toLocaleString()}</h3>
              <p className="text-sm text-yellow-600">aguardando aprovação</p>
            </div>
            <Clock className="w-12 h-12 text-yellow-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Taxa de Aprovação</p>
              <h3 className="text-2xl font-bold text-gray-800">{safeMetrics.approvalRate}%</h3>
              <p className="text-sm text-gray-500">das transações</p>
            </div>
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Regras Ativas</p>
              <h3 className="text-2xl font-bold text-gray-800">{safeMetrics.activeRules.toLocaleString()}</h3>
              <p className="text-sm text-gray-500">regras de transação</p>
            </div>
            <CheckCircle className="w-12 h-12 text-emerald-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Crescimento Mensal do Legado</p>
              <h3 className="text-2xl font-bold text-gray-800">{safeMetrics.monthlyGrowth}%</h3>
              <p className="text-sm text-gray-500">variação mensal</p>
            </div>
            <TrendingUp className="w-12 h-12 text-blue-500" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Alunos</h3>
            <Users className="w-8 h-8 text-blue-500" />
          </div>
          <div className="text-3xl font-bold text-gray-800">{safeMetrics.studentCount}</div>
          <p className="text-sm text-gray-500">estudantes no sistema</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Professores</h3>
            <Users className="w-8 h-8 text-green-500" />
          </div>
          <div className="text-3xl font-bold text-gray-800">{safeMetrics.teacherCount}</div>
          <p className="text-sm text-gray-500">docentes ativos</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Administradores</h3>
            <Users className="w-8 h-8 text-red-500" />
          </div>
          <div className="text-3xl font-bold text-gray-800">{safeMetrics.adminCount}</div>
          <p className="text-sm text-gray-500">gestores do sistema</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        {userDistributionData.length > 0 && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Distribuição de Utilizadores</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={userDistributionData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                >
                  {userDistributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {transactionData.length > 0 && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Tipos de Transações</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={transactionData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value, name) => [value, `${name} Transações`]} />
                <Bar dataKey="value" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {transactionStatusData.length > 0 && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Status das Transações</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={transactionStatusData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {transactionStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Configurações do Sistema</h3>
            <Settings className="w-8 h-8 text-gray-500" />
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Limite de Acumulação:</span>
              <span className="font-medium">{safeMetrics.settings.limiteAcumulacao} <ValCoinIcon className="w-4 h-4 inline-block" /></span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Taxa IRS:</span>
              <span className="font-medium">{safeMetrics.settings.taxaIRS}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Plafond Base Mensal:</span>
              <span className="font-medium">{safeMetrics.settings.plafondBaseMensal} <ValCoinIcon className="w-4 h-4 inline-block" /></span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Taxa de Inatividade:</span>
              <span className="font-medium">{safeMetrics.settings.taxaInatividade}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Isenção 1º Ciclo:</span>
              <span className="font-medium">{safeMetrics.settings.isencao1Ciclo ? 'Sim' : 'Não'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-200">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Análise de Conversão ValCoin/Euro</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-indigo-600">
              {safeMetrics.valCoinDynamicEuroRate.toLocaleString('pt-PT', { minimumFractionDigits: 4 })} <ValCoinIcon className="w-6 h-6 inline-block" />/VC
            </div>
            <div className="text-sm text-gray-600">Taxa Dinâmica</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {(safeMetrics.totalVC * safeMetrics.valCoinDynamicEuroRate).toLocaleString('pt-PT', { minimumFractionDigits: 2 })} <ValCoinIcon className="w-4 h-4 inline-block" />
            </div>
            <div className="text-sm text-gray-600">Valor Total (Taxa Dinâmica)</div>
          </div>
        </div>
      </div>

      <div className="text-center text-xs text-gray-400 mt-6">
        Última atualização: {new Date().toLocaleString('pt-PT')} | Dados do endpoint /api/dashboard
      </div>
    </div>
  );
};

export default Dashboard;
