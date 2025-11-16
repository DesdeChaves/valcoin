import React, { useState, useEffect } from 'react';
import { fetchProfessorDisciplines } from '../../utils/api';
import { fetchCompetenciesByDiscipline, deleteCompetency } from '../../utils/api_competencias';
import CompetencyModal from './CompetencyModal';
import AssessmentModal from './AssessmentModal';

const CompetenciesPage = () => {
    const [disciplines, setDisciplines] = useState([]);
    const [selectedDiscipline, setSelectedDiscipline] = useState(null);
    const [competencies, setCompetencies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isAssessmentModalOpen, setIsAssessmentModalOpen] = useState(false);
    const [selectedCompetency, setSelectedCompetency] = useState(null);

    const professorId = JSON.parse(localStorage.getItem('user'))?.id;

    useEffect(() => {
        const loadDisciplines = async () => {
            if (professorId) {
                try {
                    setLoading(true);
                    const profDisciplines = await fetchProfessorDisciplines(professorId);
                    setDisciplines(profDisciplines);
                    if (profDisciplines.length > 0) {
                        setSelectedDiscipline(profDisciplines[0]);
                    }
                } catch (err) {
                    setError('Erro ao carregar as disciplinas');
                } finally {
                    setLoading(false);
                }
            }
        };
        loadDisciplines();
    }, [professorId]);

    useEffect(() => {
        const loadCompetencies = async () => {
            if (selectedDiscipline) {
                try {
                    setLoading(true);
                    const comps = await fetchCompetenciesByDiscipline(selectedDiscipline.subject_id);
                    setCompetencies(comps);
                } catch (err) {
                    setError('Erro ao carregar as competências');
                } finally {
                    setLoading(false);
                }
            }
        };
        loadCompetencies();
    }, [selectedDiscipline]);

    const handleOpenModal = (competency = null) => {
        setSelectedCompetency(competency);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedCompetency(null);
        // Refresh competencies list
        const loadCompetencies = async () => {
            if (selectedDiscipline) {
                setLoading(true);
                const comps = await fetchCompetenciesByDiscipline(selectedDiscipline.subject_id);
                setCompetencies(comps);
                setLoading(false);
            }
        };
        loadCompetencies();
    };

    const handleOpenAssessmentModal = (competency) => {
        setSelectedCompetency(competency);
        setIsAssessmentModalOpen(true);
    };

    const handleCloseAssessmentModal = () => {
        setIsAssessmentModalOpen(false);
        setSelectedCompetency(null);
    };

    const handleDelete = async (id) => {
        if (window.confirm('Tem a certeza que deseja apagar esta competência?')) {
            try {
                await deleteCompetency(id);
                // Refresh competencies list
                const comps = competencies.filter(c => c.id !== id);
                setCompetencies(comps);
            } catch (err) {
                setError('Erro ao apagar a competência');
            }
        }
    };

    const handleDisciplineChange = (e) => {
        const selectedId = e.target.value;
        const discipline = disciplines.find(d => d.professor_disciplina_turma_id === selectedId);
        setSelectedDiscipline(discipline);
    };

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4">Gerir Competências</h1>
            <div className="mb-4">
                <label htmlFor="discipline-select" className="block text-sm font-medium text-gray-700">Selecionar Disciplina</label>
                <select
                    id="discipline-select"
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                    value={selectedDiscipline?.professor_disciplina_turma_id || ''}
                    onChange={handleDisciplineChange}
                >
                    {disciplines.map(d => (
                        <option key={d.professor_disciplina_turma_id} value={d.professor_disciplina_turma_id}>
                            {d.subject_name} - {d.class_name}
                        </option>
                    ))}
                </select>
            </div>

            <div className="flex justify-end mb-4">
                <button
                    onClick={() => handleOpenModal()}
                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                    disabled={!selectedDiscipline}
                >
                    Adicionar Competência
                </button>
            </div>

            {loading && <p>A carregar...</p>}
            {error && <p className="text-red-500">{error}</p>}

            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                <ul className="divide-y divide-gray-200">
                    {competencies.map(comp => (
                        <li key={comp.id}>
                            <div className="px-4 py-4 sm:px-6">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm font-medium text-indigo-600 truncate">{comp.codigo} - {comp.nome}</p>
                                    <div className="ml-2 flex-shrink-0 flex">
                                        <button
                                            onClick={() => handleOpenModal(comp)}
                                            className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800"
                                        >
                                            Editar
                                        </button>
                                        <button
                                            onClick={() => handleDelete(comp.id)}
                                            className="ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800"
                                        >
                                            Apagar
                                        </button>
                                        <button
                                            onClick={() => handleOpenAssessmentModal(comp)}
                                            className="ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800"
                                        >
                                            Avaliar
                                        </button>
                                    </div>
                                </div>
                                <div className="mt-2 sm:flex sm:justify-between">
                                    <div className="sm:flex">
                                        <p className="flex items-center text-sm text-gray-500">
                                            {comp.descricao}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>

            {isModalOpen && (
                <CompetencyModal
                    isOpen={isModalOpen}
                    onClose={handleCloseModal}
                    competency={selectedCompetency}
                    disciplineId={selectedDiscipline?.subject_id}
                    professorId={professorId}
                />
            )}

            {isAssessmentModalOpen && (
                <AssessmentModal
                    isOpen={isAssessmentModalOpen}
                    onClose={handleCloseAssessmentModal}
                    competency={selectedCompetency}
                    disciplineTurmaId={selectedDiscipline?.disciplina_turma_id}
                    professorId={professorId}
                />
            )}
        </div>
    );
};

export default CompetenciesPage;
