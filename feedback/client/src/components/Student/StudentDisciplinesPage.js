import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchStudentDisciplines } from '../../utils/api'; // Assuming this function exists or will be created

const StudentDisciplinesPage = () => {
    const navigate = useNavigate();
    const [disciplines, setDisciplines] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const studentId = JSON.parse(localStorage.getItem('user'))?.id;

    useEffect(() => {
        if (studentId) {
            const getDisciplines = async () => {
                try {
                    setLoading(true);
                    const response = await fetchStudentDisciplines(studentId); // API call to fetch student's disciplines
                    setDisciplines(response);
                    setError(null);
                } catch (err) {
                    setError('Error fetching disciplines');
                    console.error('Error fetching disciplines:', err);
                } finally {
                    setLoading(false);
                }
            };
            getDisciplines();
        } else {
            setError('Student ID not found.');
            setLoading(false);
        }
    }, [studentId]);

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Carregando disciplinas...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 p-6">
                <div className="max-w-7xl mx-auto">
                    <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
                        <div className="flex">
                            <svg className="w-5 h-5 text-red-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <div>
                                <p className="font-semibold text-red-800">Erro</p>
                                <p className="text-red-700">{error}</p>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={() => navigate(-1)}
                        className="mt-4 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                    >
                        Voltar
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <h1 className="text-2xl font-semibold text-gray-800">Minhas Disciplinas</h1>
                    <p className="text-sm text-gray-500 mt-1">Selecione uma disciplina para ver os dossiês</p>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-6">
                {disciplines.length === 0 ? (
                    <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                        <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                        <p className="text-lg text-gray-600 mb-2">Nenhuma disciplina encontrada</p>
                        <p className="text-sm text-gray-500">Parece que ainda não está matriculado em nenhuma disciplina.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {disciplines.map((discipline) => (
                            <Link 
                                key={discipline.id} 
                                to={`/discipline/${discipline.id}`}
                                className="block bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow duration-300"
                            >
                                <div className="flex items-center mb-4">
                                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                                        <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                        </svg>
                                    </div>
                                    <h2 className="text-xl font-semibold text-gray-800">{discipline.nome}</h2>
                                    <p className="text-sm text-gray-500">{discipline.turma_nome}</p>
                                </div>
                                <p className="text-gray-600 text-sm">Clique para ver os dossiês desta disciplina.</p>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default StudentDisciplinesPage;
