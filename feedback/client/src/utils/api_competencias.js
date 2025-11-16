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

// Fetch students for a specific discipline_turma to be assessed on a competency
export const fetchStudentsForCompetencyAssessment = (disciplineTurmaId) => 
    handleRequest(() => feedbackClient.get(`/competencias/disciplina_turma/${disciplineTurmaId}/students`), 'fetchStudentsForCompetencyAssessment');

// Save a batch of competency assessments
export const saveCompetencyAssessments = (competencyId, assessmentData) => 
    handleRequest(() => feedbackClient.post(`/competencias/${competencyId}/avaliacoes`, assessmentData), 'saveCompetencyAssessments');

// Fetch all evaluation moments for a competency
export const fetchEvaluationMoments = (competencyId) =>
    handleRequest(() => feedbackClient.get(`/competencias/${competencyId}/avaliacoes/momentos`), 'fetchEvaluationMoments');

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
