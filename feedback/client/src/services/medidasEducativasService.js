import axios from 'axios';

const API_URL = '/api/feedback/medidas';
const STUDENTS_API_URL = '/api/feedback/students';
const USERS_API_URL = '/api/feedback/users';


const getToken = () => {
    // The useAuth hook stores it as 'authToken'
    return localStorage.getItem('authToken');
};

const getAuthHeaders = () => {
    const token = getToken();
    if (!token) {
        // Handle case where token is not found, maybe redirect to login
        console.error('Authentication token not found.');
        // For now, we'll let the request fail, but a real app should handle this gracefully.
        return {};
    }
    return { Authorization: `Bearer ${token}` };
};

/**
 * Fetches all educational measures for a specific student.
 * @param {string} alunoId The UUID of the student.
 * @returns {Promise<Array>} A promise that resolves to an array of measures.
 */
export const getMedidasByAluno = async (alunoId) => {
    const response = await axios.get(`${API_URL}/aluno/${alunoId}`, {
        headers: getAuthHeaders(),
    });
    return response.data;
};

/**
 * Creates a new educational measure.
 * @param {object} medidaData The data for the new measure.
 * @returns {Promise<object>} A promise that resolves to the newly created measure.
 */
export const createMedida = async (medidaData) => {
    const response = await axios.post(API_URL, medidaData, {
        headers: getAuthHeaders(),
    });
    return response.data;
};

/**
 * Updates an existing educational measure.
 * @param {string} id The UUID of the measure to update.
 * @param {object} medidaData The updated data for the measure.
 * @returns {Promise<object>} A promise that resolves to the updated measure.
 */
export const updateMedida = async (id, medidaData) => {
    const response = await axios.put(`${API_URL}/${id}`, medidaData, {
        headers: getAuthHeaders(),
    });
    return response.data;
};

/**
 * Deletes an educational measure.
 * @param {string} id The UUID of the measure to delete.
 * @returns {Promise<void>} A promise that resolves when the measure is deleted.
 */
export const deleteMedida = async (id) => {
    await axios.delete(`${API_URL}/${id}`, {
        headers: getAuthHeaders(),
    });
};

/**
 * Fetches all subjects for a specific student.
 * @param {string} studentId The UUID of the student.
 * @returns {Promise<Array>} A promise that resolves to an array of subjects.
 */
export const getStudentSubjects = async (studentId) => {
    const response = await axios.get(`${STUDENTS_API_URL}/${studentId}/disciplines`, {
        headers: getAuthHeaders(),
    });
    return response.data;
};

/**
 * Fetches all students taught by the logged-in professor, grouped by class.
 * @returns {Promise<Array>} A promise that resolves to an array of classes, each with a list of students.
 */
export const getProfessorStudents = async () => {
    const response = await axios.get(`${USERS_API_URL}/professor/my-students`, {
        headers: getAuthHeaders(),
    });
    return response.data;
};
