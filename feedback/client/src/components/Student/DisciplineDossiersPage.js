import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { fetchStudentDossiers } from '../../utils/api';

const DisciplineDossiersPage = () => {
    const { disciplineId } = useParams();
    const navigate = useNavigate();
    const [dossiers, setDossiers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'active', 'inactive'
    
    const studentId = JSON.parse(localStorage.getItem('user'))?.id;

    useEffect(() => {
        if (studentId && disciplineId) {
            const getDossiers = async () => {
                try {
                    setLoading(true);
                    const response = await fetchStudentDossiers(studentId, disciplineId);
                    setDossiers(response.data);
                    setError(null);
                } catch (err) {
                    setError('Error fetching dossiers');
                    console.error('Error fetching dossiers:', err);
                } finally {
                    setLoading(false);
                }
            };
            getDossiers();
        } else {
            setError('Student ID or Discipline ID not found.');
            setLoading(false);
        }
    }, [studentId, disciplineId]);

    // Filter dossiers
    const getFilteredDossiers = () => {
        return dossiers.filter(dossier => {
            const matchesSearch = dossier.nome.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = filterStatus === 'all' || 
                                 (filterStatus === 'active' && dossier.ativo) ||
                                 (filterStatus === 'inactive' && !dossier.ativo);
            return matchesSearch && matchesStatus;
        });
    };

    const filteredDossiers = getFilteredDossiers();
    const activeDossiers = dossiers.filter(d => d.ativo).length;
    const inactiveDossiers = dossiers.filter(d => !d.ativo).length;

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Carregando dossiês...</p>
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
                                <h1 className="text-2xl font-semibold text-gray-800">Dossiês da Disciplina</h1>
                                <p className="text-sm text-gray-500 mt-1">
                                    Consulte os seus dossiês e avaliações
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-6">
                {/* Statistics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500 font-medium">Total de Dossiês</p>
                                <p className="text-2xl font-semibold text-gray-800 mt-1">{dossiers.length}</p>
                            </div>
                            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500 font-medium">Dossiês Ativos</p>
                                <p className="text-2xl font-semibold text-gray-800 mt-1">{activeDossiers}</p>
                            </div>
                            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500 font-medium">Dossiês Inativos</p>
                                <p className="text-2xl font-semibold text-gray-800 mt-1">{inactiveDossiers}</p>
                            </div>
                            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Search */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Pesquisar
                            </label>
                            <div className="relative">
                                <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                <input
                                    type="text"
                                    placeholder="Pesquisar dossiês..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                        </div>

                        {/* Status Filter */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Estado
                            </label>
                            <div className="flex space-x-2">
                                <button
                                    onClick={() => setFilterStatus('all')}
                                    className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                                        filterStatus === 'all'
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                                >
                                    Todos
                                </button>
                                <button
                                    onClick={() => setFilterStatus('active')}
                                    className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                                        filterStatus === 'active'
                                            ? 'bg-green-600 text-white'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                                >
                                    Ativos
                                </button>
                                <button
                                    onClick={() => setFilterStatus('inactive')}
                                    className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                                        filterStatus === 'inactive'
                                            ? 'bg-gray-600 text-white'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                                >
                                    Inativos
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Dossiers Grid */}
                {filteredDossiers.length === 0 ? (
                    <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                        <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p className="text-lg text-gray-600 mb-2">
                            {searchTerm || filterStatus !== 'all'
                                ? 'Nenhum dossiê encontrado'
                                : 'Não existem dossiês para esta disciplina'}
                        </p>
                        <p className="text-sm text-gray-500">
                            {searchTerm || filterStatus !== 'all'
                                ? 'Tente ajustar os filtros de pesquisa'
                                : 'Os dossiês aparecerão aqui quando forem criados'}
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="mb-4 text-sm text-gray-600">
                            {filteredDossiers.length === dossiers.length 
                                ? `A mostrar ${dossiers.length} ${dossiers.length === 1 ? 'dossiê' : 'dossiês'}`
                                : `A mostrar ${filteredDossiers.length} de ${dossiers.length} dossiês`
                            }
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredDossiers.map((dossier) => (
                                <div 
                                    key={dossier.id} 
                                    className={`bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300 group ${
                                        !dossier.ativo ? 'opacity-60' : ''
                                    }`}
                                >
                                    {/* Card Header */}
                                    <div className={`p-4 ${
                                        dossier.ativo 
                                            ? 'bg-gradient-to-r from-blue-500 to-blue-600' 
                                            : 'bg-gradient-to-r from-gray-400 to-gray-500'
                                    }`}>
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <h2 className="text-lg font-semibold text-white mb-2 line-clamp-2">
                                                    {dossier.nome}
                                                </h2>
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                    dossier.ativo 
                                                        ? 'bg-green-100 text-green-800' 
                                                        : 'bg-gray-200 text-gray-700'
                                                }`}>
                                                    {dossier.ativo ? '● Ativo' : '○ Inativo'}
                                                </span>
                                            </div>
                                            <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center ml-3">
                                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Card Body */}
                                    <div className="p-4">
                                        {dossier.ativo ? (
                                            <Link 
                                                to={`/student/dossier/${dossier.id}/grades`}
                                                className="block w-full text-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium group-hover:shadow-md"
                                            >
                                                <span className="flex items-center justify-center">
                                                    Ver Notas
                                                    <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                    </svg>
                                                </span>
                                            </Link>
                                        ) : (
                                            <div className="text-center py-2 text-sm text-gray-500">
                                                Dossiê inativo
                                            </div>
                                        )}
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

export default DisciplineDossiersPage;
