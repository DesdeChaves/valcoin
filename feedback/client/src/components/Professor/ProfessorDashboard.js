import React from 'react';
import useProfessorDashboardData from '../../hooks/useProfessorDashboardData'; // Import the custom hook
import { Book, Folder, ListChecks, Hammer, Sliders, ChevronRight, Users, Star, TrendingUp, BarChart } from 'lucide-react';

const StatCard = ({ icon, title, value, color }) => (
    <div className={`bg-gradient-to-br from-${color}-500 to-${color}-600 p-6 rounded-2xl shadow-lg text-white transition-transform transform hover:scale-105`}>
        <div className="flex items-center justify-between">
            <div>
                <p className="text-lg font-semibold opacity-80">{title}</p>
                <p className="text-4xl font-bold">{value}</p>
            </div>
            <div className={`bg-white/20 p-4 rounded-xl`}>
                {icon}
            </div>
        </div>
    </div>
);


function ProfessorDashboard() {
    const { disciplines, stats, loading, error } = useProfessorDashboardData(); // Use the custom hook

    if (loading) {
        return <div className="flex justify-center items-center h-screen"><div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div></div>;
    }

    if (error) {
        return <div className="text-center mt-8 text-red-500 bg-red-100 p-4 rounded-lg">{error}</div>;
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
            <div className="max-w-7xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-4xl font-bold text-gray-800">Dashboard do Professor</h1>
                    <p className="text-lg text-gray-500 mt-1">Visão geral do seu ano letivo.</p>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                    <StatCard icon={<Book size={32} />} title="Disciplinas" value={stats.totalDisciplinas} color="blue" />
                    <StatCard icon={<Folder size={32} />} title="Dossiês" value={stats.totalDossiers} color="indigo" />
                    <StatCard icon={<ListChecks size={32} />} title="Critérios" value={stats.totalCriterios} color="purple" />
                    <StatCard icon={<Star size={32} />} title="Competências" value={stats.totalCompetencias} color="yellow" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
                    <StatCard icon={<Hammer size={32} />} title="Instrumentos" value={stats.totalInstrumentos} color="pink" />
                    <StatCard icon={<Sliders size={32} />} title="Contadores" value={stats.totalContadores} color="teal" />
                    <StatCard icon={<TrendingUp size={32} />} title="Avaliações" value={stats.totalAvaliacoesCriterios} color="green" />
                </div>


                {/* Disciplines List */}
                <div>
                    <h2 className="text-3xl font-bold text-gray-800 mb-6">Minhas Disciplinas</h2>
                    {disciplines.length === 0 ? (
                        <div className="bg-white p-8 rounded-2xl shadow-md text-center">
                            <p className="text-gray-500">Nenhuma disciplina encontrada.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {disciplines.map((discipline) => (
                                <div
                                    key={discipline.subject_id}
                                    className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200/80"
                                >
                                    <div>
                                        <h4 className="text-xl font-bold text-gray-800">
                                            {discipline.subject_name}
                                            <span className="text-base font-medium text-gray-500 ml-2">({discipline.subject_code})</span>
                                        </h4>
                                        <ul className="mt-2 space-y-1">
                                            {discipline.turmas.map(turma => (
                                                <li key={turma.disciplina_turma_id} className="text-md text-gray-600">
                                                    Turma: <span className="font-semibold">{turma.class_name}</span> ({turma.class_code})
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default ProfessorDashboard;
