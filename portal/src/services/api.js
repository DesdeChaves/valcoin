// portal/src/services/api.js
import axios from 'axios';

// ============================================================================
// AXIOS CLIENTS - Separate instances for different base URLs
// ============================================================================

// Main API client for Aurora system
const apiClient = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Feedback API client
const feedbackClient = axios.create({
  baseURL: (process.env.REACT_APP_API_URL || '') + '/api/feedback',
  headers: {
    'Content-Type': 'application/json',
  },
});


// ============================================================================
// SHARED INTERCEPTORS
// ============================================================================

const setupInterceptors = (client) => {
  // Request interceptor
  client.interceptors.request.use(
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
  client.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401 || error.response?.status === 403) {
        // Handle unauthorized/forbidden: e.g., redirect to login
        console.error('Authentication error:', error.response);
        // Example: Redirect to login page
        // window.location.href = '/login'; 
      }
      return Promise.reject(error);
    }
  );
};

setupInterceptors(apiClient);
setupInterceptors(feedbackClient);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export const handleRequest = async (request, endpointName) => {
  try {
    const response = await request();
    return response.data;
  } catch (error) {
    console.error(`${endpointName} failed:`, error.response?.data || error.message);
    throw error;
  }
};

// ============================================================================
// PUBLIC API CALLS (Frontend - no auth)
// ============================================================================
export const getEqavetDashboard = () => 
  handleRequest(() => publicApiClient.get('/public/qualidade/equavet/dashboard'), 'getEqavetDashboard');

export const getEqavetResumoAnual = () => 
  handleRequest(() => publicApiClient.get('/qualidade/equavet/resumo-anual'), 'getEqavetResumoAnual');

export const getInstrumentoAnalise = () =>
  handleRequest(() => publicApiClient.get('/qualidade/equavet/instrumento-analise'), 'getInstrumentoAnalise');

export const getLegadosStats = () =>
  handleRequest(() => publicApiClient.get('/public/legados/stats'), 'getLegadosStats');

export const getHousesStats = () =>
  handleRequest(() => publicApiClient.get('/public/houses/stats'), 'getHousesStats');

export const getCriteriosSucessoStats = () =>
  handleRequest(() => publicApiClient.get('/public/criterios-sucesso/stats'), 'getCriteriosSucessoStats');

export const getCompetenciasStats = () =>
  handleRequest(() => publicApiClient.get('/public/competencias/stats'), 'getCompetenciasStats');

// ============================================================================
// AUTHENTICATED API CALLS (Frontend - requires auth)
// ============================================================================

export const fetchCompetencyEvolutionByDiscipline = (disciplineId) =>
  handleRequest(() => feedbackClient.get(`/competencias/evolution-by-discipline/${disciplineId}`), 'fetchCompetencyEvolutionByDiscipline');
