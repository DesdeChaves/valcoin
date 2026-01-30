import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import * as api from '../../services/memoria.api';
import EditFlashcardModal from './EditFlashcardModal';
import ShareFlashcardModal from './ShareFlashcardModal';
import ImportCSVModal from './ImportCSVModal';
import { Search, Filter, X, Calendar, Tag, ChevronDown, ChevronUp, FileText, Download, Loader2, FileUp, Upload, Share2 } from 'lucide-react';
import ConversionWheel from '../shared/ConversionWheel';


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
  const [sharingFlashcard, setSharingFlashcard] = useState(null); // New state for sharing
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false); // New state for sharing modal
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [pdfError, setPdfError] = useState('');
  const [worksheetNumQuestions, setWorksheetNumQuestions] = useState(10);
  const [worksheetIncludeSolutions, setWorksheetIncludeSolutions] = useState(true);
  
  
  // Novos estados para filtros
  const [assuntos, setAssuntos] = useState([]);
  const [selectedAssunto, setSelectedAssunto] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCard, setExpandedCard] = useState(null);
  const location = useLocation();

  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      setError('');
      try {
        const disciplinesResponse = await api.getProfessorDisciplines();
        const disciplinesData = disciplinesResponse.data || [];
        setDisciplines(disciplinesData);

        if (disciplinesData.length === 0) {
          setLoading(false);
          return;
        }

        const queryParams = new URLSearchParams(location.search);
        const flashcardIdFromQuery = queryParams.get('flashcardId');

        let targetDisciplineId = disciplinesData[0].id;
        
        if (flashcardIdFromQuery) {
          setSearchTerm(flashcardIdFromQuery);
          setExpandedCard(flashcardIdFromQuery);

          const flashcardsResponse = await api.getProfessorFlashcards(); // Fetch all
          const allFlashcards = flashcardsResponse.data || [];
          
          const card = allFlashcards.find(fc => String(fc.id) === String(flashcardIdFromQuery));
          
          if (card) {
            targetDisciplineId = card.discipline_id;
            setFlashcards(allFlashcards.filter(fc => fc.discipline_id === targetDisciplineId));
          } else {
            setError(`Flashcard com ID ${flashcardIdFromQuery} não encontrado. A mostrar a primeira disciplina.`);
            const flashcardsResponse = await api.getProfessorFlashcards(targetDisciplineId);
            setFlashcards(flashcardsResponse.data || []);
          }
        } else {
          const flashcardsResponse = await api.getProfessorFlashcards(targetDisciplineId);
          setFlashcards(flashcardsResponse.data || []);
        }
        
        if (targetDisciplineId) {
          setSelectedDiscipline(targetDisciplineId);
          const assuntosResponse = await api.getProfessorAssuntos(targetDisciplineId);
          setAssuntos(assuntosResponse.data || []);
        }

      } catch (err) {
        console.error('Erro ao carregar dados:', err);
        setError('Não foi possível carregar os dados da página.');
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [location.search]);

  useEffect(() => {
    if (selectedDiscipline) {
      // Re-fetch flashcards ONLY when the user manually changes discipline,
      // and NOT on the initial load triggered by a flashcardId in the URL.
      const queryParams = new URLSearchParams(location.search);
      if (!queryParams.has('flashcardId')) {
        fetchFlashcards();
        fetchAssuntos();
      }
    }
  }, [selectedDiscipline]);

  const fetchFlashcards = async () => {
    if (!selectedDiscipline) return;
    try {
      setLoading(true);
      const response = await api.getProfessorFlashcards(selectedDiscipline);
      setFlashcards(response.data);
    } catch (err) {
      setError('Erro ao carregar flashcards');
    } finally {
      setLoading(false);
    }
  };

  const fetchAssuntos = async () => {
    try {
      const response = await api.getProfessorAssuntos(selectedDiscipline);
      setAssuntos(response.data || []);
    } catch (err) {
      console.error('Erro ao carregar assuntos:', err);
    }
  };

  const handleDeleteFlashcard = async (id) => {
    if (!window.confirm('Tens a certeza que queres eliminar este flashcard?')) return;

    try {
      await api.deleteFlashcard(id);
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
  
  const handleOpenShareModal = (card) => { // New handler
    setSharingFlashcard(card);
    setIsShareModalOpen(true);
  };

  const handleCloseShareModal = () => { // New handler
    setSharingFlashcard(null);
    setIsShareModalOpen(false);
    fetchFlashcards(); // Refresh list after sharing to show updated state
  };

  const handleSaveFlashcard = async (updatedCard) => {
    try {
      await api.editFlashcard(updatedCard.id, updatedCard);
      fetchFlashcards();
      handleCloseEditModal();
    } catch (err) {
      alert('Erro ao guardar as alterações.');
    }
  };

  const generateWorksheetHtml = (flashcards, disciplineName, professorName, includeSolutions) => {
    let questionsHtml = '';
    let solutionsHtml = '';

    flashcards.forEach((flashcard, index) => {
      const questionNumber = index + 1;
      let frontContent = flashcard.front || '';
      let solutionContent = flashcard.back || '';

      // Make image URLs absolute for Gotenberg
      const absoluteImageUrl = flashcard.image_url ? `http://nginx${flashcard.image_url}` : '';

      switch (flashcard.type) {
        case 'cloze':
          frontContent = flashcard.cloze_text.replace(/{{c\d+::(.*?)}}/g, '_______');
          solutionContent = flashcard.cloze_text.replace(/{{c\d+::(.*?)}}/g, '<strong>$1</strong>');
          break;
        case 'image_occlusion':
          frontContent = `<img src="${absoluteImageUrl}" style="max-width: 100%; height: auto; max-height: 5cm; display: block; margin-bottom: 10px;" />`;
          solutionContent = flashcard.occlusion_data?.map(occ => occ.label).join('<br/>') || 'N/A';
          break;
        case 'image_text':
          frontContent = `<img src="${absoluteImageUrl}" style="max-width: 100%; height: auto; max-height: 5cm; display: block; margin-bottom: 10px;" /><p>${flashcard.front}</p>`;
          solutionContent = flashcard.back;
          break;
        default:
          solutionContent = flashcard.back;
          break;
      }

      questionsHtml += `
        <div style="margin-bottom: 20px; padding-bottom: 10px; border-bottom: 1px dashed #ccc;">
          <p style="font-weight: bold;">${questionNumber}. ${frontContent}</p>
          <div style="min-height: 20px; border: 1px dashed #eee; margin-top: 10px; padding: 5px;"></div>
        </div>
      `;

      solutionsHtml += `
        <div style="margin-bottom: 20px; padding-bottom: 10px; border-bottom: 1px dashed #ccc;">
          <p style="font-weight: bold;">${questionNumber}. ${frontContent}</p>
          <p style="color: green; margin-top: 5px;">Solução: ${solutionContent}</p>
        </div>
      `;
    });

    const headerHtml = `
      <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 15px;">
        <img src="http://nginx/qualidade/logotipo.jpg" alt="Logotipo" style="max-width: 718px; height: auto; margin-bottom: 20px;">
        <h1 style="color: #333; font-size: 28px; margin: 0;">Ficha de Trabalho: ${disciplineName}</h1>
        <p style="color: #666; font-size: 16px; margin: 5px 0 0;">Criado por: ${professorName}</p>
        <p style="color: #666; font-size: 14px; margin: 5px 0 0;">Data: ${new Date().toLocaleDateString('pt-PT')}</p>
      </div>
    `;

    return `
      <html>
      <head>
          <title>Ficha de Trabalho - ${disciplineName}</title>
          <style>
              body { font-family: 'Arial', sans-serif; margin: 40px; color: #333; font-size: 12px; }
              h1, h2, h3, p { margin: 0; padding: 0; }
              .page-break { page-break-after: always; }
              .questions-container { column-count: 2; column-gap: 20px; }
              .questions-container > div { break-inside: avoid; }
          </style>
      </head>
      <body>
          ${headerHtml}
          <h2>Questões</h2>
          <div class="questions-container">
            ${questionsHtml}
          </div>
          ${includeSolutions ? `
              <div class="page-break"></div>
              ${headerHtml}
              <h2>Soluções</h2>
              ${solutionsHtml}
          ` : ''}
      </body>
      </html>
    `;
  };

  const handleGeneratePdf = async () => {
    if (!selectedDiscipline) {
      alert('Por favor, selecione uma disciplina primeiro.');
      return;
    }
    
    // Shuffle the filtered flashcards to get a random selection
    const shuffled = [...filteredFlashcards].sort(() => 0.5 - Math.random());
    const questionsToGenerate = shuffled.slice(0, worksheetNumQuestions);

    if (questionsToGenerate.length === 0) {
      alert('Não há flashcards para gerar a ficha de trabalho.');
      return;
    }

    setGeneratingPdf(true);
    setPdfError('');

    try {
      const user = JSON.parse(localStorage.getItem('user'));
      const professorName = user?.nome || 'Professor';
      const discipline = disciplines.find(d => d.id === selectedDiscipline);
      const disciplineName = discipline?.nome || 'Disciplina'; // Corrected to d.nome

      const htmlContent = generateWorksheetHtml(questionsToGenerate, disciplineName, professorName, worksheetIncludeSolutions);

      const formData = new FormData();
      const htmlFile = new Blob([htmlContent], { type: 'text/html' });
      formData.append('files', htmlFile, 'index.html');
      formData.append('paperWidth', '8.27');
      formData.append('paperHeight', '11.69');
      formData.append('marginTop', '0.5');
      formData.append('marginBottom', '0.5');
      formData.append('marginLeft', '0.5');
      formData.append('marginRight', '0.5');
      formData.append('footerTemplate', '<div style="font-size: 10px; width: 100%; text-align: center;"><span class="pageNumber"></span> / <span class="totalPages"></span></div>');


      const response = await fetch('/gotenberg/forms/chromium/convert/html', {
          method: 'POST',
          body: formData,
      });

      if (!response.ok) {
          throw new Error(`Erro ao gerar PDF: ${response.statusText}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const fileName = `Ficha_Trabalho_${disciplineName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Erro ao gerar PDF:', err);
      setPdfError('Erro ao gerar ficha de trabalho PDF.');
      alert('Não foi possível gerar o PDF. Verifique a consola para mais detalhes.');
    } finally {
      setGeneratingPdf(false);
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
      // Adicionado para permitir pesquisa por ID
      if (String(card.id).toLowerCase() === search) {
        return true;
      }
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

    if (card.type === 'image_text') {
      return (
        <div className="mt-3 space-y-4 text-sm">
          <div>
            <span className="font-semibold text-gray-600">Frente:</span>
            <div className="mt-1 p-2 bg-gray-50 rounded">{card.front}</div>
            {card.image_url && <img src={card.image_url} alt="Frente" className="mt-2 max-w-full h-48 object-cover rounded shadow-md mx-auto" />}
          </div>
          <div>
            <span className="font-semibold text-gray-600">Verso:</span>
            <div className="mt-1 p-2 bg-indigo-50 rounded text-indigo-800">{card.back}</div>
            {card.back_image_url && <img src={card.back_image_url} alt="Verso" className="mt-2 max-w-full h-48 object-cover rounded shadow-md mx-auto" />}
          </div>
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

    if (card.type === 'spelling') {
      return (
        <div className="mt-3 space-y-2 text-sm">
          <div>
            <span className="font-semibold text-gray-600">Palavra a soletrar:</span>
            <div className="mt-1 p-2 bg-yellow-50 rounded font-bold text-lg">{card.audio_text}</div>
          </div>
          <div>
            <span className="font-semibold text-gray-600">Resposta esperada:</span>
            <div className="mt-1 p-2 bg-yellow-50 rounded font-mono">{card.expected_answer}</div>
          </div>
        </div>
      );
    }

    if (card.type === 'roda') {
        return (
            <div className="mt-3 space-y-2 text-sm">
                <div>
                    <span className="font-semibold text-gray-600">Pergunta / Contexto:</span>
                    <div className="mt-1 p-2 bg-indigo-50 rounded">{card.front}</div>
                </div>
                <div>
                    <span className="font-semibold text-gray-600">Configuração Roda (Pergunta):</span>
                    <div className="mt-1 p-2 bg-indigo-50 rounded font-mono text-xs">{card.roda_pergunta}</div>
                </div>
                {card.roda_pergunta && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                        <h4 className="font-semibold text-gray-700 mb-2">Preview Pergunta:</h4>
                        <ConversionWheel config={card.roda_pergunta} revealed={false} />
                    </div>
                )}
                <div>
                    <span className="font-semibold text-gray-600">Configuração Roda (Resposta):</span>
                    <div className="mt-1 p-2 bg-indigo-50 rounded font-mono text-xs">{card.roda_resposta}</div>
                </div>
                {card.roda_resposta && (
                    <div className="mt-4 p-4 bg-green-50 rounded-lg">
                        <h4 className="font-semibold text-green-700 mb-2">Preview Resposta:</h4>
                        <ConversionWheel config={card.roda_resposta} revealed={true} />
                    </div>
                )}
                {card.roda_resposta_opcional && (
                    <div>
                        <span className="font-semibold text-gray-600">Explicação Adicional:</span>
                        <div className="mt-1 p-2 bg-indigo-50 rounded">{card.roda_resposta_opcional}</div>
                    </div>
                )}
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
      image_text: 'Imagem e Texto',
      phonetic: 'Fonético',
      spelling: 'Soletrar',
      roda: 'Roda'
    };
    return labels[type] || type;
  };

  const getTypeColor = (type) => {
    const colors = {
      basic: 'bg-blue-100 text-blue-800',
      cloze: 'bg-purple-100 text-purple-800',
      image_occlusion: 'bg-green-100 text-green-800',
      image_text: 'bg-yellow-100 text-yellow-800',
      phonetic: 'bg-orange-100 text-orange-800',
      spelling: 'bg-yellow-100 text-yellow-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const getCardPreview = (card) => {
    if (card.type === 'basic') return card.front;
    if (card.type === 'cloze') return card.cloze_text?.replace(/{{c\d+::(.*?)}}/g, '[$1]');
    if (card.type === 'image_occlusion') return 'Flashcard de Imagem';
    if (card.type === 'image_text') return card.front;
    if (card.type === 'phonetic') return card.word || 'Flashcard Fonético';
    if (card.type === 'spelling') return card.audio_text || 'Flashcard de Soletrar';
    if (card.type === 'roda') return card.front || 'Flashcard de Roda';
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
                  <option key={d.id} value={d.id}>{d.nome}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Action Buttons Section */}
        {selectedDiscipline && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* PDF Generation */}
            <div>
              <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <FileText className="w-6 h-6" /> Gerar Ficha de Trabalho
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Nº de Questões</label>
                  <input
                    type="number"
                    value={worksheetNumQuestions}
                    onChange={(e) => setWorksheetNumQuestions(Math.max(1, parseInt(e.target.value || 1, 10)))}
                    min="1"
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="flex items-center pt-6">
                  <input
                    type="checkbox"
                    id="includeSolutions"
                    checked={worksheetIncludeSolutions}
                    onChange={(e) => setWorksheetIncludeSolutions(e.target.checked)}
                    className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label htmlFor="includeSolutions" className="ml-2 text-sm font-semibold text-gray-700">Incluir Soluções</label>
                </div>
              </div>
              {pdfError && <p className="text-red-600 text-sm mt-2">{pdfError}</p>}
              <button
                onClick={handleGeneratePdf}
                disabled={generatingPdf}
                className="mt-6 w-full flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white font-bold rounded-lg shadow-md hover:bg-indigo-700 transition-colors duration-200"
              >
                {generatingPdf ? <><Loader2 className="animate-spin h-5 w-5" />A Gerar...</> : <><Download className="w-5 h-5" />Gerar Ficha</>}
              </button>
            </div>
            
            {/* CSV Import */}
            <div>
              <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <FileUp className="w-6 h-6" /> Importar Flashcards
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                Importe múltiplos flashcards de uma só vez usando um ficheiro CSV.
              </p>
              <button
                onClick={() => setIsImportModalOpen(true)}
                disabled={!selectedDiscipline}
                className="mt-6 w-full flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 text-white font-bold rounded-lg shadow-md hover:bg-purple-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Upload className="w-5 h-5" />
                Importar de CSV
              </button>
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
                <option value="image_text">Imagem e Texto</option>
                <option value="phonetic">Fonético</option>
                <option value="spelling">Soletrar</option>
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
                            handleOpenShareModal(card);
                          }}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition"
                          title="Partilhar"
                        >
                          <Share2 className="w-5 h-5" />
                        </button>
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
      
      {isShareModalOpen && (
        <ShareFlashcardModal
            flashcard={sharingFlashcard}
            onClose={handleCloseShareModal}
        />
      )}

      {isImportModalOpen && (
        <ImportCSVModal
            disciplineId={selectedDiscipline}
            assuntoName={selectedAssunto === 'all' || selectedAssunto === 'none' ? '' : selectedAssunto}
            onClose={() => setIsImportModalOpen(false)}
            onImportSuccess={() => {
                fetchFlashcards();
                // Maybe show a success toast
            }}
        />
      )}
    </div>
  );
};

export default ManageFlashcardsPage;