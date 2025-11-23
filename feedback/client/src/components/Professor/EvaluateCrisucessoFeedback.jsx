import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import {
  getProfessorApplicableCriteria,
  getStudentsForCriterion,
  getApplicableCrisucessoFeedbackEvaluation,
  submitCrisucessoFeedbackEvaluation,
  updateCrisucessoFeedbackEvaluation,
  getStudentCrisucessoFeedbackEvaluations,
} from '../../utils/api';
import useAuth from '../../hooks/useAuth';
import Select from 'react-select';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

const EvaluateCrisucessoFeedback = () => {
  const { user } = useAuth();
  
  // State for new workflow
  const [criteria, setCriteria] = useState([]);
  const [selectedCriterion, setSelectedCriterion] = useState(null);
  
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  
  // State for evaluation details
  const [criterionDetails, setCriterionDetails] = useState(null); // Holds details for the selected student-criterion pair
  const [evaluationsHistory, setEvaluationsHistory] = useState({});
  const [loading, setLoading] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  
  // Form states
  const [formState, setFormState] = useState({});
  const [editFormState, setEditFormState] = useState({});

  // 1. Fetch criteria professor can evaluate
  useEffect(() => {
    const fetchCriteria = async () => {
      setLoading(true);
      try {
        const fetchedCriteria = await getProfessorApplicableCriteria();
        const options = fetchedCriteria.map(c => ({
          value: c.criterio_id,
          label: `${c.criterio_codigo} - ${c.criterio_nome}`,
        }));
        setCriteria(options);
      } catch (error) {
        console.error('Failed to fetch applicable criteria for professor:', error);
        toast.error('Erro ao carregar a sua lista de critérios avaliáveis.');
      } finally {
        setLoading(false);
      }
    };
    fetchCriteria();
  }, []);

  // 2. Fetch students when a criterion is selected
  useEffect(() => {
    const fetchStudents = async () => {
      if (!selectedCriterion) {
        setStudents([]);
        setSelectedStudent(null);
        return;
      }
      setLoadingStudents(true);
      setSelectedStudent(null); // Reset student selection
      setCriterionDetails(null); // Reset details
      try {
        const fetchedStudents = await getStudentsForCriterion(selectedCriterion.value);
        const options = fetchedStudents.map(s => ({
          value: s.id,
          label: `${s.nome} (${s.turma_nome})`,
        }));
        setStudents(options);
      } catch (error) {
        console.error('Failed to fetch students for criterion:', error);
        toast.error('Erro ao carregar alunos para este critério.');
      } finally {
        setLoadingStudents(false);
      }
    };
    fetchStudents();
  }, [selectedCriterion]);

  // 3. Fetch specific evaluation details when a student is selected
  useEffect(() => {
    const fetchCriterionDetailsForStudent = async () => {
      if (!selectedStudent || !selectedCriterion) {
        setCriterionDetails(null);
        return;
      }
      setLoadingDetails(true);
      try {
        // This API call gets criterion details tailored to a specific student
        const applicableCriteriaForStudent = await getApplicableCrisucessoFeedbackEvaluation(selectedStudent.value);
        const details = applicableCriteriaForStudent.find(c => c.criterio_id === selectedCriterion.value);
        
        setCriterionDetails(details);

        if (details) {
          // Initialize form state for this criterion
          setFormState(prev => ({
            ...prev,
            [details.criterio_id]: {
              pontuacao: '',
              observacoes: '',
              disciplina_id: details.eligible_discipline_ids && details.eligible_discipline_ids.length > 0
                ? details.eligible_discipline_ids[0]
                : null,
            },
          }));
        }
      } catch (error) {
        console.error('Failed to fetch criterion details for student:', error);
        toast.error('Erro ao carregar os detalhes da avaliação para este aluno.');
      } finally {
        setLoadingDetails(false);
      }
    };
    fetchCriterionDetailsForStudent();
  }, [selectedStudent, selectedCriterion]);

  const fetchEvaluationHistory = useCallback(async (criterionId) => {
    if (!selectedStudent || !criterionId) return;
    try {
      const history = await getStudentCrisucessoFeedbackEvaluations(selectedStudent.value, criterionId);
      setEvaluationsHistory(prev => ({ ...prev, [criterionId]: history }));
    } catch (error) {
      console.error(`Failed to fetch evaluation history for criterion ${criterionId}:`, error);
      toast.error('Erro ao carregar histórico de avaliações.');
    }
  }, [selectedStudent]);

  // Handlers for form changes, submission, and updates remain largely the same
  const handleFormChange = (criterionId, field, value) => {
    setFormState(prev => ({
      ...prev,
      [criterionId]: {
        ...prev[criterionId],
        [field]: value,
      },
    }));
  };

  const handleEditFormChange = (evaluationId, field, value) => {
    setEditFormState(prev => ({
      ...prev,
      [evaluationId]: {
        ...prev[evaluationId],
        [field]: value,
      },
    }));
  };

  const handleSubmitEvaluation = async (criterionId) => {
    const evaluationData = formState[criterionId];
    if (!evaluationData || evaluationData.pontuacao === '' || evaluationData.disciplina_id === null) {
      toast.error('Por favor, preencha a pontuação e selecione a disciplina.');
      return;
    }
    setLoading(true);
    try {
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth();
      const periodo = currentMonth < 4 ? '1º Trimestre' : currentMonth < 8 ? '2º Trimestre' : '3º Trimestre';
      
      await submitCrisucessoFeedbackEvaluation({
        criterio_sucesso_id: criterionId,
        aluno_id: selectedStudent.value,
        disciplina_id: evaluationData.disciplina_id,
        pontuacao: parseFloat(evaluationData.pontuacao),
        ano_letivo: `${currentYear}/${currentYear + 1}`,
        ano_escolaridade_aluno: criterionDetails?.ano_escolaridade_inicial,
        periodo: periodo,
        observacoes: evaluationData.observacoes,
      });
      toast.success('Avaliação submetida com sucesso!');
      // Refresh details and history
      const applicableCriteriaForStudent = await getApplicableCrisucessoFeedbackEvaluation(selectedStudent.value);
      setCriterionDetails(applicableCriteriaForStudent.find(c => c.criterio_id === criterionId));
      fetchEvaluationHistory(criterionId);
      setFormState(prev => ({
        ...prev,
        [criterionId]: { ...prev[criterionId], pontuacao: '', observacoes: '' },
      }));
    } catch (error) {
      console.error('Failed to submit evaluation:', error);
      toast.error(error.response?.data?.error || 'Erro ao submeter avaliação.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateEvaluation = async (evaluationId, criterionId) => {
    const updatedData = editFormState[evaluationId];
    if (!updatedData || updatedData.pontuacao === '') {
      toast.error('Por favor, preencha a pontuação para a atualização.');
      return;
    }
    setLoading(true);
    try {
      await updateCrisucessoFeedbackEvaluation(evaluationId, {
        pontuacao: parseFloat(updatedData.pontuacao),
        observacoes: updatedData.observacoes,
      });
      toast.success('Avaliação atualizada com sucesso!');
      fetchEvaluationHistory(criterionId);
      setEditFormState(prev => {
        const newState = { ...prev };
        delete newState[evaluationId];
        return newState;
      });
    } catch (error) {
      console.error('Failed to update evaluation:', error);
      toast.error(error.response?.data?.error || 'Erro ao atualizar avaliação.');
    } finally {
      setLoading(false);
    }
  };

  // Render evaluation form for a single criterion
  const renderEvaluationForm = (criterion) => {
    const criterionId = criterion.criterio_id;

    return (
        <div key={criterionId} className="bg-white p-6 rounded-lg shadow-md border border-gray-200 mt-6">
            <h4 className="text-lg font-bold text-indigo-700 mb-2">{criterion.nome} ({criterion.codigo})</h4>
            <p className="text-sm text-gray-600 mb-4">{criterion.descricao}</p>
            <div className="text-sm text-gray-700 space-y-1 mb-4">
            <p><strong>Departamentos:</strong> {criterion.departamentos_nomes.join(', ')}</p>
            <p><strong>Ano Escolar Inicial:</strong> {criterion.ano_escolaridade_inicial}</p>
            <p><strong>Nível Aceitável:</strong> {criterion.nivel_aceitavel}</p>
            <p><strong>Média Atual:</strong> {criterion.current_average_score !== null ? criterion.current_average_score : 'N/A'}</p>
            <p><strong>Ciclo de Avaliação:</strong> {criterion.periodicidade_avaliacao}</p>
            <p><strong>Já Atingiu Nível:</strong> {criterion.has_met_level ? 'Sim' : 'Não'}</p>
            </div>
            
            <div className="mb-4">
                <label htmlFor={`discipline-${criterionId}`} className="block text-sm font-medium text-gray-700">
                    Avaliar com Disciplina:
                </label>
                <select
                    id={`discipline-${criterionId}`}
                    value={formState[criterionId]?.disciplina_id || ''}
                    onChange={(e) => handleFormChange(criterionId, 'disciplina_id', e.target.value)}
                    className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm"
                    disabled={!criterion.can_evaluate}
                >
                    <option value="">Selecione a Disciplina</option>
                    {criterion.eligible_discipline_ids.map((discId, index) => (
                        <option key={discId} value={discId}>{criterion.eligible_discipline_names[index]}</option>
                    ))}
                </select>
            </div>

            {criterion.can_evaluate && !criterion.has_met_level && (
              <div className="space-y-3 mb-4">
                <div>
                  <label htmlFor={`pontuacao-${criterionId}`} className="block text-sm font-medium text-gray-700">Pontuação (0-10):</label>
                  <input
                    type="number"
                    id={`pontuacao-${criterionId}`}
                    value={formState[criterionId]?.pontuacao || ''}
                    onChange={(e) => handleFormChange(criterionId, 'pontuacao', e.target.value)}
                    min="0"
                    max="10"
                    step="0.1"
                    className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm"
                  />
                </div>
                <div>
                  <label htmlFor={`observacoes-${criterionId}`} className="block text-sm font-medium text-gray-700">Observações:</label>
                  <textarea
                    id={`observacoes-${criterionId}`}
                    value={formState[criterionId]?.observacoes || ''}
                    onChange={(e) => handleFormChange(criterionId, 'observacoes', e.target.value)}
                    rows="3"
                    className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm"
                  ></textarea>
                </div>
                <button
                  onClick={() => handleSubmitEvaluation(criterionId)}
                  className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                  disabled={loading || !formState[criterionId]?.disciplina_id}
                >
                  Submeter Avaliação
                </button>
              </div>
            )}
            {!criterion.can_evaluate && (
              <p className="text-yellow-600 text-sm mt-2">Próxima avaliação permitida em novo ciclo.</p>
            )}
            {criterion.has_met_level && (
                <p className="text-green-600 text-sm mt-2">Aluno já atingiu o nível aceitável para este critério.</p>
            )}

            <div className="mt-4 border-t pt-4">
                <h5 className="text-md font-semibold mb-2">Histórico de Avaliações</h5>
                <button
                    onClick={() => fetchEvaluationHistory(criterionId)}
                    className="text-indigo-500 hover:text-indigo-700 text-sm mb-2"
                >
                    {evaluationsHistory[criterionId] ? 'Recarregar Histórico' : 'Ver Histórico'}
                </button>
                {evaluationsHistory[criterionId] && evaluationsHistory[criterionId].length > 0 ? (
                <ul className="space-y-2 text-sm">
                    {evaluationsHistory[criterionId].map((evalItem) => (
                    <li key={evalItem.id} className="bg-gray-50 p-3 rounded-md border border-gray-100">
                        {editFormState[evalItem.id] ? (
                        <div className="space-y-2">
                            {/* ... edit form fields ... */}
                        </div>
                        ) : (
                        <>
                            <p><strong>Pontuação:</strong> {evalItem.pontuacao}</p>
                            <p><strong>Por:</strong> {evalItem.professor_nome} ({evalItem.disciplina_nome})</p>
                            <p><strong>Data:</strong> {format(new Date(evalItem.created_at), 'dd/MM/yyyy HH:mm', { locale: pt })}</p>
                            {evalItem.observacoes && <p><strong>Obs:</strong> {evalItem.observacoes}</p>}
                            {evalItem.can_amend && (
                            <button
                                onClick={() => setEditFormState(prev => ({ ...prev, [evalItem.id]: { pontuacao: evalItem.pontuacao, observacoes: evalItem.observacoes } }))}
                                className="text-blue-500 hover:text-blue-700 text-xs mt-1"
                            >
                                Alterar Avaliação (8 dias)
                            </button>
                            )}
                        </>
                        )}
                    </li>
                    ))}
                </ul>
                ) : (
                evaluationsHistory[criterionId] && <p className="text-gray-500 text-sm">Nenhuma avaliação encontrada.</p>
                )}
            </div>
        </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-2xl font-bold mb-6">Avaliar Critérios de Sucesso (Feedback)</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <label htmlFor="criterion-select" className="block text-sm font-medium text-gray-700 mb-2">
            1. Selecionar Critério de Sucesso:
          </label>
          <Select
            id="criterion-select"
            options={criteria}
            value={selectedCriterion}
            onChange={setSelectedCriterion}
            placeholder="Pesquisar e selecionar critério..."
            isLoading={loading}
            isClearable
            isSearchable
            className="basic-single"
            classNamePrefix="select"
          />
        </div>
        
        <div>
          <label htmlFor="student-select" className="block text-sm font-medium text-gray-700 mb-2">
            2. Selecionar Aluno:
          </label>
          <Select
            id="student-select"
            options={students}
            value={selectedStudent}
            onChange={setSelectedStudent}
            placeholder={!selectedCriterion ? "Selecione um critério primeiro" : "Pesquisar e selecionar aluno..."}
            isLoading={loadingStudents}
            isClearable
            isSearchable
            isDisabled={!selectedCriterion || students.length === 0}
            className="basic-single"
            classNamePrefix="select"
            noOptionsMessage={() => 'Nenhum aluno elegível para este critério'}
          />
        </div>
      </div>

      {loadingDetails && <p>A carregar detalhes da avaliação...</p>}

      {!loadingDetails && selectedStudent && criterionDetails && (
        <div className="space-y-8">
          <h3 className="text-xl font-semibold">Avaliação de {selectedStudent.label} para o critério {selectedCriterion.label}</h3>
          {renderEvaluationForm(criterionDetails)}
        </div>
      )}
       {!loadingDetails && selectedStudent && !criterionDetails && (
           <p className="text-gray-600 mt-4">Este aluno não é elegível ou já concluiu a avaliação para o critério selecionado.</p>
       )}
    </div>
  );
};

export default EvaluateCrisucessoFeedback;