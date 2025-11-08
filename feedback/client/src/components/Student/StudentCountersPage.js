import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchStudentCounters, fetchStudentDisciplines, fetchStudentCountersList } from '../../utils/api';

const StudentCountersPage = () => {
    const navigate = useNavigate();
    const [taps, setTaps] = useState([]);
    const [statistics, setStatistics] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [disciplines, setDisciplines] = useState([]);
    const [countersList, setCountersList] = useState([]);
    const [filters, setFilters] = useState({
        disciplineId: '',
        counterId: '',
        sortBy: 'created_at',
        sortOrder: 'DESC',
    });
    const studentId = JSON.parse(localStorage.getItem('user'))?.id;

    // Fetch disciplines for filter dropdown
    useEffect(() => {
        if (studentId) {
            const getDisciplines = async () => {
                try {
                    const response = await fetchStudentDisciplines(studentId);
                    setDisciplines(response.data);
                } catch (err) {
                    console.error('Error fetching disciplines for filter:', err);
                }
            };
            getDisciplines();
        }
    }, [studentId]);

    // Fetch counters for filter dropdown
    useEffect(() => {
        if (studentId) {
            const getCountersList = async () => {
                try {
                    const response = await fetchStudentCountersList(studentId);
                    setCountersList(response.data);
                } catch (err) {
                    console.error('Error fetching counters list for filter:', err);
                }
            };
            getCountersList();
        }
    }, [studentId]);

    useEffect(() => {
        if (studentId) {
            const getCounters = async () => {
                try {
                    setLoading(true);
                    const response = await fetchStudentCounters(studentId, filters.disciplineId, filters.counterId, filters.sortBy, filters.sortOrder);
                    setTaps(response.data.taps);
                    setStatistics(response.data.statistics);
                    setError(null);
                } catch (err) {
                    setError('Error fetching counters');
                    console.error('Error fetching counters:', err);
                } finally {
                    setLoading(false);
                }
            };
            getCounters();
        } else {
            setError('Student ID not found. Please log in.');
            setLoading(false);
        }
    }, [studentId, filters]);

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prevFilters => ({
            ...prevFilters,
            [name]: value,
        }));
    };

    const clearFilters = () => {
        setFilters({
            disciplineId: '',
            counterId: '',
            sortBy: 'created_at',
            sortOrder: 'DESC',
        });
    };

    // Calculate totals
    const totalTaps = statistics.reduce((acc, stat) => acc + parseInt(stat.total_taps), 0);
    const totalIncrement = statistics.reduce((acc, stat) => acc + parseFloat(stat.total_increment), 0);

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Carregando contadores...</p>
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
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <button
                                onClick={() => navigate(-1)}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                </svg>
                            </button>
                            <div>
                                <h1 className="text-2xl font-semibold text-gray-800">Meus Contadores</h1>
                                <p className="text-sm text-gray-500 mt-1">Histórico de registos e estatísticas</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-6">
                {/* Overall Statistics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500 font-medium">Total de Taps</p>
                                <p className="text-2xl font-semibold text-gray-800 mt-1">{totalTaps}</p>
                            </div>
                            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500 font-medium">Incremento Total</p>
                                <p className="text-2xl font-semibold text-gray-800 mt-1">{totalIncrement.toFixed(2)}</p>
                            </div>
                            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500 font-medium">Contadores Ativos</p>
                                <p className="text-2xl font-semibold text-gray-800 mt-1">{statistics.length}</p>
                            </div>
                            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-gray-800">Filtros</h2>
                        <button
                            onClick={clearFilters}
                            className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center"
                        >
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Limpar Filtros
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <label htmlFor="disciplineFilter" className="block text-sm font-medium text-gray-700 mb-2">
                                Disciplina
                            </label>
                            <select
                                id="disciplineFilter"
                                name="disciplineId"
                                value={filters.disciplineId}
                                onChange={handleFilterChange}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="">Todas</option>
                                {disciplines.map(disc => (
                                    <option key={disc.id} value={disc.id}>{disc.nome}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="counterFilter" className="block text-sm font-medium text-gray-700 mb-2">
                                Contador
                            </label>
                            <select
                                id="counterFilter"
                                name="counterId"
                                value={filters.counterId}
                                onChange={handleFilterChange}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="">Todos</option>
                                {countersList.map(counter => (
                                    <option key={counter.id} value={counter.id}>{counter.shortname}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="sortBy" className="block text-sm font-medium text-gray-700 mb-2">
                                Ordenar por
                            </label>
                            <select
                                id="sortBy"
                                name="sortBy"
                                value={filters.sortBy}
                                onChange={handleFilterChange}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="created_at">Data</option>
                                <option value="shortname">Contador</option>
                                <option value="incremento">Incremento</option>
                                <option value="discipline_name">Disciplina</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="sortOrder" className="block text-sm font-medium text-gray-700 mb-2">
                                Ordem
                            </label>
                            <select
                                id="sortOrder"
                                name="sortOrder"
                                value={filters.sortOrder}
                                onChange={handleFilterChange}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="DESC">Descendente</option>
                                <option value="ASC">Ascendente</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Counter Statistics Cards */}
                {statistics.length > 0 && (
                    <>
                        <h2 className="text-lg font-semibold text-gray-800 mb-4">Estatísticas por Contador</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                            {statistics.map(stat => (
                                <div key={stat.counter_id} className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-4 text-white">
                                    <div className="flex items-start justify-between mb-3">
                                        <h3 className="text-lg font-semibold">{stat.shortname}</h3>
                                        <div className="w-8 h-8 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                            </svg>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-blue-100">Total de Taps</span>
                                            <span className="text-xl font-bold">{stat.total_taps}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-blue-100">Incremento Total</span>
                                            <span className="text-xl font-bold">{stat.total_increment}</span>
                                        </div>
                                        <div className="pt-2 border-t border-blue-400">
                                            <div className="flex items-center text-xs text-blue-100">
                                                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                Último: {new Date(stat.last_tap_at).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}

                {/* Taps Table */}
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h2 className="text-lg font-semibold text-gray-800">Histórico de Registos</h2>
                        <p className="text-sm text-gray-500 mt-1">
                            {taps.length} {taps.length === 1 ? 'registo' : 'registos'} encontrados
                        </p>
                    </div>
                    {taps.length === 0 ? (
                        <div className="p-12 text-center">
                            <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                            <p className="text-lg text-gray-600">Nenhum registo encontrado</p>
                            <p className="text-sm text-gray-500 mt-1">Tente ajustar os filtros de pesquisa</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Data
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Disciplina
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Contador
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Descrição
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Incremento
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {taps.map((tap) => (
                                        <tr key={tap.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {new Date(tap.created_at).toLocaleString('pt-PT', {
                                                    day: '2-digit',
                                                    month: '2-digit',
                                                    year: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="text-sm font-medium text-gray-900">{tap.discipline_name}</span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                                                    <span className="text-sm font-medium text-gray-900">{tap.shortname}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-700">
                                                {tap.descritor}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                    +{tap.incremento}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StudentCountersPage;
