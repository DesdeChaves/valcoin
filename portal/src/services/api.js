// portal/src/services/api.js
import axios from 'axios';

console.log("REACT_APP_API_URL:", process.env.REACT_APP_API_URL);
const publicApiClient = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
});

/**
 * Fetches the public EQAVET dashboard data from the backend.
 * This endpoint is cached by Redis on the server.
 */
export const getEqavetDashboard = async () => {
  try {
    const res = await publicApiClient.get('/public/qualidade/equavet/dashboard');
    return res.data;
  } catch (error) {
    console.error("Error fetching EQAVET dashboard data:", error);
    // Return an empty array or handle the error as needed for the UI
    return [];
  }
};

export const getEqavetResumoAnual = async () => {
  try {
    const response = await publicApiClient.get('/qualidade/equavet/resumo-anual');
    return response.data;
  } catch (error) {
    console.error("Full error fetching EQAVET annual summary:", error);
    throw error;
  }
};

export const getInstrumentoAnalise = async () => {
  try {
    const response = await publicApiClient.get('/qualidade/equavet/instrumento-analise');
    return response.data;
  } catch (error) {
    console.error("Error fetching instrumento analise data:", error);
    throw error;
  }
};

export const getLegadosStats = async () => {
  try {
    const response = await publicApiClient.get('/public/legados/stats');
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getHousesStats = async () => {
  try {
    const response = await publicApiClient.get('/public/houses/stats');
    return response.data;
  } catch (error) {
    console.error("Error fetching houses stats:", error);
    throw error;
  }
};

export const getCriteriosSucessoStats = async () => {
  try {
    const response = await publicApiClient.get('/public/criterios-sucesso/stats');
    return response.data;
  } catch (error) {
    console.error("Error fetching criterios de sucesso stats:", error);
    throw error;
  }
};

export const getCompetenciasStats = async () => {
  try {
    const response = await publicApiClient.get('/public/competencias/stats');
    return response.data;
  } catch (error) {
    console.error("Error fetching competencias stats:", error);
    throw error;
  }
};
