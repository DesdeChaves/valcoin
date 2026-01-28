import axios from 'axios';
import { toast } from 'react-toastify';

export const MAX_EXTERNAL_DISCIPLINES = 5; // Export this for frontend checks

// Base URL for the memoria API, assuming it's part of valcoin-admin
const apiClient = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api/memoria', // Adjust if memoria has a different base URL
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      toast.error('Sessão expirada ou acesso negado. Por favor, faça login novamente.');
      localStorage.removeItem('authToken');
      window.location.href = '/'; // Redirect to login page
    }
    return Promise.reject(error);
  }
);

// Helper function for consistent API requests
const handleRequest = async (request, endpointName) => {
  try {
    const response = await request();
    return response.data;
  } catch (error) {
    console.error(`${endpointName} failed:`, error);
    throw error;
  }
};

// ============================================================================
// EXTERNAL DISCIPLINE MANAGEMENT
// ============================================================================

export const getAvailableDisciplines = () => 
  handleRequest(() => apiClient.get('/disciplines/available'), 'getAvailableDisciplines');

export const subscribeToDiscipline = (disciplineId) => 
  handleRequest(() => apiClient.post(`/disciplines/${disciplineId}/subscribe`), 'subscribeToDiscipline');

export const getMySubscribedDisciplines = () => 
  handleRequest(() => apiClient.get('/disciplines/my'), 'getMySubscribedDisciplines');

// ============================================================================
// FLASHCARD REVIEW (STUDENT)
// ============================================================================

export const getDailyQueue = (disciplineId = null) => { // Modified to accept disciplineId
  const params = disciplineId ? `?discipline_id=${disciplineId}` : '';
  return handleRequest(() => apiClient.get(`/fila-diaria${params}`), 'getDailyQueue');
};

export const registerReview = (data) =>
  handleRequest(() => apiClient.post('/revisao', data), 'registerReview');

export const getFlashcardReviewTimePercentiles = (flashcardId) =>
  handleRequest(() => apiClient.get(`/flashcards/${flashcardId}/review-times-percentiles`), 'getFlashcardReviewTimePercentiles');

export const getStudentEnrolledDisciplines = () =>
  handleRequest(() => apiClient.get('/student/disciplines'), 'getStudentEnrolledDisciplines'); // New API call

export const requestFlashcardReview = (data) => {
  return apiClient.post('/flashcards/request-review', data);
};


// ============================================================================
// FLASHCARD MANAGEMENT (PROFESSOR)
// ============================================================================

export const getFlashcardReviewRequests = () => 
    handleRequest(() => apiClient.get('/flashcards/review-requests'), 'getFlashcardReviewRequests');

export const updateFlashcardReviewRequest = (id, data) => {
    return apiClient.put(`/flashcards/review-requests/${id}`, data);
};

export const getProfessorDisciplines = () =>
  handleRequest(() => apiClient.get('/professor/disciplines'), 'getProfessorDisciplines');

export const createFlashcard = (data) =>
  handleRequest(() => apiClient.post('/flashcards', data), 'createFlashcard');

export const getProfessorFlashcards = (disciplineId) => {
  const params = disciplineId ? `?discipline_id=${disciplineId}` : '';
  return handleRequest(() => apiClient.get(`/flashcards${params}`), 'getProfessorFlashcards');
};

export const editFlashcard = (id, data) =>
  handleRequest(() => apiClient.put(`/flashcards/${id}`, data), 'editFlashcard');

export const deleteFlashcard = (id) =>
  handleRequest(() => apiClient.delete(`/flashcards/${id}`), 'deleteFlashcard');

export const getProfessorAssuntos = (disciplineId) =>
  handleRequest(() => apiClient.get(`/assuntos/disciplina/${disciplineId}`), 'getProfessorAssuntos');
  
export const shareFlashcard = (flashcardId, disciplina_ids) =>
  handleRequest(() => apiClient.post(`/flashcards/${flashcardId}/share`, { disciplina_ids }), 'shareFlashcard');

export const getSharedDisciplines = (flashcardId) =>
  handleRequest(() => apiClient.get(`/flashcards/${flashcardId}/shared-disciplines`), 'getSharedDisciplines');

export const uploadImage = (formData) =>
  handleRequest(() => apiClient.post('/upload-image', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }), 'uploadImage');

export const importFlashcardsCSV = (formData) =>
  handleRequest(() => apiClient.post('/flashcards/import-csv', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }), 'importFlashcardsCSV');

// ============================================================================
// AUDIO FLASHCARD SPECIFIC
// ============================================================================

export const createPhoneticFlashcard = (data) =>
  handleRequest(() => apiClient.post('/audio-flashcards/phonetic', data), 'createPhoneticFlashcard');
export const createDictationFlashcard = (data) =>
  handleRequest(() => apiClient.post('/audio-flashcards/dictation', data), 'createDictationFlashcard');
export const createAudioQuestionFlashcard = (data) =>
  handleRequest(() => apiClient.post('/audio-flashcards/audio-question', data), 'createAudioQuestionFlashcard');
export const createReadingFlashcard = (data) =>
  handleRequest(() => apiClient.post('/audio-flashcards/reading', data), 'createReadingFlashcard');
export const createSpellingFlashcard = (data) =>
  handleRequest(() => apiClient.post('/audio-flashcards/spelling', data), 'createSpellingFlashcard');
export const generateAudioFlashcard = (flashcardId) =>
  handleRequest(() => apiClient.get(`/audio-flashcards/${flashcardId}/generate-audio`), 'generateAudioFlashcard');
export const validateTextAnswer = (data) =>
  handleRequest(() => apiClient.post('/audio-flashcards/review/text', data), 'validateTextAnswer');
export const validateAudioAnswer = (formData) =>
  handleRequest(() => apiClient.post('/audio-flashcards/review/audio', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }), 'validateAudioAnswer');
export const getAudioAnalytics = () =>
  handleRequest(() => apiClient.get('/audio-flashcards/analytics'), 'getAudioAnalytics');
export const getAudioFlashcardQueue = () =>
  handleRequest(() => apiClient.get('/audio-flashcards/queue'), 'getAudioFlashcardQueue');

// ============================================================================
// ANALYTICS (PROFESSOR)
// ============================================================================
export const getProfessorAnalytics = (disciplineId) =>
  handleRequest(() => apiClient.get(`/analytics/disciplina/${disciplineId}`), 'getProfessorAnalytics');


// Default export all named exports
export default {
  MAX_EXTERNAL_DISCIPLINES,
  getAvailableDisciplines,
  subscribeToDiscipline,
  getMySubscribedDisciplines,
  getDailyQueue,
  registerReview,
  getFlashcardReviewTimePercentiles,
  getStudentEnrolledDisciplines, // New export
  getProfessorDisciplines,
  createFlashcard,
  getProfessorFlashcards,
  editFlashcard,
  deleteFlashcard,
  getProfessorAssuntos,
  shareFlashcard,
  getSharedDisciplines,
  uploadImage,
  importFlashcardsCSV,
  createPhoneticFlashcard,
  createDictationFlashcard,
  createAudioQuestionFlashcard,
  createReadingFlashcard,
  createSpellingFlashcard,
  generateAudioFlashcard,
  validateTextAnswer,
  validateAudioAnswer,
  getAudioAnalytics,
  getAudioFlashcardQueue,
  getProfessorAnalytics,
};