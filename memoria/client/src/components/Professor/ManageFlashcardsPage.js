import React, { useState, useEffect } from 'react';
import api from '../../api';
import EditFlashcardModal from './EditFlashcardModal';
import { Search, Filter, X, Calendar, Tag, ChevronDown, ChevronUp } from 'lucide-react';

// Função auxiliar para formatar data
const formatDate = (dateString) => {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

const formatDateTime = (dateString) => {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
};

const ManageFlashcardsPage = () => {
  const [disciplines, setDisciplines] = useState([]);
  const [selectedDiscipline, setSelectedDiscipline] = useState(null);
  const [flashcards, setFlashcards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingFlashcard, setEditingFlashcard] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  // Novos estados para filtros
  const [assuntos, setAssuntos] = useState([]);
  const [selectedAssunto, setSelectedAssunto] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCard, setExpandedCard] = useState(null);

  useEffect(() => {
    const fetchDisciplines = async () => {
      try {
        const response = await api.get('/disciplina_turma/professor/me');
        const myDisciplines = response.data.data.map(dt => ({
          id: dt.disciplina_id,
          name: dt.disciplina_nome || `Disciplina ${dt.disciplina_id}`
        }));
        setDisciplines(myDisciplines);
        if (myDisciplines.length > 0) {
          setSelectedDiscipline(myDisciplines[0].id);
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error('Erro ao carregar disciplinas:', err);
        setError('Não foi possível carregar as tuas disciplinas.');
        setLoading(false);
      }
    };

    fetchDisciplines();
  }, []);

  useEffect(() => {
    if (selectedDiscipline) {
      fetchFlashcards();
      fetchAssuntos();
    }
  }, [selectedDiscipline]);

  const fetchFlashcards = async () => {
    try {
      setLoading(true);
      const response = await api.get('/flashcards', {
        params: { discipline_id: selectedDiscipline }
      });
      setFlashcards(response.data.data);
    } catch (err) {
      setError('Erro ao carregar flashcards');
    } finally {
      setLoading(false);
    }
  };

  const fetchAssuntos = async () => {
    try {
      const response = await api.get(`/assuntos/disciplina/${selectedDiscipline}`);
      setAssuntos(response.data.data || []);
    } catch (err) {
      console.error('Erro ao carregar assuntos:', err);
    }
  };

  const handleDeleteFlashcard = async (id) => {
    if (!window.confirm('Tens a certeza que queres eliminar este flashcard?')) return;

    try {
      await api.delete(`/flashcards/${id}`);
      setFlashcards(prev => prev.filter(f => f.id !== id));
    } catch (err) {
      alert('Erro ao eliminar o flashcard.');
    }
  };

  const handleOpenEditModal = (card) => {
    setEditingFlashcard(card);
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setEditingFlashcard(null);
    setIsEditModalOpen(false);
  };

  const handleSaveFlashcard = async (updatedCard) => {
    try {
      await api.put(`/flashcards/${updatedCard.id}`, updatedCard);
      fetchFlashcards();
      handleCloseEditModal();
    } catch (err) {
      alert('Erro ao guardar as alterações.');
    }
  };

  // Filtrar flashcards
  const filteredFlashcards = flashcards.filter(card => {
    // Filtro por assunto
    if (selectedAssunto !== 'all') {
      if (selectedAssunto === 'none') {
        if (card.assunto_name) return false;
      } else {
        if (card.assunto_name !== selectedAssunto) return false;
      }
    }

    // Filtro por tipo
    if (selectedType !== 'all' && card.type !== selectedType) return false;

    // Filtro por pesquisa
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const matchesFront = card.front?.toLowerCase().includes(search);
      const matchesBack = card.back?.toLowerCase().includes(search);
      const matchesCloze = card.cloze_text?.toLowerCase().includes(search);
      const matchesAssunto = card.assunto_name?.toLowerCase().includes(search);
      const matchesWord = card.word?.toLowerCase().includes(search);
      
      if (!matchesFront && !matchesBack && !matchesCloze && !matchesAssunto && !matchesWord) {
        return false;
      }
    }

    return true;
  });

  const clearFilters = () => {
    setSelectedAssunto('all');
    setSelectedType('all');
    setSearchTerm('');
  };

  const renderFlashcardContent = (card, isExpanded) => {
    if (!isExpanded) return null;

    if (card.type === 'basic') {
      return (
        <div className="mt-3 space-y-2 text-sm">
          <div>
            <span className="font-semibold text-gray-600">Frente:</span>
            <div className="mt-1 p-2 bg-gray-50 rounded">{card.front}</div>
          </div>
          <div>
            <span className="font-semibold text-gray-600">Verso:</span>
            <div className="mt-1 p-2 bg-indigo-50 rounded text-indigo-800">{card.back}</div>
          </div>
        </div>
      );
    }

    if (card.type === 'cloze') {
      return (
        <div className="mt-3 p-3 bg-purple-50 rounded text-sm">
          <div dangerouslySetInnerHTML={{ 
            __html: card.cloze_text.replace(/{{c\d+::(.*?)}}/g, '<strong class="text-purple-800">___ ($1)</strong>') 
          }} />
        </div>
      );
    }

    if (card.type === 'image_occlusion') {
      return (
        <div className="mt-3 text-center">
          <img 
            src={card.image_url} 
            alt="Imagem" 
            className="max-w-full h-48 object-cover rounded shadow-md mx-auto" 
          />
          <p className="mt-2 text-xs text-gray-500">
            {card.occlusion_data?.length || 0} regiões ocultas
          </p>
        </div>
      );
    }

    if (card.type === 'phonetic') {
      return (
        <div className="mt-3 space-y-2 text-sm">
          <div>
            <span className="font-semibold text-gray-600">Palavra:</span>
            <div className="mt-1 p-2 bg-orange-50 rounded font-bold text-lg">{card.word}</div>
          </div>
          {card.image_url && (
            <div className="text-center">
              <img 
                src={card.image_url} 
                alt={card.word} 
                className="max-w-full h-32 object-cover rounded shadow-md mx-auto" 
              />
            </div>
          )}
          <div>
            <span className="font-semibold text-gray-600">Fonemas:</span>
            <div className="mt-1 flex gap-2">
              {card.phonemes?.map((phoneme, idx) => (
                <span key={idx} className="px-3 py-1 bg-orange-100 text-orange-800 rounded font-semibold">
                  {phoneme.text}
                </span>
              ))}
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  const getTypeLabel = (type) => {
    const labels = {
      basic: 'Básico',
      cloze: 'Cloze',
      image_occlusion: 'Imagem Oclusão',
      phonetic: 'Fonético'
    };
    return labels[type] || type;
  };

  const getTypeColor = (type) => {
    const colors = {
      basic: 'bg-blue-100 text-blue-800',
      cloze: 'bg-purple-100 text-purple-800',
      image_occlusion: 'bg-green-100 text-green-800',
      phonetic: 'bg-orange-100 text-orange-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const getCardPreview = (card) => {
    if (card.type === 'basic') return card.front;
    if (card.type === 'cloze') return card.cloze_text?.replace(/{{c\d+::(.*?)}}/g, '[$1]');
    if (card.type === 'image_occlusion') return 'Flashcard de Imagem';
    if (card.type === 'phonetic') return card.word || 'Flashcard Fonético';
    return 'Flashcard';
  };

  if (loading && disciplines.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-xl text-gray-600">A carregar...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 mb-2">
            🧠 Gerir Flashcards
          </h1>
          <p className="text-gray-600 text-lg">Organize e edite os seus flashcards</p>
        </header>

        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-800 rounded-xl">
            {error}
          </div>
        )}

        {/* Seletor de Disciplina */}
        {disciplines.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <label className="text-lg font-semibold text-gray-800">Disciplina:</label>
              <select
                value={selectedDiscipline || ''}
                onChange={(e) => {
                  setSelectedDiscipline(e.target.value);
                  setSelectedAssunto('all');
                  setSearchTerm('');
                }}
                className="flex-1 max-w-md px-4 py-2 bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-300 rounded-lg font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {disciplines.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Filtros */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-indigo-600" />
            <h2 className="text-xl font-bold text-gray-800">Filtros</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Pesquisa */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Pesquisar</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Pesquisar conteúdo..."
                  className="w-full pl-10 pr-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Filtro por Assunto */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Assunto</label>
              <div className="relative">
                <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <select
                  value={selectedAssunto}
                  onChange={(e) => setSelectedAssunto(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none"
                >
                  <option value="all">Todos os assuntos</option>
                  <option value="none">Sem assunto</option>
                  {assuntos.map(assunto => (
                    <option key={assunto.id} value={assunto.name}>
                      {assunto.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Filtro por Tipo */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Tipo</label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">Todos os tipos</option>
                <option value="basic">Básico</option>
                <option value="cloze">Cloze</option>
                <option value="image_occlusion">Imagem Oclusão</option>
                <option value="phonetic">Fonético</option>
              </select>
            </div>
          </div>

          {/* Botão limpar filtros */}
          {(selectedAssunto !== 'all' || selectedType !== 'all' || searchTerm) && (
            <button
              onClick={clearFilters}
              className="mt-4 flex items-center gap-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition"
            >
              <X className="w-4 h-4" />
              Limpar filtros
            </button>
          )}
        </div>

        {/* Contador e Lista */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-indigo-800">
              Flashcards ({filteredFlashcards.length})
            </h2>
          </div>

          {loading ? (
            <p className="text-center text-gray-600 py-12">A carregar flashcards...</p>
          ) : filteredFlashcards.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 text-lg mb-2">
                {flashcards.length === 0 
                  ? 'Ainda não criaste flashcards para esta disciplina.'
                  : 'Nenhum flashcard corresponde aos filtros aplicados.'
                }
              </p>
              {flashcards.length > 0 && (
                <button
                  onClick={clearFilters}
                  className="text-indigo-600 hover:text-indigo-700 font-semibold"
                >
                  Limpar filtros
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredFlashcards.map(card => (
                <div
                  key={card.id}
                  className="border-2 border-gray-200 rounded-lg hover:border-indigo-300 transition-all"
                >
                  {/* Header do card (sempre visível) */}
                  <div 
                    className="p-4 cursor-pointer"
                    onClick={() => setExpandedCard(expandedCard === card.id ? null : card.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        {/* Tipo */}
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getTypeColor(card.type)}`}>
                          {getTypeLabel(card.type)}
                        </span>

                        {/* Preview do conteúdo */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800 truncate">
                            {getCardPreview(card)}
                          </p>
                          <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                            {card.assunto_name && (
                              <span className="flex items-center gap-1">
                                <Tag className="w-3 h-3" />
                                {card.assunto_name}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {formatDate(card.scheduled_date)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Ações */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditModal(card);
                          }}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="Editar"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteFlashcard(card.id);
                          }}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="Eliminar"
                        >
                          🗑️
                        </button>
                        <button className="p-2 text-gray-600">
                          {expandedCard === card.id ? (
                            <ChevronUp className="w-5 h-5" />
                          ) : (
                            <ChevronDown className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Conteúdo expandido */}
                  {expandedCard === card.id && (
                    <div className="px-4 pb-4 border-t border-gray-200">
                      {renderFlashcardContent(card, true)}
                      
                      {/* Informações adicionais */}
                      <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-2 gap-2 text-xs text-gray-600">
                        <div>
                          <span className="font-semibold">Criado:</span> {formatDateTime(card.created_at)}
                        </div>
                        {card.hints?.length > 0 && (
                          <div>
                            <span className="font-semibold">Dicas:</span> {card.hints.length}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {isEditModalOpen && (
        <EditFlashcardModal
          flashcard={editingFlashcard}
          onClose={handleCloseEditModal}
          onSave={handleSaveFlashcard}
        />
      )}
    </div>
  );
};

export default ManageFlashcardsPage;
