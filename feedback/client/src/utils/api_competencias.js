import { feedbackClient, handleRequest } from './api';

// Fetch all competencies for a specific discipline
export const fetchCompetenciesByDiscipline = (disciplineId) => 
    handleRequest(() => feedbackClient.get(`/competencias/disciplina/${disciplineId}`), 'fetchCompetenciesByDiscipline');

// Fetch a single competency by its ID
export const fetchCompetencyById = (id) => 
    handleRequest(() => feedbackClient.get(`/competencias/${id}`), 'fetchCompetencyById');

// Create a new competency
export const createCompetency = (competencyData) => 
    handleRequest(() => feedbackClient.post('/competencias', competencyData), 'createCompetency');

// Update an existing competency
export const updateCompetency = (id, competencyData) => 
    handleRequest(() => feedbackClient.put(`/competencias/${id}`, competencyData), 'updateCompetency');

// Deactivate (soft delete) a competency
export const deleteCompetency = (id) => 
    handleRequest(() => feedbackClient.delete(`/competencias/${id}`), 'deleteCompetency');

// Fetch eligible students for a competency assessment based on the competency's educational measure
export const fetchEligibleStudentsForCompetency = (competenciaId, disciplinaTurmaId) => 
    handleRequest(() => feedbackClient.get(`/competencias/${competenciaId}/eligible-students?disciplina_turma_id=${disciplinaTurmaId}`), 'fetchEligibleStudentsForCompetency');

// Fetch students for a specific discipline_turma to be assessed on a competency
export const fetchStudentsForCompetencyAssessment = (disciplineTurmaId) => 
    handleRequest(() => feedbackClient.get(`/competencias/disciplina_turma/${disciplineTurmaId}/students`), 'fetchStudentsForCompetencyAssessment');

// Save a batch of competency assessments
export const saveCompetencyAssessments = (competencyId, assessmentData) => 
    handleRequest(() => feedbackClient.post(`/competencias/${competencyId}/avaliacoes`, assessmentData), 'saveCompetencyAssessments');

// Delete an entire evaluation moment and its assessments
export const deleteEvaluationMoment = (competencyId, momento, disciplinaTurmaId) => {
    const url = `/competencias/${competencyId}/avaliacoes/momentos?momento_avaliacao=${encodeURIComponent(momento)}&disciplina_turma_id=${disciplinaTurmaId}`;
    return handleRequest(() => feedbackClient.delete(url), 'deleteEvaluationMoment');
};

// Fetch all evaluation moments for a competency, optionally filtered by class
export const fetchEvaluationMoments = (competencyId, disciplinaTurmaId) => {
    let url = `/competencias/${competencyId}/avaliacoes/momentos`;
    if (disciplinaTurmaId) {
        url += `?disciplina_turma_id=${disciplinaTurmaId}`;
    }
    return handleRequest(() => feedbackClient.get(url), 'fetchEvaluationMoments');
};

// Fetch evaluations for a competency and moment
export const fetchAssessmentsForMoment = (competencyId, momento) =>
    handleRequest(() => feedbackClient.get(`/competencias/${competencyId}/avaliacoes?momento=${momento}`), 'fetchAssessmentsForMoment');

// Fetch the most recent evaluations for a competency
export const fetchRecentAssessments = (competencyId) =>
    handleRequest(() => feedbackClient.get(`/competencias/${competencyId}/avaliacoes/recent`), 'fetchRecentAssessments');

// Fetch all competency evaluations for a student
export const fetchStudentCompetencyEvaluations = (studentId) =>
    handleRequest(() => feedbackClient.get(`/students/${studentId}/competencies/evaluations`), 'fetchStudentCompetencyEvaluations');

// Fetch historical proficiency levels for a specific student, competency, and discipline
export const fetchCompetencyHistory = (studentId, disciplinaTurmaId, competencyId) =>
    handleRequest(() => feedbackClient.get(`/students/${studentId}/disciplines/${disciplinaTurmaId}/competencies/${competencyId}/history`), 'fetchCompetencyHistory');
