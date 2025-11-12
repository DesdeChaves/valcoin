import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import TapButton from './TapButton';
import { fetchDossierCounters, registerTap } from '../../utils/api';

const DossierCountersPage = () => {
    const { dossieId } = useParams();
    const [studentsData, setStudentsData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [tipoP, setTipoP] = useState('atitudinal');
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('name');
    const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'compact'
    const navigate = useNavigate();

    const professorId = JSON.parse(localStorage.getItem('user'))?.id;

    const fetchStudentsAndCounters = async () => {
        try {
            setLoading(true);
            const response = await fetchDossierCounters(dossieId);
            setStudentsData(response || []);
            setError(null);
        } catch (err) {
            setError('Erro ao carregar alunos e contadores.');
            console.error('Error fetching students and counters:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (professorId && dossieId) {
            fetchStudentsAndCounters();
        } else {
            setError('Professor ID or Dossie ID not found.');
            setLoading(false);
        }
    }, [professorId, dossieId]);

    const handleRegisterTap = async (alunoId, contadorId) => {
        try {
            await registerTap(alunoId, contadorId);
            // Refresh data after successful tap
            fetchStudentsAndCounters();
        } catch (err) {
            console.error('Error registering tap:', err);
            alert('Error registering tap.');
        }
    };

    // Filter and sort students
    const getFilteredAndSortedStudents = () => {
        let filtered = studentsData.filter(aluno => {
            const matchesSearch = aluno.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                 aluno.numero.toString().includes(searchTerm);
            const hasCountersOfType = aluno.momentos.some(m => m.tipo === tipoP);
            return matchesSearch && hasCountersOfType;
        });

        return filtered.sort((a, b) => {
            if (sortBy === 'name') {
                return a.text.localeCompare(b.text);
            } else if (sortBy === 'number') {
                return a.numero - b.numero;
            }
            return 0;
        });
    };

    const filteredStudents = getFilteredAndSortedStudents();

    // Calculate statistics
    const totalStudents = studentsData.length;
    const activeCounters = studentsData.reduce((acc, aluno) => 
        acc + aluno.momentos.filter(m => m.tipo === tipoP && m.isAtivo).length, 0);
    const totalTaps = studentsData.reduce((acc, aluno) => 
        acc + aluno.momentos.filter(m => m.tipo === tipoP).reduce((sum, m) => sum + (m.contagem || 0), 0), 0);

    const tipoOptions = [
        { value: 'atitudinal', label: 'Atitudinal', icon: '🎯', color: 'blue' },
        { value: 'participacao', label: 'Participação', icon: '🙋', color: 'green' },
        { value: 'experimental', label: 'Experimental', icon: '🔬', color: 'purple' },
        { value: 'social', label: 'Social', icon: '👥', color: 'pink' },
        { value: 'vocacional', label: 'Vocacional', icon: '💼', color: 'orange' },
    ];

    const currentTipo = tipoOptions.find(t => t.value === tipoP);

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-gray-600">Carregando contadores...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="container mx-auto p-4">
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    <p className="font-bold">Erro</p>
                    <p>{error}</p>
                </div>
                <button
                    onClick={fetchStudentsAndCounters}
                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                >
                    Tentar Novamente
                </button>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-4">
            {/* Header */}
            <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                    <div>
                        <h1 className="text-3xl font-bold">Gestão de Contadores</h1>
                        <p className="text-gray-600 mt-1">Registe e acompanhe as contagens dos alunos</p>
                    </div>
                    <button
                        onClick={() => navigate(-1)}
                        className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg inline-flex items-center"
                    >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Voltar
                    </button>
                </div>
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-100 border border-blue-300 rounded-lg p-4">
                    <p className="text-sm text-blue-600 font-semibold">Total de Alunos</p>
                    <p className="text-2xl font-bold text-blue-800">{totalStudents}</p>
                </div>
                <div className="bg-green-100 border border-green-300 rounded-lg p-4">
                    <p className="text-sm text-green-600 font-semibold">Contadores Ativos ({currentTipo.label})</p>
                    <p className="text-2xl font-bold text-green-800">{activeCounters}</p>
                </div>
                <div className="bg-purple-100 border border-purple-300 rounded-lg p-4">
                    <p className="text-sm text-purple-600 font-semibold">Total de Registos</p>
                    <p className="text-2xl font-bold text-purple-800">{totalTaps}</p>
                </div>
            </div>

            {/* Filters and Controls */}
            <div className="bg-white rounded-lg shadow-md p-4 mb-6">
                {/* Type Filter */}
                <div className="mb-4">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Tipo de Contador
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                        {tipoOptions.map((option) => (
                            <button
                                key={option.value}
                                onClick={() => setTipoP(option.value)}
                                className={`px-4 py-3 rounded-lg font-semibold transition-all ${
                                    tipoP === option.value
                                        ? `bg-${option.color}-500 text-white shadow-md scale-105`
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                                style={tipoP === option.value ? {
                                    backgroundColor: option.color === 'blue' ? '#3b82f6' :
                                                    option.color === 'green' ? '#10b981' :
                                                    option.color === 'purple' ? '#8b5cf6' :
                                                    option.color === 'pink' ? '#ec4899' :
                                                    '#f59e0b'
                                } : {}}
                            >
                                <span className="text-xl mr-2">{option.icon}</span>
                                <span className="text-sm">{option.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Search and Sort */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Pesquisar Aluno
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Nome ou número do aluno..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <svg className="absolute left-3 top-3 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Ordenar Por
                        </label>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="name">Nome</option>
                            <option value="number">Número</option>
                        </select>
                    </div>
                </div>

                {/* View Mode Toggle */}
                <div className="mt-4 flex justify-end">
                    <div className="inline-flex rounded-lg border border-gray-300">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`px-4 py-2 rounded-l-lg font-semibold transition-colors ${
                                viewMode === 'grid' ? 'bg-blue-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
                            }`}
                        >
                            <svg className="w-5 h-5 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                            </svg>
                            Grade
                        </button>
                        <button
                            onClick={() => setViewMode('compact')}
                            className={`px-4 py-2 rounded-r-lg font-semibold transition-colors ${
                                viewMode === 'compact' ? 'bg-blue-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
                            }`}
                        >
                            <svg className="w-5 h-5 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                            Compacto
                        </button>
                    </div>
                </div>
            </div>

            {/* Students List */}
            {filteredStudents.length === 0 ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center">
                    <svg className="w-16 h-16 mx-auto text-yellow-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    <p className="text-lg text-gray-700 mb-2">
                        {searchTerm 
                            ? 'Nenhum aluno encontrado com esse critério de pesquisa'
                            : `Nenhum aluno com contadores do tipo "${currentTipo.label}"`}
                    </p>
                </div>
            ) : (
                <div className={viewMode === 'grid' 
                    ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
                    : 'space-y-4'
                }>
                    {filteredStudents.map((aluno) => (
                        <div 
                            key={aluno.id} 
                            className={`bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg shadow-lg overflow-hidden ${
                                viewMode === 'compact' ? 'flex items-center p-4' : 'p-6'
                            }`}
                        >
                            {/* Student Info */}
                            <div className={`text-white ${viewMode === 'compact' ? 'min-w-[200px]' : 'text-center mb-4'}`}>
                                <h3 className="text-xl font-bold">{aluno.text}</h3>
                                <p className="text-blue-200 text-sm">Nº {aluno.numero}</p>
                            </div>

                            {/* Counters */}
                            <div className={`flex flex-wrap ${viewMode === 'compact' ? 'flex-1 justify-end gap-2' : 'justify-center gap-2'}`}>
                                {aluno.momentos.map((momento) => (
                                    <TapButton
                                        key={momento.id}
                                        isAtive={momento.isAtivo}
                                        momento={momento.slogan}
                                        momentoID={momento.id}
                                        validade={momento.lastRegisto}
                                        alunoID={aluno.id}
                                        contagem={momento.contagem}
                                        incremento={momento.incremento}
                                        tipinho={momento.tipo === tipoP}
                                        onRegisterTap={handleRegisterTap}
                                        onNotAllowed={() => console.log('Tap not allowed')}
                                        periodoInativacaoSegundos={momento.periodo_inativacao_segundos}
                                        tempoInativacaoRestante={momento.tempoInativacaoRestante}
                                        maxContagem={momento.maxContagem}
                                        cor={momento.cor}
                                        compact={viewMode === 'compact'}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default DossierCountersPage;
