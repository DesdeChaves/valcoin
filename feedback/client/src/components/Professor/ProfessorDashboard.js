import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    getProfessorFeedbackDashboard
} from '../../utils/api';
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
    const [disciplines, setDisciplines] = useState([]);
    const [stats, setStats] = useState({
        totalDisciplinas: 0,
        totalDossiers: 0,
        totalCriterios: 0,
        totalInstrumentos: 0,
        totalContadores: 0,
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const fetchDashboardData = async () => {
            const user = JSON.parse(localStorage.getItem('user'));
            if (!user || user.tipo_utilizador !== 'PROFESSOR') {
                navigate('/login');
                return;
            }

            try {
                setLoading(true);
                const response = await getProfessorFeedbackDashboard();
                const data = response;

                if (data && data.disciplines) {
                    setDisciplines(data.disciplines);
                } else {
                    setDisciplines([]);
                }

                if (data) {
                    setStats({
                        totalDisciplinas: data.totalDisciplinas || 0,
                        totalDossiers: data.totalDossiers || 0,
                        totalCriterios: data.totalCriterios || 0,
                        totalInstrumentos: data.totalInstrumentos || 0,
                        totalContadores: data.totalContadores || 0,
                    });
                }

            } catch (err) {
                setError('Erro ao carregar os dados do dashboard.');
                console.error('Error fetching dashboard data:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, [navigate]);

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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-10">
                    <StatCard icon={<Book size={32} />} title="Disciplinas" value={stats.totalDisciplinas} color="blue" />
                    <StatCard icon={<Folder size={32} />} title="Dossiês" value={stats.totalDossiers} color="indigo" />
                    <StatCard icon={<ListChecks size={32} />} title="Critérios" value={stats.totalCriterios} color="purple" />
                    <StatCard icon={<Hammer size={32} />} title="Instrumentos" value={stats.totalInstrumentos} color="pink" />
                    <StatCard icon={<Sliders size={32} />} title="Contadores" value={stats.totalContadores} color="teal" />
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
                                    key={discipline.professor_disciplina_turma_id}
                                    className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200/80 flex justify-between items-center"
                                >
                                    <div>
                                        <h4 className="text-xl font-bold text-gray-800">
                                            {discipline.subject_name}
                                            <span className="text-base font-medium text-gray-500 ml-2">({discipline.subject_code})</span>
                                        </h4>
                                        <p className="text-md text-gray-600 mt-1">
                                            Turma: <span className="font-semibold">{discipline.class_name}</span> ({discipline.class_code})
                                        </p>
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
