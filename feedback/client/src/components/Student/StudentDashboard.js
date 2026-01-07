import React, { useState, useEffect } from 'react';
import useAuth from '../../hooks/useAuth';
import { BarChart, CheckCircle, TrendingUp, Gem, Info, X } from 'lucide-react';
import { getStudentDashboardSummary } from '../../utils/api';

const InfoModal = ({ isOpen, onClose, title, content }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-xl font-semibold text-gray-800">{title}</h3>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="text-gray-600 space-y-2">
          {content}
        </div>
        <button
          onClick={onClose}
          className="mt-6 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
        >
          Fechar
        </button>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon, bgColor, onInfoClick }) => (
  <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
    <div className="flex items-start justify-between mb-4">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-2">
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <button
            onClick={onInfoClick}
            className="text-gray-400 hover:text-indigo-600 transition-colors"
            title="Mais informações"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>
        <p className="text-3xl font-bold text-gray-800">{value}</p>
      </div>
      <div className={`w-12 h-12 ${bgColor} rounded-lg flex items-center justify-center`}>
        {icon}
      </div>
    </div>
  </div>
);

const DetailCard = ({ title, items }) => (
  <div className="bg-white rounded-lg border border-gray-200 p-6">
    <h3 className="text-lg font-semibold text-gray-800 mb-4">{title}</h3>
    <div className="space-y-3">
      {items.map((item, idx) => (
        <div key={idx} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
          <span className="text-sm text-gray-600">{item.label}</span>
          <span className="text-sm font-semibold text-gray-800">{item.value}</span>
        </div>
      ))}
    </div>
  </div>
);

const StudentDashboard = () => {
    const { user } = useAuth();
    const [dashboardData, setDashboardData] = useState({
        grades: {
            mediaUltimasNotas: 'N/A',
            percentil20: '0',
            percentil50: '0',
            percentil75: '0',
            mediaGlobal: '0',
            percentagemSucesso: '0'
        },
        successCount: 0,
        avgEvolucao: '0.00',
        totalPontos: 0,
        loading: true,
        error: null
    });
    const [modalInfo, setModalInfo] = useState({ isOpen: false, title: '', content: null });

    useEffect(() => {
        const fetchDashboardData = async () => {
            if (!user?.id) return;

            try {
                const data = await getStudentDashboardSummary(user.id);
                setDashboardData({
                    ...data,
                    loading: false,
                    error: null
                });
            } catch (err) {
                setDashboardData(prev => ({
                    ...prev,
                    loading: false,
                    error: err.message
                }));
            }
        };

        fetchDashboardData();
    }, [user?.id]);

    const openModal = (title, content) => {
        setModalInfo({ isOpen: true, title, content });
    };

    const closeModal = () => {
        setModalInfo({ isOpen: false, title: '', content: null });
    };

    if (dashboardData.loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <svg className="animate-spin h-12 w-12 text-indigo-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="text-gray-600">A carregar dados...</p>
                </div>
            </div>
        );
    }

    if (dashboardData.error) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
                    <div className="flex items-center gap-3 mb-2">
                        <svg className="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                        <h3 className="text-lg font-semibold text-red-800">Erro ao carregar dados</h3>
                    </div>
                    <p className="text-red-600">{dashboardData.error}</p>
                </div>
            </div>
        );
    }

    const gradesStats = [
        { label: 'Média Global', value: dashboardData.grades.mediaGlobal },
        { label: 'Percentil 20', value: dashboardData.grades.percentil20 },
        { label: 'Percentil 50 (Mediana)', value: dashboardData.grades.percentil50 },
        { label: 'Percentil 75', value: dashboardData.grades.percentil75 },
        { label: 'Taxa de Sucesso', value: `${dashboardData.grades.percentagemSucesso}%` }
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            <InfoModal 
                isOpen={modalInfo.isOpen}
                onClose={closeModal}
                title={modalInfo.title}
                content={modalInfo.content}
            />

            <div className="bg-white border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-6 py-6">
                    <div>
                        <h1 className="text-3xl font-semibold text-gray-800">
                            Bem-vindo, {user?.nome || 'Estudante'}!
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">
                            Acompanhe o seu progresso académico em tempo real
                        </p>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                    <StatCard 
                        title="Média Recente"
                        value={dashboardData.grades.mediaUltimasNotas}
                        icon={<BarChart className="w-6 h-6 text-blue-600" />}
                        bgColor="bg-blue-100"
                        onInfoClick={() => openModal(
                            'Média das Notas Recentes',
                            <div>
                                <p className="mb-3">
                                    Esta é a média das suas classificações mais recentes. 
                                    Representa o seu desempenho atual nas avaliações.
                                </p>
                                <div className="bg-blue-50 p-3 rounded-lg">
                                    <p className="text-sm font-medium text-blue-900">
                                        Média: {dashboardData.grades.mediaUltimasNotas}
                                    </p>
                                </div>
                            </div>
                        )}
                    />
                    
                    <StatCard 
                        title="Critérios de Sucesso"
                        value={dashboardData.successCount}
                        icon={<CheckCircle className="w-6 h-6 text-green-600" />}
                        bgColor="bg-green-100"
                        onInfoClick={() => openModal(
                            'Critérios de Sucesso',
                            <div>
                                <p className="mb-3">
                                    Total de critérios de avaliação que concluiu com sucesso. 
                                    Cada critério representa uma competência ou objetivo de aprendizagem específico.
                                </p>
                                <div className="bg-green-50 p-3 rounded-lg">
                                    <p className="text-sm font-medium text-green-900">
                                        Total concluído: {dashboardData.successCount}
                                    </p>
                                </div>
                            </div>
                        )}
                    />
                    
                    <StatCard 
                        title="Evolução de Competências"
                        value={dashboardData.avgEvolucao}
                        icon={<TrendingUp className="w-6 h-6 text-purple-600" />}
                        bgColor="bg-purple-100"
                        onInfoClick={() => openModal(
                            'Progresso das Competências',
                            <div>
                                <p className="mb-3">
                                    Representa a evolução média do seu nível de proficiência nas diferentes competências avaliadas.
                                </p>
                                <div className="bg-purple-50 p-3 rounded-lg space-y-2">
                                    <p className="text-sm font-medium text-purple-900">
                                        Evolução média: {dashboardData.avgEvolucao}
                                    </p>
                                    <p className="text-xs text-purple-700">
                                        Valores mais altos indicam maior progresso
                                    </p>
                                </div>
                            </div>
                        )}
                    />
                    
                    <StatCard 
                        title="Pontos Acumulados"
                        value={dashboardData.totalPontos}
                        icon={<Gem className="w-6 h-6 text-yellow-600" />}
                        bgColor="bg-yellow-100"
                        onInfoClick={() => openModal(
                            'Sistema de Pontos',
                            <div>
                                <p className="mb-3">
                                    Total de pontos acumulados através dos contadores de desempenho. 
                                    Estes pontos refletem o seu empenho e conquistas ao longo do período letivo.
                                </p>
                                <div className="bg-yellow-50 p-3 rounded-lg">
                                    <p className="text-sm font-medium text-yellow-900">
                                        Total de pontos: {dashboardData.totalPontos}
                                    </p>
                                </div>
                            </div>
                        )}
                    />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    <DetailCard 
                        title="Estatísticas Detalhadas de Notas"
                        items={gradesStats}
                    />

                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">Desempenho Geral</h3>
                        <div className="space-y-4">
                            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-gray-700">Taxa de Sucesso</span>
                                    <span className="text-2xl font-bold text-indigo-600">
                                        {dashboardData.grades.percentagemSucesso}%
                                    </span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div 
                                        className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
                                        style={{ width: `${dashboardData.grades.percentagemSucesso}%` }}
                                    ></div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="text-center p-4 bg-gray-50 rounded-lg">
                                    <p className="text-sm text-gray-600 mb-1">Critérios Concluídos</p>
                                    <p className="text-2xl font-bold text-gray-800">{dashboardData.successCount}</p>
                                </div>
                                <div className="text-center p-4 bg-gray-50 rounded-lg">
                                    <p className="text-sm text-gray-600 mb-1">Pontos Totais</p>
                                    <p className="text-2xl font-bold text-gray-800">{dashboardData.totalPontos}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                            <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-semibold text-gray-800">Atividade Recente</h2>
                    </div>
                    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-6 rounded-lg text-center">
                        <svg className="w-16 h-16 text-indigo-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-gray-600 font-medium">Brevemente disponível</p>
                        <p className="text-sm text-gray-500 mt-2">
                            Em breve terá acesso a um feed com as suas últimas avaliações, conquistas e marcos alcançados.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StudentDashboard;
