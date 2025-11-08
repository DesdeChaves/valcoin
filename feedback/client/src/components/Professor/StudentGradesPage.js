import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchAllStudentProfessorGrades } from '../../utils/api';

function StudentGradesPage() {
    const { studentId } = useParams();
    const navigate = useNavigate();
    const [grades, setGrades] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [sortBy, setSortBy] = useState('date'); // 'date', 'best_results'

    useEffect(() => {
        const loadGrades = async () => {
            try {
                const response = await fetchAllStudentProfessorGrades(studentId);
                setGrades(response.data);
            } catch (err) {
                setError('Failed to load grades.');
            } finally {
                setLoading(false);
            }
        };

        loadGrades();
    }, [studentId]);

    const handleSortChange = (e) => {
        setSortBy(e.target.value);
    };

    const sortedGrades = [...grades].sort((a, b) => {
        if (sortBy === 'date') {
            return new Date(b.data_avaliacao) - new Date(a.data_avaliacao);
        } else if (sortBy === 'best_results') {
            return (b.nota || 0) - (a.nota || 0);
        }
        return 0;
    });

    // Group by discipline first, then by dossier
    const gradesByDiscipline = sortedGrades.reduce((acc, grade) => {
        const { disciplina_nome, dossier_nome } = grade;
        if (!acc[disciplina_nome]) {
            acc[disciplina_nome] = {};
        }
        if (!acc[disciplina_nome][dossier_nome]) {
            acc[disciplina_nome][dossier_nome] = [];
        }
        acc[disciplina_nome][dossier_nome].push(grade);
        return acc;
    }, {});

    // Calculate statistics
    const totalGrades = grades.length;
    const averageGrade = grades.length > 0 
        ? (grades.reduce((sum, g) => sum + (g.nota || 0), 0) / grades.length).toFixed(1)
        : 0;
    const passedGrades = grades.filter(g => g.nota >= 10).length;

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
                <div className="text-center">
                    <div className="relative w-20 h-20 mx-auto mb-6">
                        <div className="absolute inset-0 border-4 border-blue-200 rounded-full"></div>
                        <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
                    </div>
                    <p className="text-lg text-gray-700 font-medium">Carregando pauta...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-6">
                <div className="max-w-4xl mx-auto mt-12">
                    <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-r-xl shadow-lg">
                        <div className="flex">
                            <svg className="w-6 h-6 text-red-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <div className="flex-1">
                                <h3 className="text-lg font-semibold text-red-800">Erro ao Carregar Notas</h3>
                                <p className="text-red-700 mt-1">{error}</p>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={() => navigate(-1)}
                        className="mt-6 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl flex items-center space-x-2"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        <span>Voltar</span>
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 shadow-sm">
                <div className="max-w-6xl mx-auto px-6 py-6">
                    <div className="flex items-center justify-between">
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
                                <h1 className="text-3xl font-bold text-gray-900">Pauta do Aluno</h1>
                                <p className="text-sm text-gray-600 mt-1">Histórico completo de avaliações</p>
                            </div>
                        </div>

                        {/* Sort Dropdown */}
                        <div className="flex items-center space-x-2">
                            <label htmlFor="sort-select" className="text-sm font-medium text-gray-700 hidden sm:block">
                                Ordenar:
                            </label>
                            <div className="relative">
                                <select 
                                    id="sort-select"
                                    onChange={handleSortChange} 
                                    value={sortBy} 
                                    className="pl-4 pr-10 py-2 text-sm border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white hover:bg-gray-50 transition-all"
                                >
                                    <option value="date">Mais Recentes</option>
                                    <option value="best_results">Melhores Notas</option>
                                </select>
                                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-6 py-8">
                {/* Statistics Cards */}
                {totalGrades > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-5">
                            <div className="flex items-center space-x-3">
                                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600 font-medium">Total de Notas</p>
                                    <p className="text-2xl font-bold text-gray-900">{totalGrades}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-5">
                            <div className="flex items-center space-x-3">
                                <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
                                    <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600 font-medium">Média Geral</p>
                                    <p className="text-2xl font-bold text-gray-900">{averageGrade}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-5">
                            <div className="flex items-center space-x-3">
                                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600 font-medium">Aprovações</p>
                                    <p className="text-2xl font-bold text-gray-900">{passedGrades}/{totalGrades}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Grades Content */}
                {Object.keys(gradesByDiscipline).length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-12 text-center">
                        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-semibold text-gray-800 mb-2">Sem Notas Registadas</h3>
                        <p className="text-gray-600">Não existem notas para este aluno.</p>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {Object.keys(gradesByDiscipline).map(disciplineName => {
                            const dossiers = gradesByDiscipline[disciplineName];
                            const allDisciplineGrades = Object.values(dossiers).flat();
                            const disciplineAvg = (allDisciplineGrades.reduce((sum, g) => sum + (g.nota || 0), 0) / allDisciplineGrades.length).toFixed(1);
                            
                            return (
                                <div key={disciplineName} className="space-y-4">
                                    {/* Discipline Header */}
                                    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl shadow-lg p-6">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-4">
                                                <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                                                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                                    </svg>
                                                </div>
                                                <div>
                                                    <h2 className="text-2xl font-bold text-white">{disciplineName}</h2>
                                                    <p className="text-sm text-blue-100 mt-1">
                                                        {Object.keys(dossiers).length} dossiê{Object.keys(dossiers).length !== 1 ? 's' : ''} · {allDisciplineGrades.length} avaliação{allDisciplineGrades.length !== 1 ? 'ões' : ''}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs text-blue-100 font-medium uppercase tracking-wide">Média Disciplina</p>
                                                <p className="text-3xl font-bold text-white">{disciplineAvg}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Dossiers within Discipline */}
                                    <div className="space-y-4 pl-4">
                                        {Object.keys(dossiers).map(dossierName => {
                                            const dossierGrades = dossiers[dossierName];
                                            const dossierAvg = (dossierGrades.reduce((sum, g) => sum + (g.nota || 0), 0) / dossierGrades.length).toFixed(1);
                                            
                                            return (
                                                <div key={dossierName} className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
                                                    {/* Dossier Subheader */}
                                                    <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center space-x-3">
                                                                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                                                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                                                                    </svg>
                                                                </div>
                                                                <div>
                                                                    <h3 className="text-lg font-semibold text-gray-800">{dossierName}</h3>
                                                                    <p className="text-xs text-gray-500">
                                                                        {dossierGrades.length} avaliação{dossierGrades.length !== 1 ? 'ões' : ''}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="text-xs text-gray-500 font-medium">Média</p>
                                                                <p className="text-xl font-bold text-gray-800">{dossierAvg}</p>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Grades List */}
                                                    <div className="divide-y divide-gray-100">
                                                        {dossierGrades.map((grade, index) => (
                                                            <div 
                                                                key={`${grade.momento_id}-${index}`} 
                                                                className="p-6 hover:bg-blue-50/50 transition-colors"
                                                            >
                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex-1">
                                                                        <div className="flex items-center space-x-2 mb-2">
                                                                            <h4 className="text-lg font-semibold text-gray-900">
                                                                                {grade.momento_nome}
                                                                            </h4>
                                                                        </div>
                                                                        
                                                                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                                                                            <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                                            </svg>
                                                                            <span>
                                                                                {new Date(grade.data_avaliacao).toLocaleDateString('pt-PT', {
                                                                                    year: 'numeric',
                                                                                    month: 'long',
                                                                                    day: 'numeric'
                                                                                })}
                                                                            </span>
                                                                        </div>
                                                                    </div>

                                                                    {/* Grade Badge */}
                                                                    <div className="ml-6">
                                                                        {grade.nota !== null ? (
                                                                            <div className={`w-20 h-20 rounded-2xl flex items-center justify-center shadow-lg ${
                                                                                grade.nota >= 10 
                                                                                    ? 'bg-gradient-to-br from-green-400 to-green-600' 
                                                                                    : 'bg-gradient-to-br from-red-400 to-red-600'
                                                                            }`}>
                                                                                <span className="text-3xl font-bold text-white">
                                                                                    {grade.nota}
                                                                                </span>
                                                                            </div>
                                                                        ) : (
                                                                            <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center shadow-lg">
                                                                                <span className="text-xl font-semibold text-gray-400">N/A</span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

export default StudentGradesPage;
