import React, { useState, useEffect } from 'react';
import { fetchStudentCompetencyEvaluations } from '../../utils/api_competencias';
import CompetencyHistoryModal from './CompetencyHistoryModal'; // To be created

const proficiencyLevelMap = {
    'fraco': 'Fraco',
    'nao_satisfaz': 'Não Satisfaz',
    'satisfaz': 'Satisfaz',
    'satisfaz_bastante': 'Satisfaz Bastante',
    'excelente': 'Excelente',
};

const StudentCompetenciesPage = () => {
    const [evaluations, setEvaluations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [selectedCompetencyForHistory, setSelectedCompetencyForHistory] = useState(null);

    const studentId = JSON.parse(localStorage.getItem('user'))?.id;

    useEffect(() => {
        const loadEvaluations = async () => {
            if (studentId) {
                try {
                    setLoading(true);
                    const data = await fetchStudentCompetencyEvaluations(studentId);
                    setEvaluations(data);
                } catch (err) {
                    setError('Erro ao carregar as avaliações de competências.');
                } finally {
                    setLoading(false);
                }
            } else {
                setError('ID do estudante não encontrado.');
                setLoading(false);
            }
        };
        loadEvaluations();
    }, [studentId]);

    const handleOpenHistoryModal = (competency) => {
        setSelectedCompetencyForHistory(competency);
        setIsHistoryModalOpen(true);
    };

    const handleCloseHistoryModal = () => {
        setIsHistoryModalOpen(false);
        setSelectedCompetencyForHistory(null);
    };

    if (loading) {
        return <div className="text-center py-8">A carregar competências...</div>;
    }

    if (error) {
        return <div className="text-center py-8 text-red-500">Erro: {error}</div>;
    }

    if (evaluations.length === 0) {
        return <div className="text-center py-8 text-gray-600">Nenhuma avaliação de competência encontrada.</div>;
    }

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4">Minhas Competências</h1>
            <p className="text-gray-600 mb-6">
                Aqui pode consultar o seu nível de proficiência nas diferentes competências avaliadas.
                As competências estão ordenadas daquelas que mais precisa de trabalhar para as que domina.
            </p>

            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                <ul className="divide-y divide-gray-200">
                    {evaluations.map(comp => (
                        <li key={comp.competencia_id}>
                            <div className="px-4 py-4 sm:px-6">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm font-medium text-indigo-600 truncate">
                                        {comp.competencia_codigo} - {comp.competencia_nome}
                                    </p>
                                    <div className="ml-2 flex-shrink-0 flex">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                            comp.nivel_atual === 'excelente' ? 'bg-green-100 text-green-800' :
                                            comp.nivel_atual === 'satisfaz_bastante' ? 'bg-blue-100 text-blue-800' :
                                            comp.nivel_atual === 'satisfaz' ? 'bg-yellow-100 text-yellow-800' :
                                            'bg-red-100 text-red-800'
                                        }`}>
                                            {proficiencyLevelMap[comp.nivel_atual]}
                                        </span>
                                    </div>
                                </div>
                                <div className="mt-2 sm:flex sm:justify-between">
                                    <div className="sm:flex">
                                        <p className="flex items-center text-sm text-gray-500">
                                            <span className="font-medium mr-1">Disciplina:</span> {comp.disciplina_nome}
                                        </p>
                                        <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
                                            <span className="font-medium mr-1">Domínio:</span> {comp.dominio || 'N/A'}
                                        </p>
                                    </div>
                                    <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                                        <span className="font-medium mr-1">Última Avaliação:</span> {new Date(comp.ultima_avaliacao).toLocaleDateString()}
                                    </div>
                                </div>
                                {comp.observacoes && (
                                    <div className="mt-2 text-sm text-gray-700">
                                        <span className="font-medium">Observações:</span> {comp.observacoes}
                                    </div>
                                )}
                                {comp.aluno_tem_medida_educativa && (
                                    <div className="mt-2 text-sm text-blue-700">
                                        <span className="font-medium">Medida Educativa:</span> Sim ({comp.medida_educativa})
                                    </div>
                                )}
                                <div className="mt-4 text-right">
                                    <button
                                        onClick={() => handleOpenHistoryModal(comp)}
                                        className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                                    >
                                        Ver Histórico na Disciplina
                                    </button>
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>

            {isHistoryModalOpen && (
                <CompetencyHistoryModal
                    isOpen={isHistoryModalOpen}
                    onClose={handleCloseHistoryModal}
                    competency={selectedCompetencyForHistory}
                    studentId={studentId}
                    disciplinaTurmaId={selectedCompetencyForHistory?.disciplina_turma_id}
                />
            )}
        </div>
    );
};

export default StudentCompetenciesPage;
