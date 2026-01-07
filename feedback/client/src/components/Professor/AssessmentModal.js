import React, { useState, useEffect } from 'react';
import { fetchEligibleStudentsForCompetency, saveCompetencyAssessments, fetchEvaluationMoments, fetchAssessmentsForMoment, fetchRecentAssessments, deleteEvaluationMoment } from '../../utils/api_competencias';

const proficiencyLevels = [
    { value: 'fraco', label: 'Fraco' },
    { value: 'nao_satisfaz', label: 'Não Satisfaz' },
    { value: 'satisfaz', label: 'Satisfaz' },
    { value: 'satisfaz_bastante', label: 'Satisfaz Bastante' },
    { value: 'excelente', label: 'Excelente' },
];

const AssessmentModal = ({ isOpen, onClose, competency, turmasForSubject, professorId }) => {
    const [students, setStudents] = useState([]);
    const [assessments, setAssessments] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [momentoAvaliacao, setMomentoAvaliacao] = useState('');
    const [evaluationMoments, setEvaluationMoments] = useState([]);
    const [selectedMoment, setSelectedMoment] = useState('');
    const [selectedTurmaId, setSelectedTurmaId] = useState('');

    // Effect to initialize selectedTurmaId when the modal opens or turmas change
    useEffect(() => {
        if (isOpen && turmasForSubject && turmasForSubject.length > 0) {
            setSelectedTurmaId(turmasForSubject[0].disciplina_turma_id);
        } else {
            setSelectedTurmaId('');
        }
    }, [isOpen, turmasForSubject]);

    // Effect to load students and evaluation moments when a turma is selected
    useEffect(() => {
        const loadInitialData = async () => {
            if (selectedTurmaId) {
                try {
                    setLoading(true);
                    setError(null);
                    setStudents([]);
                    setAssessments({});
                    setEvaluationMoments([]);
                    setSelectedMoment('');

                    const [response, moments] = await Promise.all([
                        fetchEligibleStudentsForCompetency(competency.id, selectedTurmaId),
                        fetchEvaluationMoments(competency.id, selectedTurmaId) // Pass selectedTurmaId here
                    ]);
                    
                    const studentList = response.students || [];

                    if (studentList.length === 0 && (competency.medida_educativa === 'seletiva' || competency.medida_educativa === 'adicional')) {
                        setError("Nenhum aluno elegível encontrado. Verifique se as medidas educativas ('seletiva' ou 'adicional') estão configuradas corretamente para os alunos desta turma e disciplina.");
                    } else if (studentList.length === 0) {
                        setError("Nenhum aluno encontrado para esta turma.");
                    } else {
                        setError(null);
                    }

                    setStudents(studentList);
                    setEvaluationMoments(moments);

                    const initialAssessments = studentList.reduce((acc, student) => {
                        acc[student.id] = { level: null, observacoes: '', notApplicable: false };
                        return acc;
                    }, {});
                    setAssessments(initialAssessments);
                } catch (err) {
                    setError('Erro ao carregar os dados da turma');
                } finally {
                    setLoading(false);
                }
            } else {
                setStudents([]);
                setAssessments({});
                setEvaluationMoments([]);
                setSelectedMoment('');
                setLoading(false);
            }
        };
        loadInitialData();
    }, [selectedTurmaId, competency.id]);

    // Effect to load assessments when a historical moment is selected
    useEffect(() => {
        const loadAssessmentsForMoment = async () => {
            if (selectedMoment) {
                try {
                    setLoading(true);
                    const momentAssessments = await fetchAssessmentsForMoment(competency.id, selectedMoment);
                    const newAssessments = { ...assessments };
                    momentAssessments.forEach(assessment => {
                        if (newAssessments[assessment.aluno_id]) {
                            newAssessments[assessment.aluno_id] = {
                                level: assessment.nivel,
                                observacoes: assessment.observacoes,
                                notApplicable: false,
                            };
                        }
                    });
                    setAssessments(newAssessments);
                } catch (err) {
                    setError('Erro ao carregar as avaliações do momento');
                } finally {
                    setLoading(false);
                }
            }
        };
        loadAssessmentsForMoment();
    }, [selectedMoment, competency.id]);

    const handleCreateFromRecent = async () => {
        try {
            setLoading(true);
            const recentAssessments = await fetchRecentAssessments(competency.id);
            const newAssessments = { ...assessments };
            recentAssessments.forEach(assessment => {
                if (newAssessments[assessment.aluno_id]) {
                    newAssessments[assessment.aluno_id] = {
                        level: assessment.nivel,
                        observacoes: assessment.observacoes,
                        notApplicable: false,
                    };
                }
            });
            setAssessments(newAssessments);
        } catch (err) {
            setError('Erro ao carregar as avaliações mais recentes');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteMoment = async () => {
        if (!selectedMoment || !selectedTurmaId) {
            alert("Por favor, selecione um momento para apagar.");
            return;
        }

        if (window.confirm(`Tem a certeza que deseja apagar o momento '${selectedMoment}' e todas as suas avaliações nesta turma? Esta ação não pode ser revertida.`)) {
            try {
                setLoading(true);
                await deleteEvaluationMoment(competency.id, selectedMoment, selectedTurmaId);
                
                // Update UI locally
                setEvaluationMoments(prev => prev.filter(moment => moment !== selectedMoment));
                setSelectedMoment('');

                // Reset student assessments to their initial state
                const initialAssessments = students.reduce((acc, student) => {
                    acc[student.id] = { level: null, observacoes: '', notApplicable: false };
                    return acc;
                }, {});
                setAssessments(initialAssessments);

            } catch (err) {
                setError(err.message || 'Falha ao apagar o momento.');
            } finally {
                setLoading(false);
            }
        }
    };

    const handleAssessmentChange = (studentId, level) => {
        setAssessments(prev => ({
            ...prev,
            [studentId]: { ...prev[studentId], level, notApplicable: false }
        }));
    };

    const handleObservacaoChange = (studentId, observacoes) => {
        setAssessments(prev => ({
            ...prev,
            [studentId]: { ...prev[studentId], observacoes }
        }));
    };

    const handleNotApplicableChange = (studentId, isChecked) => {
        setAssessments(prev => ({
            ...prev,
            [studentId]: { ...prev[studentId], notApplicable: isChecked, level: isChecked ? null : prev[studentId].level }
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        const evaluations = Object.entries(assessments)
            .filter(([, assessment]) => assessment.level && !assessment.notApplicable)
            .map(([studentId, assessment]) => ({
                aluno_id: studentId,
                nivel: assessment.level,
                observacoes: assessment.observacoes,
            }));

        if (evaluations.length === 0) {
            const allNotApplicable = Object.values(assessments).every(a => a.notApplicable);
            if (!allNotApplicable) {
                setError('Nenhuma avaliação válida foi preenchida.');
                return;
            }
        }

        if (!momentoAvaliacao && !selectedMoment) {
            setError('É necessário definir um momento de avaliação ou selecionar um existente.');
            return;
        }

        if (!selectedTurmaId) {
            setError('É necessário selecionar uma turma.');
            return;
        }

        try {
            await saveCompetencyAssessments(competency.id, {
                evaluations,
                professor_id: professorId,
                disciplina_turma_id: selectedTurmaId,
                momento_avaliacao: momentoAvaliacao || selectedMoment,
            });
            onClose();
        } catch (err) {
            setError(err.message || 'Falha ao guardar as avaliações');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full">
            <div className="relative top-10 mx-auto p-5 border w-full max-w-5xl shadow-lg rounded-md bg-white">
                <div className="mt-3">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 text-center">Avaliar Competência: {competency.nome}</h3>
                    <div className="mt-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                            <div>
                                <label htmlFor="turma-select" className="block text-sm font-medium text-gray-700">Selecionar Turma</label>
                                <select
                                    id="turma-select"
                                    value={selectedTurmaId}
                                    onChange={(e) => setSelectedTurmaId(e.target.value)}
                                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                                >
                                    <option value="">Selecione uma turma</option>
                                    {turmasForSubject.map(turma => (
                                        <option key={turma.disciplina_turma_id} value={turma.disciplina_turma_id}>
                                            {turma.class_name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="momento-avaliacao" className="block text-sm font-medium text-gray-700">Novo Momento de Avaliação</label>
                                <input
                                    type="text"
                                    id="momento-avaliacao"
                                    value={momentoAvaliacao}
                                    onChange={(e) => setMomentoAvaliacao(e.target.value)}
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                                    placeholder="Ex: 1º Período"
                                />
                            </div>
                             <div className="flex items-end space-x-2">
                                <div className="flex-grow">
                                    <label htmlFor="moment-history" className="block text-sm font-medium text-gray-700">Histórico de Momentos</label>
                                    <select
                                        id="moment-history"
                                        value={selectedMoment}
                                        onChange={(e) => setSelectedMoment(e.target.value)}
                                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                                    >
                                        <option value="">Selecione um momento</option>
                                        {evaluationMoments.map(moment => (
                                            <option key={moment} value={moment}>{moment}</option>
                                        ))}
                                    </select>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleDeleteMoment}
                                    disabled={!selectedMoment}
                                    className="px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 disabled:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                                    title="Apagar momento selecionado"
                                >
                                    Apagar
                                </button>
                            </div>
                        </div>

                        {loading && <p>A carregar alunos...</p>}
                        {error && <p className="text-red-500">{error}</p>}
                        <form onSubmit={handleSubmit}>
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aluno</th>
                                        {proficiencyLevels.map(level => (
                                            <th key={level.value} className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">{level.label}</th>
                                        ))}
                                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Não se aplica</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Observações</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {students.map(student => (
                                        <tr key={student.id}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{student.nome}</td>
                                            {proficiencyLevels.map(level => (
                                                <td key={level.value} className="px-2 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                                                    <input
                                                        type="radio"
                                                        name={`assessment-${student.id}`}
                                                        value={level.value}
                                                        checked={assessments[student.id]?.level === level.value}
                                                        onChange={() => handleAssessmentChange(student.id, level.value)}
                                                        disabled={assessments[student.id]?.notApplicable}
                                                        className="form-radio h-4 w-4 text-indigo-600 transition duration-150 ease-in-out"
                                                    />
                                                </td>
                                            ))}
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                                                <input
                                                    type="checkbox"
                                                    checked={assessments[student.id]?.notApplicable || false}
                                                    onChange={(e) => handleNotApplicableChange(student.id, e.target.checked)}
                                                    className="form-checkbox h-4 w-4 text-indigo-600 transition duration-150 ease-in-out"
                                                />
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                <input
                                                    type="text"
                                                    value={assessments[student.id]?.observacoes || ''}
                                                    onChange={(e) => handleObservacaoChange(student.id, e.target.value)}
                                                    disabled={assessments[student.id]?.notApplicable}
                                                    className="w-full px-2 py-1 border border-gray-300 rounded-md disabled:bg-gray-100"
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <div className="items-center px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                                <button type="submit" className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm">
                                    Guardar Avaliações
                                </button>
                                <button type="button" onClick={onClose} className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm">
                                    Fechar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AssessmentModal;
