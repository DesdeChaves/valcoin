import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Modal from '../Layout/Modal';
import MomentoAvaliacaoForm from './MomentoAvaliacaoForm';
import { fetchMomentosAvaliacaoByDossie, saveMomentoAvaliacao, updateMomentoAvaliacao, deleteMomentoAvaliacao } from '../../utils/api';

function MomentoAvaliacaoManagementPage() {
  const { dossieId } = useParams();
  const [momentos, setMomentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMomento, setSelectedMomento] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('date-desc');
  const navigate = useNavigate();

  const fetchMomentos = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetchMomentosAvaliacaoByDossie(dossieId);
      setMomentos(response.data || []);
    } catch (err) {
      setError('Erro ao carregar momentos de avaliação. Por favor, tente novamente.');
      console.error('Error fetching momentos de avaliação:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (dossieId) {
      fetchMomentos();
    }
  }, [dossieId]);

  const handleOpenModal = (momento) => {
    setSelectedMomento(momento);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setSelectedMomento(null);
    setIsModalOpen(false);
  };

  const handleSave = async (momentoData) => {
    try {
      if (selectedMomento) {
        await updateMomentoAvaliacao(selectedMomento.id, momentoData);
      } else {
        await saveMomentoAvaliacao({ ...momentoData, dossie_id: dossieId });
      }
      handleCloseModal();
      fetchMomentos();
    } catch (err) {
      setError('Erro ao salvar momento de avaliação.');
      console.error('Error saving momento de avaliação:', err);
    }
  };

  const handleDelete = async (momentoId) => {
    if (window.confirm('Tem certeza que quer apagar este momento de avaliação e todas as notas finais associadas? Esta ação não pode ser desfeita.')) {
      try {
        await deleteMomentoAvaliacao(momentoId);
        fetchMomentos();
      } catch (err) {
        setError('Erro ao apagar momento de avaliação.');
        console.error('Error deleting momento de avaliação:', err);
        alert('Erro ao apagar momento de avaliação.');
      }
    }
  };

  // Filter and sort momentos
  const getFilteredAndSortedMomentos = () => {
    let filtered = momentos.filter(momento =>
      momento.nome.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'date-desc':
          return new Date(b.created_at) - new Date(a.created_at);
        case 'date-asc':
          return new Date(a.created_at) - new Date(b.created_at);
        case 'name-asc':
          return a.nome.localeCompare(b.nome);
        case 'name-desc':
          return b.nome.localeCompare(a.nome);
        default:
          return 0;
      }
    });

    return sorted;
  };

  const filteredMomentos = getFilteredAndSortedMomentos();

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando momentos de avaliação...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-3xl font-bold">Momentos de Avaliação</h2>
            <p className="text-gray-600 mt-1">Gerencie os momentos de avaliação deste dossiê</p>
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

      {/* Error Display */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-100 border border-blue-300 rounded-lg p-4">
          <p className="text-sm text-blue-600 font-semibold">Total de Momentos</p>
          <p className="text-2xl font-bold text-blue-800">{momentos.length}</p>
        </div>
        <div className="bg-green-100 border border-green-300 rounded-lg p-4">
          <p className="text-sm text-green-600 font-semibold">Mais Recente</p>
          <p className="text-lg font-bold text-green-800">
            {momentos.length > 0 
              ? new Date(Math.max(...momentos.map(m => new Date(m.created_at)))).toLocaleDateString('pt-PT')
              : '-'}
          </p>
        </div>
        <div className="bg-purple-100 border border-purple-300 rounded-lg p-4">
          <p className="text-sm text-purple-600 font-semibold">Mais Antigo</p>
          <p className="text-lg font-bold text-purple-800">
            {momentos.length > 0
              ? new Date(Math.min(...momentos.map(m => new Date(m.created_at)))).toLocaleDateString('pt-PT')
              : '-'}
          </p>
        </div>
      </div>

      {/* Search and Sort Controls */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Pesquisar Momentos
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Digite o nome do momento..."
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
              <option value="date-desc">Data (Mais Recente)</option>
              <option value="date-asc">Data (Mais Antigo)</option>
              <option value="name-asc">Nome (A-Z)</option>
              <option value="name-desc">Nome (Z-A)</option>
            </select>
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            onClick={() => handleOpenModal(null)}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg inline-flex items-center shadow-md transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Adicionar Novo Momento
          </button>
        </div>
      </div>

      {/* Momentos List */}
      {filteredMomentos.length === 0 ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center">
          <svg className="w-16 h-16 mx-auto text-yellow-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-lg text-gray-700 mb-2">
            {searchTerm 
              ? 'Nenhum momento encontrado com esse critério de pesquisa'
              : 'Nenhum momento de avaliação encontrado para este dossiê'}
          </p>
          <p className="text-sm text-gray-500 mb-4">
            {!searchTerm && 'Comece adicionando um novo momento de avaliação'}
          </p>
          {!searchTerm && (
            <button
              onClick={() => handleOpenModal(null)}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg inline-flex items-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Criar Primeiro Momento
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMomentos.map((momento) => (
            <div 
              key={momento.id} 
              className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow overflow-hidden border border-gray-200"
            >
              {/* Card Header */}
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4">
                <h3 className="text-xl font-bold mb-1 truncate" title={momento.nome}>
                  {momento.nome}
                </h3>
                <div className="flex items-center text-blue-100 text-sm">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Criado em: {new Date(momento.created_at).toLocaleDateString('pt-PT')}
                </div>
              </div>

              {/* Card Body */}
              <div className="p-4">
                {momento.descricao && (
                  <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                    {momento.descricao}
                  </p>
                )}

                {/* Action Buttons */}
                <div className="space-y-2">
                  <button
                    onClick={() => navigate(`/professor/momento-avaliacao/${momento.id}/notas-finais`)}
                    className="w-full bg-green-50 hover:bg-green-100 text-green-700 font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Ver Notas Finais
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleOpenModal(momento)}
                      className="bg-yellow-50 hover:bg-yellow-100 text-yellow-700 font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Editar
                    </button>

                    <button
                      onClick={() => handleDelete(momento.id)}
                      className="bg-red-50 hover:bg-red-100 text-red-700 font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Apagar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={handleCloseModal} 
        title={selectedMomento ? 'Editar Momento de Avaliação' : 'Criar Novo Momento de Avaliação'}
      >
        <MomentoAvaliacaoForm 
          momento={selectedMomento} 
          onSave={handleSave} 
          onCancel={handleCloseModal} 
        />
      </Modal>
    </div>
  );
}

export default MomentoAvaliacaoManagementPage;
