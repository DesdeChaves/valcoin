import React, { useState, useEffect } from 'react';
import { fetchProfessorCriteria, saveCriterion, updateCriterion, deleteCriterion } from '../../utils/api';
import { useNavigate } from 'react-router-dom';
import Modal from '../Layout/Modal';
import CriterionForm from './CriterionForm';

const CriterionPage = () => {
    const [criteria, setCriteria] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCriterion, setEditingCriterion] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDossier, setSelectedDossier] = useState('all');
    const navigate = useNavigate();

    const professorId = JSON.parse(localStorage.getItem('user'))?.id;

    const fetchCriteria = async () => {
        if (!professorId) {
            setError('ID do professor não encontrado. Por favor, faça login novamente.');
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);
            const response = await fetchProfessorCriteria(professorId);
            console.log('fetchProfessorCriteria response:', response); // Debug
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
            setCriteria(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Error fetching criteria:', err);
            setError('Erro ao carregar critérios. Por favor, tente novamente.');
            setCriteria([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCriteria();
    }, [professorId]);

    const openCreateModal = () => {
        setEditingCriterion(null);
        setIsModalOpen(true);
    };

    const openEditModal = (criterion) => {
        setEditingCriterion(criterion);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingCriterion(null);
    };

    const handleSaveCriterion = async (criterionData) => {
        try {
            if (editingCriterion) {
                await updateCriterion(editingCriterion.id, criterionData);
            } else {
                await saveCriterion(criterionData);
            }
            closeModal();
            fetchCriteria();
        } catch (err) {
            console.error('Error saving criterion:', err);
            alert('Erro ao salvar critério.');
        }
    };

    const handleDeleteCriterion = async (criterionId) => {
        if (window.confirm('Tem certeza que deseja apagar este critério?')) {
            try {
                await deleteCriterion(criterionId);
                fetchCriteria();
            } catch (err) {
                console.error('Error deleting criterion:', err);
                alert('Erro ao apagar critério.');
            }
        }
    };

    // Filtrar critérios com segurança
    const getFilteredCriteria = () => {
        if (!Array.isArray(criteria)) return [];

        return criteria
            .map(dossierGroup => ({
                ...dossierGroup,
                criterios: Array.isArray(dossierGroup.criterios)
                    ? dossierGroup.criterios.filter(criterion => {
                          const matchesSearch =
                              (criterion.nome || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                              (dossierGroup.nome || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                              (dossierGroup.subject_name || '').toLowerCase().includes(searchTerm.toLowerCase());
                          const matchesDossier =
                              selectedDossier === 'all' || dossierGroup.id === selectedDossier;
                          return matchesSearch && matchesDossier;
                      })
                    : []
            }))
            .filter(dossierGroup => dossierGroup.criterios.length > 0);
    };

    const filteredCriteria = getFilteredCriteria();

    // Estatísticas seguras
    const totalCriteria = Array.isArray(criteria)
        ? criteria.reduce((acc, d) => acc + (Array.isArray(d.criterios) ? d.criterios.length : 0), 0)
        : 0;

    const totalDossiers = Array.isArray(criteria) ? criteria.length : 0;

    // Loading
    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Carregando critérios...</p>
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
                        onClick={fetchCriteria}
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
                                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                </svg>
                            </button>
                            <div>
                                <h1 className="text-2xl font-semibold text-gray-800">Critérios de Avaliação</h1>
                                <p className="text-sm text-gray-500">Gerencie os critérios dos seus dossiês</p>
                            </div>
                        </div>
                        <button
                            onClick={openCreateModal}
                            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40 flex items-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Novo Critério
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-6">
                {/* Estatísticas */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500 font-medium">Total de Critérios</p>
                                <p className="text-2xl font-semibold text-gray-800 mt-1">{totalCriteria}</p>
                            </div>
                            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500 font-medium">Dossiês</p>
                                <p className="text-2xl font-semibold text-gray-800 mt-1">{totalDossiers}</p>
                            </div>
                            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                                <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
                                </svg>
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
                                <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                <input
                                    type="text"
                                    placeholder="Pesquisar critério, dossiê ou disciplina..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Dossiê
                            </label>
                            {(() => {
                                const uniqueDossiers = Array.isArray(criteria)
                                    ? [...new Map(
                                          criteria.map(d => [d.id, { id: d.id, name: `${d.nome} - ${d.subject_name}` }])
                                      ).values()]
                                    : [];

                                const dossiers = [
                                    { id: 'all', name: 'Todos os Dossiês' },
                                    ...uniqueDossiers
                                ];

                                return (
                                    <select
                                        value={selectedDossier}
                                        onChange={(e) => setSelectedDossier(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    >
                                        {dossiers.map((doss) => (
                                            <option key={doss.id} value={doss.id}>
                                                {doss.name}
                                            </option>
                                        ))}
                                    </select>
                                );
                            })()}
                        </div>
                    </div>
                </div>

                {/* Conteúdo */}
                {filteredCriteria.length === 0 ? (
                    <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                        <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                        </svg>
                        <p className="text-lg text-gray-600 mb-2">
                            {searchTerm || selectedDossier !== 'all' ? 'Nenhum critério encontrado' : 'Nenhum critério criado'}
                        </p>
                        <p className="text-sm text-gray-500 mb-4">
                            {searchTerm || selectedDossier !== 'all'
                                ? 'Tente ajustar os filtros de pesquisa'
                                : 'Comece criando um novo critério de avaliação'}
                        </p>
                        {!(searchTerm || selectedDossier !== 'all') && (
                            <button
                                onClick={openCreateModal}
                                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all inline-flex items-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Criar Primeiro Critério
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="space-y-6">
                        {filteredCriteria.map((dossierGroup) => (
                            <div key={dossierGroup.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                                {/* Cabeçalho do Dossiê */}
                                <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-6 py-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h2 className="text-lg font-semibold">{dossierGroup.nome}</h2>
                                            <p className="text-sm text-purple-100">
                                                {dossierGroup.subject_name} · {dossierGroup.class_name} · {dossierGroup.criterios.length} {dossierGroup.criterios.length === 1 ? 'critério' : 'critérios'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Tabela de Critérios */}
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Nome do Critério
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Ponderação
                                                </th>
                                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Ações
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {dossierGroup.criterios.map((criterion) => (
                                                <tr key={criterion.id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center">
                                                            <div className="w-2 h-2 bg-purple-600 rounded-full mr-3"></div>
                                                            <div className="text-sm font-medium text-gray-900">
                                                                {criterion.nome}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                                            {criterion.ponderacao}%
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                        <button
                                                            onClick={() => openEditModal(criterion)}
                                                            className="text-purple-600 hover:text-purple-900 mr-4 inline-flex items-center"
                                                        >
                                                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                            </svg>
                                                            Editar
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteCriterion(criterion.id)}
                                                            className="text-red-600 hover:text-red-900 inline-flex items-center"
                                                        >
                                                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                            </svg>
                                                            Apagar
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal */}
            <Modal isOpen={isModalOpen} onClose={closeModal}>
                <CriterionForm
                    isOpen={isModalOpen}
                    onClose={closeModal}
                    onSave={handleSaveCriterion}
                    criterion={editingCriterion}
                    professorId={professorId}
                />
            </Modal>
        </div>
    );
};

export default CriterionPage;
