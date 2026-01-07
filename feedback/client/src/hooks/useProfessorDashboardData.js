import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProfessorFeedbackDashboard } from '../utils/api';

const useProfessorDashboardData = () => {
    const [disciplines, setDisciplines] = useState([]);
    const [stats, setStats] = useState({
        totalDisciplinas: 0,
        totalDossiers: 0,
        totalCriterios: 0,
        totalInstrumentos: 0,
        totalContadores: 0,
        totalCompetencias: 0,
        totalAvaliacoesCriterios: 0,
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const fetchDashboardData = async () => {
            const user = JSON.parse(localStorage.getItem('user'));
            if (!user || user.tipo_utilizador !== 'PROFESSOR') {
                // This should ideally be handled by a top-level auth check,
                // but keeping it here for now as it was in the original component.
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
                        totalCompetencias: data.totalCompetencias || 0,
                        totalAvaliacoesCriterios: data.totalAvaliacoesCriterios || 0,
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

    return { disciplines, stats, loading, error };
};

export default useProfessorDashboardData;