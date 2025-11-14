import React from 'react';
import Modal from '../Layout/Modal';
import InstrumentForm from './InstrumentForm';
import useInstrumentManagement from '../../hooks/useInstrumentManagement'; // Import the custom hook

const InstrumentPage = () => {
    const {
        instruments,
        loading,
        error,
        isModalOpen,
        editingInstrument,
        showInactive,
        setShowInactive,
        searchTerm,
        setSearchTerm,
        selectedDossier,
        setSelectedDossier,
        fetchInstruments,
        openCreateModal,
        openEditModal,
        closeModal,
        handleSaveInstrument,
        handleDeleteInstrument,
        navigate,
        professorId,
        dossiers, // From the hook
    } = useInstrumentManagement();

    // Filter instruments
    const getFilteredInstruments = () => {
        if (!instruments || !Array.isArray(instruments)) {
            return [];
        }
        
        return instruments
            .map(criterionGroup => {
                // Filter instruments within this criterion
                const filteredInstruments = (criterionGroup.instrumentos || []).filter(instrument => {
                    const matchesSearch = 
                        instrument.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        criterionGroup.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        criterionGroup.subject_name?.toLowerCase().includes(searchTerm.toLowerCase());
                    
                    return matchesSearch;
                });

                // Return criterion with filtered instruments
                return {
                    ...criterionGroup,
                    instrumentos: filteredInstruments
                };
            })
            // Filter out criteria that match dossier filter and have instruments
            .filter(criterionGroup => {
                const matchesDossier = selectedDossier === 'all' || criterionGroup.dossier_id === selectedDossier;
                const hasInstruments = criterionGroup.instrumentos && criterionGroup.instrumentos.length > 0;
                
                return matchesDossier && hasInstruments;
            });
    };

    const filteredInstruments = getFilteredInstruments();
    
    // Calculate totals
    const totalInstruments = (instruments && Array.isArray(instruments) ? instruments : [])
        .reduce((acc, c) => acc + (c.instrumentos && Array.isArray(c.instrumentos) ? c.instrumentos.length : 0), 0);
    
    const totalCriteria = (instruments && Array.isArray(instruments) ? instruments : [])
        .filter(c => c.instrumentos && c.instrumentos.length > 0).length;

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Carregando instrumentos...</p>
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
                        onClick={fetchInstruments}
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
                                <h1 className="text-2xl font-semibold text-gray-800">Instrumentos de Avaliação</h1>
                                <p className="text-sm text-gray-500">Gerencie os instrumentos dos seus critérios</p>
                            </div>
                        </div>
                        <button
                            onClick={openCreateModal}
                            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center"
                        >
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Novo Instrumento
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-6">
                {/* Statistics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500 font-medium">Total de Instrumentos</p>
                                <p className="text-2xl font-semibold text-gray-800 mt-1">{totalInstruments}</p>
                            </div>
                            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500 font-medium">Critérios com Instrumentos</p>
                                <p className="text-2xl font-semibold text-gray-800 mt-1">{totalCriteria}</p>
                            </div>
                            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500 font-medium">Média por Critério</p>
                                <p className="text-2xl font-semibold text-gray-800 mt-1">
                                    {totalCriteria > 0 ? (totalInstruments / totalCriteria).toFixed(1) : '0'}
                                </p>
                            </div>
                            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Pesquisar
                            </label>
                            <div className="relative">
                                <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                <input
                                    type="text"
                                    placeholder="Pesquisar instrumento, critério ou disciplina..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Filtrar por Dossiê
                            </label>
                            <select
                                value={selectedDossier}
                                onChange={(e) => setSelectedDossier(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            >
                                {dossiers.map((dossier) => (
                                    <option key={dossier.id} value={dossier.id}>
                                        {dossier.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="mt-4 flex justify-end">
                        <label className="inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                className="form-checkbox h-5 w-5 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                                checked={showInactive}
                                onChange={(e) => setShowInactive(e.target.checked)}
                            />
                            <span className="ml-2 text-sm font-medium text-gray-700">Mostrar Inativos</span>
                        </label>
                    </div>
                </div>

                {/* Content */}
                {filteredInstruments.length === 0 ? (
                    <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                        <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p className="text-lg text-gray-600 mb-2">
                            {searchTerm || selectedDossier !== 'all' 
                                ? 'Nenhum instrumento encontrado'
                                : totalInstruments > 0 
                                    ? 'Os critérios não têm instrumentos associados'
                                    : 'Nenhum instrumento criado'}
                        </p>
                        <p className="text-sm text-gray-500 mb-4">
                            {searchTerm || selectedDossier !== 'all'
                                ? 'Tente ajustar os filtros de pesquisa'
                                : 'Comece criando um novo instrumento de avaliação'}
                        </p>
                        {!searchTerm && selectedDossier === 'all' && (
                            <button
                                onClick={openCreateModal}
                                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors inline-flex items-center"
                            >
                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Criar Primeiro Instrumento
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="space-y-6">
                        {filteredInstruments.map((criterionGroup) => (
                            <div key={criterionGroup.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                                {/* Criterion Header */}
                                <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-6 py-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h2 className="text-lg font-semibold">{criterionGroup.nome}</h2>
                                            <p className="text-sm text-purple-100">
                                                {criterionGroup.subject_name} · {criterionGroup.class_name} · {criterionGroup.dossier_name} · {criterionGroup.instrumentos.length} {criterionGroup.instrumentos.length === 1 ? 'instrumento' : 'instrumentos'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Instruments Table */}
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Nome do Instrumento
                                                </th>
                                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Ações
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {criterionGroup.instrumentos.map((instrument) => (
                                                <tr key={instrument.id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center">
                                                            <div className="w-2 h-2 bg-purple-600 rounded-full mr-3"></div>
                                                            <div className="text-sm font-medium text-gray-900">
                                                                {instrument.nome}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right text-sm font-medium space-x-2">
                                                        <button
                                                            onClick={() => navigate(`/professor/instrument/${instrument.id}/grades`)}
                                                            className="inline-flex items-center px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                                                        >
                                                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                            </svg>
                                                            Gerir Notas
                                                        </button>
                                                        <button
                                                            onClick={() => navigate(`/professor/instrument/${instrument.id}/details`)}
                                                            className="text-blue-600 hover:text-blue-900 inline-flex items-center"
                                                        >
                                                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                            </svg>
                                                            Detalhes
                                                        </button>
                                                        <button
                                                            onClick={() => openEditModal(instrument)}
                                                            className="text-green-600 hover:text-green-900 inline-flex items-center"
                                                        >
                                                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                            </svg>
                                                            Editar
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteInstrument(instrument.id)}
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
                <InstrumentForm
                    isOpen={isModalOpen}
                    onClose={closeModal}
                    onSave={handleSaveInstrument}
                    instrument={editingInstrument}
                    professorId={professorId}
                />
            </Modal>
        </div>
    );
};

export default InstrumentPage;
