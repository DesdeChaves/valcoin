import React, { useState, useEffect } from 'react';
import { Upload, BarChart3, TrendingUp, Users, BookOpen, Award, Loader2 } from 'lucide-react';
import Filtros from './analytics_tabs/Filtros';
import UploadTab from './analytics_tabs/UploadTab';
import TurmasTab from './analytics_tabs/TurmasTab';
import EvolucaoTab from './analytics_tabs/EvolucaoTab';
import CiclosTab from './analytics_tabs/CiclosTab';
import DisciplinasTab from './analytics_tabs/DisciplinasTab';
import DistribuicaoTab from './analytics_tabs/DistribuicaoTab';
import IndicadoresTab from './analytics_tabs/IndicadoresTab';

const SchoolAnalyticsDashboard = () => {
  const [activeTab, setActiveTab] = useState('upload');
  const [avaliacoes, setAvaliacoes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [filters, setFilters] = useState({
    anoLetivo: '',
    periodo: '',
    ciclo: '',
    ano: '',
  });

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filters.anoLetivo) params.append('ano_letivo', filters.anoLetivo);
      if (filters.periodo) params.append('periodo', filters.periodo);
      if (filters.ciclo) params.append('ciclo', filters.ciclo);
      if (filters.ano) params.append('ano', filters.ano);

      const response = await fetch(`/api/avaliacoes?${params.toString()}`);
      if (!response.ok) throw new Error('Erro ao carregar dados');
      const data = await response.json();
      setAvaliacoes(data);
    } catch (err) {
      setError('Não foi possível carregar os dados. Verifique os filtros ou a ligação.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab !== 'upload') {
      loadData();
    }
  }, [filters, activeTab]);

  const tabs = [
    { id: 'upload', label: 'Upload', icon: Upload },
        { id: 'indicadores', label: 'Indicadores', icon: TrendingUp },
    { id: 'turmas', label: 'Comparar Turmas', icon: Users },
    { id: 'evolucao', label: 'Gráficos Gentil', icon: TrendingUp },
 //   { id: 'ciclos', label: 'Performance por Ciclo', icon: Award },
    { id: 'disciplinas', label: 'Ranking Disciplinas', icon: BookOpen },
    { id: 'distribuicao', label: 'Distribuição Notas', icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        <header className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-3xl font-bold text-indigo-900 flex items-center gap-3">
            <BarChart3 className="w-8 h-8" />
            Dashboard de Análise Escolar
          </h1>
          <p className="text-gray-600 mt-2">
            Análise comparativa de avaliações por turma, disciplina e período
          </p>
        </header>

        <div className="bg-white rounded-lg shadow-lg">
          <div className="flex border-b overflow-x-auto">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-b-2 border-indigo-600 text-indigo-600'
                      : 'text-gray-600 hover:text-indigo-600'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="p-6">
            {activeTab === 'upload' && <UploadTab />}

            {activeTab !== 'upload' && (
              <Filtros filters={filters} setFilters={setFilters} />
            )}

            {loading && (
              <div className="flex flex-col items-center justify-center h-64">
                <Loader2 className="w-12 h-12 animate-spin text-indigo-600 mb-4" />
                <p>A carregar dados...</p>
              </div>
            )}

            {error && !loading && (
              <div className="bg-red-50 text-red-800 p-4 rounded-lg border border-red-200 mb-6">
                {error}
              </div>
            )}

            {activeTab === 'turmas' && !loading && !error && (
              <TurmasTab avaliacoes={avaliacoes} />
            )}

            {activeTab === 'evolucao' && !loading && !error && (
              <EvolucaoTab avaliacoes={avaliacoes} />
            )}

            {activeTab === 'ciclos' && !loading && !error && (
              <CiclosTab avaliacoes={avaliacoes} />
            )}

            {activeTab === 'disciplinas' && !loading && !error && (
              <DisciplinasTab avaliacoes={avaliacoes} />
            )}

            {activeTab === 'distribuicao' && !loading && !error && (
              <DistribuicaoTab avaliacoes={avaliacoes} />
            )}

            {activeTab === 'indicadores' && !loading && !error && (
                <IndicadoresTab avaliacoes={avaliacoes} ciclo={filters.ciclo} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SchoolAnalyticsDashboard;
