import React, { useState, useEffect } from 'react';
import { getMemoriaStats } from '../services/api';
import { ArrowUp, ArrowDown, ArrowRight, Book, Clock, Target, TrendingUp, HelpCircle, Brain, Layers, Award, Info } from 'lucide-react';

// Tooltip component
const Tooltip = ({ text, children }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className="cursor-help"
      >
        {children}
      </div>
      {showTooltip && (
        <div className="absolute z-50 w-64 p-3 text-sm text-white bg-gray-900 rounded-lg shadow-xl -top-2 left-full ml-2 transform -translate-y-1/2">
          <div className="absolute w-2 h-2 bg-gray-900 transform rotate-45 -left-1 top-1/2 -translate-y-1/2"></div>
          {text}
        </div>
      )}
    </div>
  );
};

const StatCard = ({ title, stat, icon: Icon, tooltipText }) => {
  const trend = stat?.trend;
  const value = stat?.value;

  const getTrendColor = () => {
    switch (trend) {
      case 'increase':
        return 'text-green-500';
      case 'decrease':
        return 'text-red-500';
      case 'same':
        return 'text-gray-500';
      default:
        return 'text-gray-400';
    }
  };

  const getTrendIcon = () => {
    switch (trend) {
      case 'increase':
        return <ArrowUp className="w-5 h-5" />;
      case 'decrease':
        return <ArrowDown className="w-5 h-5" />;
      case 'same':
        return <ArrowRight className="w-5 h-5" />;
      default:
        return <HelpCircle className="w-5 h-5" />;
    }
  };

  const getTrendText = () => {
    switch (trend) {
      case 'increase':
        return 'Aumento';
      case 'decrease':
        return 'Diminuição';
      case 'same':
        return 'Estável';
      default:
        return 'Sem dados';
    }
  };

  const getBorderColor = () => {
    switch (trend) {
      case 'increase':
        return 'border-green-500';
      case 'decrease':
        return 'border-red-500';
      case 'same':
        return 'border-gray-400';
      default:
        return 'border-gray-300';
    }
  };

  return (
    <div className={`bg-white rounded-2xl shadow-lg p-6 border-l-4 ${getBorderColor()} hover:shadow-xl transition-all`}>
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-2">
          <h4 className="font-semibold text-gray-700">{title}</h4>
          {tooltipText && (
            <Tooltip text={tooltipText}>
              <Info className="w-4 h-4 text-gray-500" />
            </Tooltip>
          )}
        </div>
        <Icon className="w-8 h-8 text-indigo-500" />
      </div>
      
      <div className="text-4xl font-bold text-gray-900 mb-3">
        {value !== undefined ? (typeof value === 'number' ? value.toFixed(2) : value) : 'N/A'}
      </div>

      <div className={`flex items-center gap-2 ${getTrendColor()}`}>
        {getTrendIcon()}
        <span className="text-sm font-semibold">{getTrendText()}</span>
      </div>
    </div>
  );
};

const MemoriaStatsPage = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await getMemoriaStats();
        setStats(response.data);
      } catch (err) {
        setError('Falha ao carregar as estatísticas da memória.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <Brain className="w-16 h-16 text-indigo-600 animate-pulse mx-auto mb-4" />
          <p className="text-xl font-semibold text-gray-700">A carregar estatísticas...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center">
        <div className="text-center p-8 bg-white rounded-2xl shadow-xl">
          <HelpCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <p className="text-xl text-red-600 font-semibold">{error}</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center p-8 bg-white rounded-2xl shadow-xl">
          <Book className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-xl text-gray-600">Não há dados de estatísticas da memória para apresentar.</p>
        </div>
      </div>
    );
  }

  const { evolution, currentPeriodStats, previousPeriodStats } = stats;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-4 mb-4">
            <Brain className="w-14 h-14 text-indigo-600" />
            <h1 className="text-5xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Estatísticas de Memória
            </h1>
          </div>
          <p className="text-xl text-gray-600 max-w-4xl mx-auto mb-4">
            Evolução dos últimos 15 dias de atividade em comparação com os 15 dias anteriores
          </p>
          
          {/* Period Information */}
          <div className="flex justify-center gap-6 mt-6 flex-wrap">
            {currentPeriodStats?.periodStart && (
              <div className="bg-white rounded-xl shadow-lg px-6 py-3 border-l-4 border-indigo-500">
                <div className="text-sm text-gray-500 font-medium mb-1">Período Atual</div>
                <div className="text-gray-800 font-semibold">
                  {new Date(currentPeriodStats.periodStart).toLocaleDateString('pt-PT')} - {new Date(currentPeriodStats.periodEnd).toLocaleDateString('pt-PT')}
                </div>
              </div>
            )}
            {previousPeriodStats?.periodStart && (
              <div className="bg-white rounded-xl shadow-lg px-6 py-3 border-l-4 border-purple-500">
                <div className="text-sm text-gray-500 font-medium mb-1">Período Anterior</div>
                <div className="text-gray-800 font-semibold">
                  {new Date(previousPeriodStats.periodStart).toLocaleDateString('pt-PT')} - {new Date(previousPeriodStats.periodEnd).toLocaleDateString('pt-PT')}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Statistics Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <StatCard 
            title="Total de Flashcards" 
            stat={evolution.totalFlashcards} 
            icon={Book}
            tooltipText="Número total de flashcards criados no período atual comparado com o período anterior"
          />
          <StatCard 
            title="Total de Revisões" 
            stat={evolution.totalReviews} 
            icon={Clock}
            tooltipText="Número total de revisões realizadas pelos alunos no sistema de repetição espaçada"
          />
          <StatCard 
            title="Taxa de Sucesso" 
            stat={evolution.successRate} 
            icon={Target}
            tooltipText="Percentagem de revisões bem-sucedidas (classificações 3-Good e 4-Easy)"
          />
          <StatCard 
            title="Rating Médio" 
            stat={evolution.averageRating} 
            icon={TrendingUp}
            tooltipText="Média das classificações nas revisões: 1-Again, 2-Hard, 3-Good, 4-Easy. Valores mais altos indicam melhor desempenho"
          />
          <StatCard 
            title="Disciplinas Envolvidas" 
            stat={evolution.uniqueDisciplines} 
            icon={Layers}
            tooltipText="Número de disciplinas diferentes que têm flashcards ativos"
          />
          <StatCard 
            title="Assuntos Tratados" 
            stat={evolution.uniqueAssuntos} 
            icon={Book}
            tooltipText="Número de assuntos/tópicos diferentes abordados nos flashcards"
          />
          <StatCard 
            title="Dificuldade Média" 
            stat={evolution.avgDifficulty} 
            icon={TrendingUp}
            tooltipText="Indicador médio de dificuldade (0-10). Valores mais altos indicam que os alunos consideram o conteúdo mais difícil"
          />
          <StatCard 
            title="Estabilidade Média" 
            stat={evolution.avgStability} 
            icon={Award}
            tooltipText="Número médio de dias que os alunos conseguem reter a informação antes de precisar rever. Valores mais altos indicam melhor retenção"
          />
        </div>

        {/* Summary Section */}
        <div className="bg-white rounded-3xl shadow-2xl p-8 border-2 border-indigo-200">
          <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <Target className="w-8 h-8 text-indigo-600" />
            Resumo da Evolução
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Período Atual</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Flashcards Criados:</span>
                  <span className="text-2xl font-bold text-indigo-600">
                    {currentPeriodStats?.totalFlashcards || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Revisões Realizadas:</span>
                  <span className="text-2xl font-bold text-indigo-600">
                    {currentPeriodStats?.totalReviews || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Rating Médio:</span>
                  <span className="text-2xl font-bold text-indigo-600">
                    {currentPeriodStats?.averageRating ? currentPeriodStats.averageRating.toFixed(2) : 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Período Anterior</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Flashcards Criados:</span>
                  <span className="text-2xl font-bold text-purple-600">
                    {previousPeriodStats?.totalFlashcards || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Revisões Realizadas:</span>
                  <span className="text-2xl font-bold text-purple-600">
                    {previousPeriodStats?.totalReviews || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Rating Médio:</span>
                  <span className="text-2xl font-bold text-purple-600">
                    {previousPeriodStats?.averageRating ? previousPeriodStats.averageRating.toFixed(2) : 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default MemoriaStatsPage;
