import React from 'react';
import Modal from '../Layout/Modal';
import DossierForm from './DossierForm';
import useDossierManagement from '../../hooks/useDossierManagement'; // Import the custom hook

const DossierPage = () => {
    const {
        dossiers,
        loading,
        error,
        isModalOpen,
        editingDossier,
        showInactive,
        setShowInactive,
        searchTerm,
        setSearchTerm,
        selectedDiscipline,
        setSelectedDiscipline,
        fetchDossiers,
        openCreateModal,
        openEditModal,
        closeModal,
        handleSaveDossier,
        handleDeleteDossier,
        navigate,
        professorId,
    } = useDossierManagement();

    // Filtrar dossiês com base em busca e disciplina
    const filteredDossiers = Array.isArray(dossiers)
        ? dossiers
            .map(discipline => ({
                ...discipline,
                dossiers: Array.isArray(discipline.dossiers)
                    ? discipline.dossiers.filter(dossier => {
                          const matchesSearch =
                              dossier.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              discipline.subject_name?.toLowerCase().includes(searchTerm.toLowerCase());
                          const matchesDiscipline =
                              selectedDiscipline === 'all' || discipline.disciplina_id === parseInt(selectedDiscipline);
                          return matchesSearch && matchesDiscipline;
                      })
                    : []
            }))
            .filter(discipline => discipline.dossiers.length > 0)
        : [];

    // Estatísticas
    const totalDossiers = Array.isArray(dossiers)
        ? dossiers.reduce((acc, d) => acc + (Array.isArray(d.dossiers) ? d.dossiers.length : 0), 0)
        : 0;

    const activeDossiers = Array.isArray(dossiers)
        ? dossiers.reduce((acc, d) =>
              acc + (Array.isArray(d.dossiers) ? d.dossiers.filter(dossier => dossier.ativo).length : 0),
          0)
        : 0;

    // Navegação
    const navigateToDossier = (dossierId, section) => {
        navigate(`/dossier/${dossierId}/${section}`); // Adjusted path to be relative to basename
    };

    // Loading
    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-gray-600">Carregando dossiês...</p>
                </div>
            </div>
        );
    }

    // Erro
    if (error) {
        return (
            <div className="container mx-auto p-4">
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    <p className="font-bold">Erro</p>
                    <p>{error}</p>
                </div>
                <button
                    onClick={fetchDossiers}
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
                <h1 className="text-3xl font-bold mb-2">Meus Dossiês</h1>
                <p className="text-gray-600">Gerencie seus dossiês, classificações e momentos de avaliação</p>
            </div>

            {/* Estatísticas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-100 border border-blue-300 rounded-lg p-4">
                    <p className="text-sm text-blue-600 font-semibold">Total de Dossiês</p>
                    <p className="text-2xl font-bold text-blue-800">{totalDossiers}</p>
                </div>
                <div className="bg-green-100 border border-green-300 rounded-lg p-4">
                    <p className="text-sm text-green-600 font-semibold">Dossiês Ativos</p>
                    <p className="text-2xl font-bold text-green-800">{activeDossiers}</p>
                </div>
                <div className="bg-purple-100 border border-purple-300 rounded-lg p-4">
                    <p className="text-sm text-purple-600 font-semibold">Disciplinas</p>
                    <p className="text-2xl font-bold text-purple-800">{dossiers.length}</p>
                </div>
            </div>

            {/* Filtros e Ações */}
            <div className="bg-white rounded-lg shadow-md p-4 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Pesquisa */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Pesquisar</label>
                        <input
                            type="text"
                            placeholder="Nome do dossiê ou disciplina..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    {/* Filtro de Disciplina */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Disciplina</label>
                        {(() => {
                            const uniqueDisciplines = Array.isArray(dossiers)
                                ? [...new Map(
                                      dossiers.map(d => [d.disciplina_id, { id: d.disciplina_id, name: d.subject_name }])
                                  ).values()]
                                : [];

                            const disciplines = [
                                { id: 'all', name: 'Todas as Disciplinas' },
                                ...uniqueDisciplines
                            ];

                            return (
                                <select
                                    value={selectedDiscipline}
                                    onChange={(e) => setSelectedDiscipline(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    {disciplines.map((disc) => (
                                        <option key={disc.id} value={disc.id}>
                                            {disc.name}
                                        </option>
                                    ))}
                                </select>
                            );
                        })()}
                    </div>

                    {/* Ações */}
                    <div className="flex items-end justify-between gap-2">
                        <label className="inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                className="form-checkbox h-5 w-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                                checked={showInactive}
                                onChange={(e) => setShowInactive(e.target.checked)}
                            />
                            <span className="ml-2 text-sm font-medium text-gray-700">Mostrar Inativos</span>
                        </label>
                        <button
                            onClick={openCreateModal}
                            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg inline-flex items-center"
                        >
                            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Novo Dossiê
                        </button>
                    </div>
                </div>
            </div>

            {/* Lista de Dossiês */}
            {filteredDossiers.length === 0 ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center">
                    <svg className="w-16 h-16 mx-auto text-yellow-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-lg text-gray-700 mb-2">Nenhum dossiê encontrado</p>
                    <p className="text-sm text-gray-500">
                        {searchTerm || selectedDiscipline !== 'all'
                            ? 'Tente ajustar os filtros de pesquisa'
                            : 'Comece criando um novo dossiê'}
                    </p>
                </div>
            ) : (
                <div className="space-y-6">
                    {filteredDossiers.map((discipline) => (
                        <div key={discipline.disciplina_id} className="bg-white rounded-lg shadow-md overflow-hidden">
                            {/* Cabeçalho da Disciplina */}
                            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4">
                                <h2 className="text-xl font-bold">{discipline.subject_name}</h2>
                                <p className="text-sm text-blue-100">
                                    {discipline.dossiers.length} {discipline.dossiers.length === 1 ? 'dossiê' : 'dossiês'}
                                </p>
                            </div>

                            {/* Cartões de Dossiês */}
                            <div className="p-4">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                    {discipline.dossiers.map((dossier) => (
                                        <div
                                            key={dossier.id}
                                            className={`border rounded-lg p-4 hover:shadow-lg transition-shadow ${
                                                !dossier.ativo ? 'bg-gray-50 opacity-75' : 'bg-white'
                                            }`}
                                        >
                                            {/* Cabeçalho do Dossiê */}
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="flex-1">
                                                    <h3 className="text-lg font-bold text-gray-800 mb-1">
                                                        {dossier.nome}
                                                        {!dossier.ativo && (
                                                            <span className="ml-2 text-xs bg-gray-300 text-gray-700 px-2 py-1 rounded">
                                                                Inativo
                                                            </span>
                                                        )}
                                                    </h3>
                                                    <div className="flex items-center text-sm text-gray-600">
                                                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                        </svg>
                                                        {dossier.data_inicio ? new Date(dossier.data_inicio).toLocaleDateString('pt-PT') : '-'}
                                                        <span className="mx-2">→</span>
                                                        {dossier.data_fim ? new Date(dossier.data_fim).toLocaleDateString('pt-PT') : '-'}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Abas de Ação */}
                                            <div className="grid grid-cols-3 gap-2 mb-3">
                                                <button
                                                    onClick={() => navigateToDossier(dossier.id, 'grades')}
                                                    className="bg-purple-50 hover:bg-purple-100 text-purple-700 font-semibold py-2 px-3 rounded-lg text-sm transition-colors flex items-center justify-center"
                                                    title="Ver classificações"
                                                >
                                                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                                    </svg>
                                                    Notas
                                                </button>
                                                <button
                                                    onClick={() => navigateToDossier(dossier.id, 'momentos-avaliacao')}
                                                    className="bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold py-2 px-3 rounded-lg text-sm transition-colors flex items-center justify-center"
                                                    title="Momentos de avaliação"
                                                >
                                                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    Momentos
                                                </button>
                                                <button
                                                    onClick={() => navigateToDossier(dossier.id, 'contadores')}
                                                    className="bg-green-50 hover:bg-green-100 text-green-700 font-semibold py-2 px-3 rounded-lg text-sm transition-colors flex items-center justify-center"
                                                    title="Contadores e detalhes"
                                                >
                                                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                                    </svg>
                                                    Contadores
                                                </button>
                                            </div>

                                            {/* Ações de Editar/Apagar */}
                                            <div className="flex items-center gap-2 pt-3 border-t">
                                                <button
                                                    onClick={() => openEditModal(dossier)}
                                                    className="flex-1 bg-gray-50 hover:bg-gray-100 text-gray-700 font-semibold py-2 px-3 rounded-lg text-sm transition-colors flex items-center justify-center"
                                                >
                                                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                    </svg>
                                                    Editar
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteDossier(dossier.id)}
                                                    className="flex-1 bg-red-50 hover:bg-red-100 text-red-700 font-semibold py-2 px-3 rounded-lg text-sm transition-colors flex items-center justify-center"
                                                >
                                                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                    Apagar
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            <Modal isOpen={isModalOpen} onClose={closeModal}>
                <DossierForm
                    isOpen={isModalOpen}
                    onClose={closeModal}
                    onSave={handleSaveDossier}
                    dossier={editingDossier}
                    professorId={professorId}
                />
            </Modal>
        </div>
    );
};

export default DossierPage;
