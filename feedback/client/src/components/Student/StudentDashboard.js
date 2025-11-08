import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchStudentDisciplines } from '../../utils/api';

const StudentDashboard = () => {
    const [disciplines, setDisciplines] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    
    const studentId = JSON.parse(localStorage.getItem('user'))?.id;
    const studentName = JSON.parse(localStorage.getItem('user'))?.nome || 'Estudante';

    useEffect(() => {
        if (studentId) {
            const getDisciplines = async () => {
                try {
                    setLoading(true);
                    const response = await fetchStudentDisciplines(studentId);
                    setDisciplines(response.data);
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
            setError('Student ID not found. Please log in.');
            setLoading(false);
        }
    }, [studentId]);

    // Filter disciplines by search term
    const filteredDisciplines = disciplines.filter(discipline =>
        discipline.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        discipline.turma_nome.toLowerCase().includes(searchTerm.toLowerCase())
    );

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
                        onClick={() => window.location.reload()}
                        className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                        Tentar Novamente
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-6 py-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-semibold text-gray-800">
                                Olá, {studentName}! 👋
                            </h1>
                            <p className="text-sm text-gray-500 mt-1">
                                Bem-vindo ao seu portal académico
                            </p>
                        </div>
                        <div className="hidden md:flex items-center space-x-4">
                            <div className="text-right">
                                <p className="text-sm text-gray-500">Total de Disciplinas</p>
                                <p className="text-2xl font-bold text-blue-600">{disciplines.length}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-6">
                {/* Statistics Cards - Mobile */}
                <div className="md:hidden mb-6">
                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500 font-medium">Total de Disciplinas</p>
                                <p className="text-2xl font-semibold text-gray-800 mt-1">{disciplines.length}</p>
                            </div>
                            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
                    <div className="relative">
                        <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            type="text"
                            placeholder="Pesquisar disciplinas ou turmas..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                </div>

                {/* Disciplines Grid */}
                {filteredDisciplines.length === 0 ? (
                    <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                        <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                        <p className="text-lg text-gray-600 mb-2">
                            {searchTerm ? 'Nenhuma disciplina encontrada' : 'Nenhuma disciplina disponível'}
                        </p>
                        <p className="text-sm text-gray-500">
                            {searchTerm ? 'Tente ajustar os critérios de pesquisa' : 'Entre em contacto com a secretaria'}
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="mb-4 text-sm text-gray-600">
                            {filteredDisciplines.length === disciplines.length 
                                ? `A mostrar ${disciplines.length} ${disciplines.length === 1 ? 'disciplina' : 'disciplinas'}`
                                : `A mostrar ${filteredDisciplines.length} de ${disciplines.length} disciplinas`
                            }
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredDisciplines.map((discipline) => (
                                <div 
                                    key={discipline.id} 
                                    className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow duration-300 group"
                                >
                                    {/* Card Header */}
                                    <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <h2 className="text-lg font-semibold text-white mb-1 line-clamp-2">
                                                    {discipline.nome}
                                                </h2>
                                                <div className="flex items-center text-blue-100 text-sm">
                                                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                                    </svg>
                                                    {discipline.turma_nome}
                                                </div>
                                            </div>
                                            <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                                </svg>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Card Body */}
                                    <div className="p-4">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center text-sm text-gray-500">
                                                <svg className="w-4 h-4 mr-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                </svg>
                                                Estudante
                                            </div>
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                Ativo
                                            </span>
                                        </div>

                                        <Link 
                                            to={`/student/discipline/${discipline.id}`}
                                            className="block w-full text-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium group-hover:shadow-md"
                                        >
                                            <span className="flex items-center justify-center">
                                                Ver Detalhes
                                                <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                </svg>
                                            </span>
                                        </Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default StudentDashboard;
