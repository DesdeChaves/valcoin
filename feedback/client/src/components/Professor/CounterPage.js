import { Link, useNavigate } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
import Modal from '../Layout/Modal';
import CounterForm from './CounterForm';
import { fetchProfessorCounters, saveCounter, updateCounter, deleteCounter } from '../../utils/api';
import { Plus, ArrowLeft, Search, Filter, BarChart3, Edit3, Trash2, Eye } from 'lucide-react'; // Removed Settings icon as Calibrar is removed

const CounterPage = () => {
    const [counters, setCounters] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCounter, setEditingCounter] = useState(null);
    const [showInactive, setShowInactive] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const navigate = useNavigate();

    const professorId = JSON.parse(localStorage.getItem('user'))?.id;

    const fetchCounters = async () => {
        if (!professorId) {
            setError('Professor ID não encontrado. Por favor, faça login.');
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);
            const response = await fetchProfessorCounters(professorId, showInactive);
            console.log('fetchProfessorCounters response:', response); // Debug
            let data;
            if (response && typeof response === 'object') {
                if ('data' in response) {
                    data = response.data;
                } else {
                    data = response;
                }
            } else {
                data = [];
            }
            setCounters(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Error fetching counters:', err);
            setError('Erro ao carregar contadores. Por favor, tente novamente.');
            setCounters([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCounters();
    }, [professorId, showInactive]);

    const openCreateModal = () => {
        setEditingCounter(null);
        setIsModalOpen(true);
    };

    const openEditModal = (counter) => {
        setEditingCounter(counter);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingCounter(null);
    };

    const handleSaveCounter = async (counterData) => {
        try {
            if (editingCounter) {
                await updateCounter(editingCounter.id, counterData);
            } else {
                await saveCounter(counterData);
            }
            closeModal();
            fetchCounters();
        } catch (err) {
            console.error('Error saving counter:', err);
            alert('Erro ao salvar contador.');
        }
    };

    const handleDeleteCounter = async (counterId) => {
        if (window.confirm('Tem certeza que deseja apagar este contador?')) {
            try {
                await deleteCounter(counterId);
                fetchCounters();
            } catch (err) {
                console.error('Error deleting counter:', err);
                alert('Erro ao apagar contador.');
            }
        }
    };

    // Flatten counters for filtering
    const getAllCounters = () => {
        if (!Array.isArray(counters)) return [];

        return counters.flatMap(disciplineGroup =>
            (Array.isArray(disciplineGroup.dossiers) ? disciplineGroup.dossiers : []).flatMap(dossierGroup =>
                (Array.isArray(dossierGroup.counters) ? dossierGroup.counters : []).map(counter => ({
                    ...counter,
                    subject_name: disciplineGroup.subject_name || '',
                    class_name: disciplineGroup.class_name || '',
                    dossier_name: dossierGroup.nome || '',
                    dossier_id: dossierGroup.id
                }))
            )
        );
    };

    const filteredCounters = getAllCounters().filter(counter =>
        (counter.shortname || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (counter.subject_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (counter.dossier_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (counter.tipo || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalCounters = filteredCounters.length;

    // Cálculo seguro de dossiês ativos
    const activeDossiersCount = Array.isArray(counters)
        ? counters.reduce((acc, d) => acc + (Array.isArray(d.dossiers) ? d.dossiers.length : 0), 0)
        : 0;

    const disciplinesCount = Array.isArray(counters) ? counters.length : 0;

    // Loading
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

    // Erro
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
                        onClick={fetchCounters}
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
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <button
                                onClick={() => navigate(-1)}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <ArrowLeft className="w-5 h-5 text-gray-600" />
                            </button>
                            <div>
                                <h1 className="text-2xl font-semibold text-gray-800">Meus Contadores</h1>
                                <p className="text-sm text-gray-500">Gerencie os contadores de avaliação</p>
                            </div>
                        </div>
                        <button
                            onClick={openCreateModal}
                            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 flex items-center gap-2"
                        >
                            <Plus className="w-5 h-5" />
                            Novo Contador
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-6">
                {/* Estatísticas */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500 font-medium">Total de Contadores</p>
                                <p className="text-2xl font-semibold text-gray-800 mt-1">{totalCounters}</p>
                            </div>
                            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                <BarChart3 className="w-6 h-6 text-blue-600" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500 font-medium">Disciplinas</p>
                                <p className="text-2xl font-semibold text-gray-800 mt-1">{disciplinesCount}</p>
                            </div>
                            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                                <Filter className="w-6 h-6 text-indigo-600" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500 font-medium">Dossiês Ativos</p>
                                <p className="text-2xl font-semibold text-gray-800 mt-1">{activeDossiersCount}</p>
                            </div>
                            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                                <BarChart3 className="w-6 h-6 text-green-600" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filtros */}
                <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Pesquisar
                            </label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Pesquisar contador, disciplina ou dossiê..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                        </div>

                        <div className="flex items-end">
                            <label className="inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="form-checkbox h-5 w-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                                    checked={showInactive}
                                    onChange={(e) => setShowInactive(e.target.checked)}
                                />
                                <span className="ml-2 text-sm font-medium text-gray-700">Mostrar Inativos</span>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Conteúdo */}
                {filteredCounters.length === 0 ? (
                    <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                        <BarChart3 className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                        <p className="text-lg text-gray-600 mb-2">
                            {searchTerm ? 'Nenhum contador encontrado' : 'Nenhum contador criado'}
                        </p>
                        <p className="text-sm text-gray-500 mb-4">
                            {searchTerm
                                ? 'Tente ajustar os filtros de pesquisa'
                                : 'Comece criando um novo contador de avaliação'}
                        </p>
                        {!searchTerm && (
                            <button
                                onClick={openCreateModal}
                                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all inline-flex items-center gap-2"
                            >
                                <Plus className="w-5 h-5" />
                                Criar Primeiro Contador
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gradient-to-r from-blue-600 to-indigo-600">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">
                                            Disciplina (Turma)
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">
                                            Dossiê
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">
                                            Nome do Contador
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">
                                            Tipo
                                        </th>
                                        <th className="px-6 py-4 text-right text-xs font-semibold text-white uppercase tracking-wider">
                                            Ações
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {filteredCounters.map((counter) => (
                                        <tr key={counter.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="w-2 h-2 bg-blue-600 rounded-full mr-3"></div>
                                                    <div>
                                                        <div className="text-sm font-medium text-gray-900">
                                                            {counter.subject_name}
                                                        </div>
                                                        <div className="text-sm text-gray-500">
                                                            {counter.class_name}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-900">{counter.dossier_name}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-900">{counter.shortname}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <Link
                                                    to={`/professor/dossier/${counter.dossier_id}/type/${counter.tipo}/results`}
                                                    className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 hover:bg-blue-200 transition-colors"
                                                >
                                                    {counter.tipo}
                                                </Link>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Link
                                                        to={`/professor/counter/${counter.id}/results`}
                                                        className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                                        title="Ver Resultados"
                                                    >
                                                        <Eye className="w-4 h-4 mr-1" />
                                                        Resultados
                                                    </Link>

                                                    <button
                                                        onClick={() => openEditModal(counter)}
                                                        className="inline-flex items-center px-3 py-1.5 text-green-600 hover:text-green-900 hover:bg-green-50 rounded-lg transition-colors"
                                                        title="Editar"
                                                    >
                                                        <Edit3 className="w-4 h-4 mr-1" />
                                                        Editar
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteCounter(counter.id)}
                                                        className="inline-flex items-center px-3 py-1.5 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="Apagar"
                                                    >
                                                        <Trash2 className="w-4 h-4 mr-1" />
                                                        Apagar
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal */}
            <Modal isOpen={isModalOpen} onClose={closeModal}>
                <CounterForm
                    isOpen={isModalOpen}
                    onClose={closeModal}
                    onSave={handleSaveCounter}
                    counter={editingCounter}
                    professorId={professorId}
                />
            </Modal>
        </div>
    );
};

export default CounterPage;
