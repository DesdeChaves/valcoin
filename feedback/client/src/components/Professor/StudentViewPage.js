import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchProfessorDisciplines, fetchDossiersByDiscipline, fetchStudentsProfessorByDiscipline } from '../../utils/api';

function StudentViewPage() {
    const [disciplines, setDisciplines] = useState([]);
    const [dossiers, setDossiers] = useState([]);
    const [students, setStudents] = useState([]);
    const [selectedDiscipline, setSelectedDiscipline] = useState('');
    const [selectedStudent, setSelectedStudent] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user || user.tipo_utilizador !== 'PROFESSOR') {
            navigate('/login');
            return;
        }

        const loadDisciplines = () => {
            fetchProfessorDisciplines(user.id)
                .then(response => {
                    setDisciplines(response.data);
                })
                .catch(err => {
                    setError('Failed to load disciplines.');
                })
                .finally(() => {
                    setLoading(false);
                });
        };

        loadDisciplines();
    }, [navigate]);

    const handleDisciplineChange = (disciplineId) => {
        setSelectedDiscipline(disciplineId);
        setSelectedStudent('');
        setDossiers([]);
        setStudents([]);
        if (disciplineId) {
            // Fetch dossiers
            fetchDossiersByDiscipline(disciplineId)
                .then(dossiersResponse => {
                    setDossiers(dossiersResponse.data.dossies);
                })
                .catch(err => {
                    setError('Failed to load dossiers.');
                });

            // Fetch students
            fetchStudentsProfessorByDiscipline(disciplineId)
                .then(studentsResponse => {
                    setStudents(studentsResponse.data);
                })
                .catch(err => {
                    setError('Failed to load students.');
                });
        }
    };

    const handleStudentChange = (studentId) => {
        setSelectedStudent(studentId);
    };

    const handleViewGrades = () => {
        if (selectedDiscipline && selectedStudent) {
            navigate(`/professor/student-grades/${selectedStudent}`);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
                <div className="text-center">
                    <div className="relative w-20 h-20 mx-auto mb-6">
                        <div className="absolute inset-0 border-4 border-blue-200 rounded-full"></div>
                        <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
                    </div>
                    <p className="text-lg text-gray-700 font-medium">Carregando disciplinas...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 shadow-sm">
                <div className="max-w-5xl mx-auto px-6 py-6">
                    <div className="flex items-center space-x-4">
                        <button
                            onClick={() => navigate(-1)}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            aria-label="Voltar"
                        >
                            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                        </button>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Vista de Aluno</h1>
                            <p className="text-sm text-gray-600 mt-1">Consulte as notas dos seus alunos por disciplina</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-6 py-8">
                {/* Error Message */}
                {error && (
                    <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
                        <div className="flex">
                            <svg className="w-5 h-5 text-red-500 mr-3 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <div>
                                <p className="font-semibold text-red-800">Erro</p>
                                <p className="text-red-700 text-sm">{error}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Main Card */}
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                    {/* Card Header */}
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-6">
                        <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                                </svg>
                            </div>
                            <div>
                                <h2 className="text-xl font-semibold text-white">Seleção de Aluno</h2>
                                <p className="text-blue-100 text-sm">Escolha a disciplina e o aluno para visualizar as notas</p>
                            </div>
                        </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-8 space-y-6">
                        {/* Discipline Selection */}
                        <div>
                            <label htmlFor="discipline-select" className="flex items-center text-sm font-semibold text-gray-700 mb-3">
                                <svg className="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                </svg>
                                Disciplina (Turma)
                            </label>
                            <div className="relative">
                                <select 
                                    id="discipline-select" 
                                    onChange={(e) => handleDisciplineChange(e.target.value)} 
                                    value={selectedDiscipline} 
                                    className="w-full pl-4 pr-10 py-3 text-base border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-gray-50 hover:bg-white"
                                >
                                    <option value="">Selecione uma disciplina</option>
                                    {disciplines.map(d => (
                                        <option key={d.professor_disciplina_turma_id} value={d.professor_disciplina_turma_id}>
                                            {d.subject_name} - {d.class_name}
                                        </option>
                                    ))}
                                </select>
                                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </div>
                            {disciplines.length > 0 && (
                                <p className="mt-2 text-xs text-gray-500 flex items-center">
                                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                    </svg>
                                    {disciplines.length} disciplina{disciplines.length !== 1 ? 's' : ''} disponível{disciplines.length !== 1 ? 'is' : ''}
                                </p>
                            )}
                        </div>

                        {/* Student Selection */}
                        <div>
                            <label htmlFor="student-select" className="flex items-center text-sm font-semibold text-gray-700 mb-3">
                                <svg className="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                Aluno
                            </label>
                            <div className="relative">
                                <select 
                                    id="student-select" 
                                    onChange={(e) => handleStudentChange(e.target.value)} 
                                    value={selectedStudent} 
                                    disabled={!selectedDiscipline}
                                    className={`w-full pl-4 pr-10 py-3 text-base border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                                        !selectedDiscipline 
                                            ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed' 
                                            : 'bg-gray-50 hover:bg-white border-gray-200'
                                    }`}
                                >
                                    <option value="">Selecione um aluno</option>
                                    {students.map(s => (
                                        <option key={s.id} value={s.id}>
                                            {s.nome}
                                        </option>
                                    ))}
                                </select>
                                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </div>
                            {selectedDiscipline && students.length > 0 && (
                                <p className="mt-2 text-xs text-gray-500 flex items-center">
                                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                                    </svg>
                                    {students.length} aluno{students.length !== 1 ? 's' : ''} encontrado{students.length !== 1 ? 's' : ''}
                                </p>
                            )}
                            {selectedDiscipline && students.length === 0 && (
                                <p className="mt-2 text-xs text-amber-600 flex items-center">
                                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                    Nenhum aluno matriculado nesta disciplina
                                </p>
                            )}
                        </div>

                        {/* View Grades Button */}
                        <div className="pt-4">
                            <button 
                                onClick={handleViewGrades} 
                                disabled={!selectedDiscipline || !selectedStudent}
                                className={`w-full py-4 px-6 rounded-xl font-semibold text-white transition-all transform flex items-center justify-center space-x-2 ${
                                    selectedDiscipline && selectedStudent
                                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]'
                                        : 'bg-gray-300 cursor-not-allowed opacity-60'
                                }`}
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <span>Ver Pauta do Aluno</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Info Cards */}
                {selectedDiscipline && (
                    <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                            <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-sm text-blue-600 font-medium">Dossiês Disponíveis</p>
                                    <p className="text-2xl font-bold text-blue-900">{dossiers.length}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100">
                            <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                                    <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-sm text-indigo-600 font-medium">Alunos na Turma</p>
                                    <p className="text-2xl font-bold text-indigo-900">{students.length}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default StudentViewPage;
