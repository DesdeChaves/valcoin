// src/components/Professor/FlashCardCreator.js

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { api, audioApi } from '../../api';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { Mic, Volume2, Plus, Trash2, Info } from 'lucide-react';

const FlashCardCreator = ({ disciplineId, selectedIdioma, onSuccess }) => {
  const [type, setType] = useState('basic');
  
  // Campos básicos
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [clozeText, setClozeText] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [backImageUrl, setBackImageUrl] = useState('');
  const [masks, setMasks] = useState([]);
  const [hints, setHints] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [assuntoName, setAssuntoName] = useState('');
  const [assuntosList, setAssuntosList] = useState([]);
  
  // Campos para flashcards de áudio
  const [word, setWord] = useState(''); // Para phonetic e reading
  const [phonemes, setPhonemes] = useState([{ text: '', order: 1 }]); // Para phonetic
  const [audioText, setAudioText] = useState(''); // Para dictation e audio_question
  const [expectedAnswer, setExpectedAnswer] = useState(''); // Para todos os tipos de áudio
  const [difficultyLevel, setDifficultyLevel] = useState(1);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [uploading, setUploading] = useState(false);
  const [previewAudioUrl, setPreviewAudioUrl] = useState('');
  const [generatingPreview, setGeneratingPreview] = useState(false);

  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const audioPreviewRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentMask, setCurrentMask] = useState(null);

  const navigate = useNavigate();

  // Tipos de flashcards disponíveis
  const flashcardTypes = [
    { value: 'basic', title: '📋 Básico', desc: 'Pergunta e resposta clássica', category: 'Tradicionais' },
    { value: 'cloze', title: '🔤 Cloze', desc: 'Texto com lacunas', category: 'Tradicionais' },
    { value: 'image_occlusion', title: '🖼️ Imagem', desc: 'Regiões ocultas numa imagem', category: 'Tradicionais' },
    { value: 'image_text', title: '📝 Imagem e Texto', desc: 'Texto e imagem em ambos os lados', category: 'Tradicionais' },
    { value: 'phonetic', title: '🗣️ Fonemas', desc: 'Prática de fonemas animados', category: 'Com Áudio' },
    { value: 'dictation', title: '✍️ Ditado', desc: 'Ouvir e escrever', category: 'Com Áudio' },
    { value: 'audio_question', title: '🎧 Pergunta Áudio', desc: 'Pergunta em áudio (ex: tabuada)', category: 'Com Áudio' },
    { value: 'reading', title: '📖 Leitura', desc: 'Ler texto em voz alta', category: 'Com Áudio' },
    { value: 'spelling', title: '🔤 Soletrar', desc: 'Ouvir e soletrar a palavra', category: 'Com Áudio' }
  ];

  // Agrupar tipos por categoria
  const groupedTypes = flashcardTypes.reduce((acc, type) => {
    if (!acc[type.category]) acc[type.category] = [];
    acc[type.category].push(type);
    return acc;
  }, {});

  useEffect(() => {
    if (!disciplineId) return;

    const fetchAssuntos = async () => {
      try {
        const response = await api.get(`/assuntos/disciplina/${disciplineId}`);
        setAssuntosList(response.data.data);
      } catch (err) {
        console.error('Erro ao carregar assuntos:', err);
      }
    };

    fetchAssuntos();
  }, [disciplineId]);
  
  const onDrop = useCallback(async (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setUploading(true);
    setError('');

    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await api.post('/upload-image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      setImageUrl(response.data.path);
      setMasks([]);
    } catch (err) {
      setError('Erro ao fazer upload da imagem.');
    } finally {
      setUploading(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: 'image/*',
    multiple: false
  });

  const onBackImageDrop = useCallback(async (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setUploading(true);
    setError('');

    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await api.post('/upload-image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      setBackImageUrl(response.data.path);
    } catch (err) {
      setError('Erro ao fazer upload da imagem de verso.');
    } finally {
      setUploading(false);
    }
  }, []);

  const { getRootProps: getBackRootProps, getInputProps: getBackInputProps, isDragActive: isBackDragActive } = useDropzone({
    onDrop: onBackImageDrop,
    accept: 'image/*',
    multiple: false
  });

  // Funções para phonetic
  const addPhoneme = () => {
    setPhonemes([...phonemes, { text: '', order: phonemes.length + 1 }]);
  };

  const removePhoneme = (index) => {
    if (phonemes.length > 1) {
      setPhonemes(phonemes.filter((_, i) => i !== index));
    }
  };

  const updatePhoneme = (index, text) => {
    const updated = [...phonemes];
    updated[index].text = text;
    setPhonemes(updated);
  };

  // Gerar preview de áudio TTS
  const generateAudioPreview = async () => {
    if (!audioText.trim()) {
      alert('Por favor, escreve o texto primeiro');
      return;
    }

    setGeneratingPreview(true);
    setError('');

    try {
      const response = await audioApi.post('/tts/generate', {
        text: audioText,
        language: selectedIdioma
      });
      setPreviewAudioUrl(response.data.audio_url);
    } catch (err) {
      setError('Erro ao gerar preview de áudio. Certifica-te que o serviço de áudio está a funcionar.');
    } finally {
      setGeneratingPreview(false);
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !imageUrl) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    masks.forEach(mask => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(mask.x, mask.y, mask.width, mask.height);

      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3;
      ctx.strokeRect(mask.x, mask.y, mask.width, mask.height);

      ctx.fillStyle = '#dc2626';
      ctx.fillRect(mask.x, mask.y + mask.height - 30, mask.width, 30);
      ctx.font = '14px sans-serif';
      ctx.fillStyle = 'white';
      ctx.textAlign = 'center';
      ctx.fillText(mask.label, mask.x + mask.width / 2, mask.y + mask.height - 10);
    });

    if (currentMask) {
      ctx.strokeStyle = '#4f46e5';
      ctx.lineWidth = 4;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(currentMask.x, currentMask.y, currentMask.width, currentMask.height);
      ctx.setLineDash([]);
    }
  }, [masks, currentMask, imageUrl]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    let endpoint = '/flashcards';
    let payload = {
      discipline_id: disciplineId,
      type,
      hints: hints.split('\n').filter(h => h.trim()),
      scheduled_date: scheduledDate,
      assunto_name: assuntoName,
      idioma: selectedIdioma,
    };

    try {
      // Validação e preparação baseada no tipo
      if (type === 'basic') {
        payload.front = front;
        payload.back = back;
      } 
      else if (type === 'cloze') {
        payload.cloze_text = clozeText;
      } 
      else if (type === 'image_occlusion') {
        if (masks.length === 0) {
          setError('Deve definir pelo menos uma região oculta');
          setLoading(false);
          return;
        }
        payload.image_url = imageUrl;
        payload.occlusion_data = masks.map(m => ({
          mask_id: m.id,
          label: m.label,
          shape: 'rect',
          coords: [m.x, m.y, m.width, m.height]
        }));
      }
      else if (type === 'image_text') {
        payload.front = front;
        payload.back = back;
        payload.image_url = imageUrl;
        payload.back_image_url = backImageUrl;
      }
      else if (type === 'phonetic') {
        const validPhonemes = phonemes.filter(p => p.text.trim());
        if (validPhonemes.length === 0) {
          setError('Adiciona pelo menos um fonema');
          setLoading(false);
          return;
        }
        endpoint = '/audio-flashcards/phonetic';
        payload = {
          discipline_id: disciplineId,
          word,
          phonemes: validPhonemes,
          image_url: imageUrl,
          scheduled_date: scheduledDate,
          assunto_name: assuntoName
        };
      }
      else if (type === 'dictation') {
        if (!audioText.trim() || !expectedAnswer.trim()) {
          setError('Texto para ditado e resposta esperada são obrigatórios');
          setLoading(false);
          return;
        }
        endpoint = '/audio-flashcards/dictation';
        payload = {
          discipline_id: disciplineId,
          audio_text: audioText,
          expected_answer: expectedAnswer,
          difficulty_level: difficultyLevel,
          scheduled_date: scheduledDate,
          assunto_name: assuntoName
        };
      }
      else if (type === 'audio_question') {
        if (!audioText.trim() || !expectedAnswer.trim()) {
          setError('Pergunta e resposta esperada são obrigatórias');
          setLoading(false);
          return;
        }
        endpoint = '/audio-flashcards/audio-question';
        payload = {
          discipline_id: disciplineId,
          audio_text: audioText,
          expected_answer: expectedAnswer,
          difficulty_level: difficultyLevel,
          scheduled_date: scheduledDate,
          assunto_name: assuntoName
        };
      }
      else if (type === 'reading') {
        if (!word.trim() || !expectedAnswer.trim()) {
          setError('Texto para ler e resposta esperada são obrigatórios');
          setLoading(false);
          return;
        }
        endpoint = '/audio-flashcards/reading';
        payload = {
          discipline_id: disciplineId,
          word,
          expected_answer: expectedAnswer,
          difficulty_level: difficultyLevel,
          scheduled_date: scheduledDate,
          assunto_name: assuntoName
        };
      }
      else if (type === 'spelling') {
        if (!audioText.trim() || !expectedAnswer.trim()) {
          setError('Palavra para soletrar e resposta esperada são obrigatórias');
          setLoading(false);
          return;
        }
        endpoint = '/audio-flashcards/spelling';
        payload = {
          discipline_id: disciplineId,
          audio_text: audioText,
          expected_answer: expectedAnswer,
          difficulty_level: difficultyLevel,
          scheduled_date: scheduledDate,
          assunto_name: assuntoName
        };
      }

      await api.post(endpoint, payload);
      setSuccess('Flashcard criado com sucesso! 🧠');
      
      // Reset form
      resetForm();
      
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao criar flashcard');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFront(''); 
    setBack(''); 
    setClozeText(''); 
    setImageUrl(''); 
    setBackImageUrl(''); 
    setMasks([]); 
    setHints(''); 
    setScheduledDate('');
    setAssuntoName('');
    setWord('');
    setPhonemes([{ text: '', order: 1 }]);
    setAudioText('');
    setExpectedAnswer('');
    setDifficultyLevel(1);
    setPreviewAudioUrl('');
  };

  const startDrawing = (e) => {
    if (type !== 'image_occlusion' || !imageUrl) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setCurrentMask({ id: Date.now(), x, y, width: 0, height: 0, label: '' });
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing || !currentMask) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const width = e.clientX - rect.left - currentMask.x;
    const height = e.clientY - rect.top - currentMask.y;

    setCurrentMask(prev => ({
      ...prev,
      width: Math.max(width, 30),
      height: Math.max(height, 30)
    }));
  };

  const stopDrawing = () => {
    if (isDrawing && currentMask && currentMask.width > 30 && currentMask.height > 30) {
      const label = prompt('Nome da região (ex: "Coração", "Mitocôndria"):', 'Região');
      if (label && label.trim()) {
        setMasks(prev => [...prev, { ...currentMask, label: label.trim() }]);
      }
    }
    setCurrentMask(null);
    setIsDrawing(false);
  };

  const removeMask = (id) => {
    setMasks(prev => prev.filter(m => m.id !== id));
  };

  const loadImage = () => {
    const img = imageRef.current;
    const canvas = canvasRef.current;
    if (img && canvas) {
      canvas.width = img.clientWidth;
      canvas.height = img.clientHeight;
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-8 bg-gradient-to-br from-indigo-50 to-white rounded-2xl shadow-xl">
      <h2 className="text-4xl font-bold text-indigo-900 mb-8 text-center">Criar Novo Flashcard</h2>

      {error && <div className="mb-6 p-5 bg-red-100 border border-red-400 text-red-800 rounded-lg">{error}</div>}
      {success && <div className="mb-6 p-5 bg-green-100 border border-green-400 text-green-800 rounded-lg">{success}</div>}

      <form onSubmit={handleSubmit} className="space-y-8">

        {/* Seleção do Tipo */}
        <div>
          <label className="block text-xl font-semibold text-gray-800 mb-4">Tipo de Flashcard</label>
          
          {Object.entries(groupedTypes).map(([category, types]) => (
            <div key={category} className="mb-6">
              <h3 className="text-sm font-semibold text-gray-600 mb-3 uppercase">{category}</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {types.map(t => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => {
                      setType(t.value);
                      setMasks([]);
                      setPreviewAudioUrl('');
                    }}
                    className={`p-4 rounded-xl border-3 transition-all text-left ${
                      type === t.value 
                        ? 'border-indigo-600 bg-indigo-100 shadow-lg scale-105' 
                        : 'border-gray-300 bg-white hover:border-indigo-400 hover:shadow-md'
                    }`}
                  >
                    <div className="font-bold text-base text-indigo-900">{t.title}</div>
                    <div className="text-gray-600 text-sm mt-1">{t.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Conteúdo específico por tipo */}
        <div className="bg-white rounded-xl p-6 shadow-inner">
          
          {/* BASIC */}
          {type === 'basic' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <label className="block font-semibold text-gray-700 mb-3">Frente (Pergunta)</label>
                <textarea
                  value={front}
                  onChange={e => setFront(e.target.value)}
                  required
                  rows="8"
                  className="w-full p-5 border-2 border-gray-300 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-200 transition"
                  placeholder="Ex: Qual é a capital de França?"
                />
              </div>
              <div>
                <label className="block font-semibold text-gray-700 mb-3">Verso (Resposta)</label>
                <textarea
                  value={back}
                  onChange={e => setBack(e.target.value)}
                  required
                  rows="8"
                  className="w-full p-5 border-2 border-gray-300 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-200 transition"
                  placeholder="Ex: Paris"
                />
              </div>
            </div>
          )}

          {/* CLOZE */}
          {type === 'cloze' && (
            <div>
              <label className="block font-semibold text-gray-700 mb-3">
                Texto com Lacunas — use {`{{c1::resposta}} {{c2::outra}}`}
              </label>
              <textarea
                value={clozeText}
                onChange={e => setClozeText(e.target.value)}
                required
                rows="10"
                className="w-full p-5 border-2 border-gray-300 rounded-xl font-mono text-base focus:border-indigo-500 focus:ring-4 focus:ring-indigo-200"
                placeholder="A {{c1::mitocôndria}} é conhecida como a {{c2::central de energia}} da célula."
              />
              <p className="text-sm text-indigo-600 mt-3 bg-indigo-50 p-4 rounded-lg">
                💡 Cada {`{{c1::...}}`} cria uma revisão independente. Pode ter quantas quiseres!
              </p>
            </div>
          )}

          {/* IMAGE OCCLUSION */}
          {type === 'image_occlusion' && (
            <div className="space-y-6">
              <div 
                {...getRootProps()} 
                className={`p-10 border-4 border-dashed rounded-2xl text-center cursor-pointer transition-colors
                  ${isDragActive ? 'border-indigo-600 bg-indigo-100' : 'border-gray-300 hover:border-indigo-400'}`}
              >
                <input {...getInputProps()} />
                {uploading ? (
                  <p className="text-lg text-indigo-800">A enviar imagem...</p>
                ) : isDragActive ? (
                  <p className="text-lg text-indigo-800">Larga a imagem aqui...</p>
                ) : (
                  <p className="text-lg text-gray-600">
                    Arrasta e larga uma imagem aqui, ou clica para selecionar
                  </p>
                )}
              </div>

              {imageUrl && (
                <>
                  <div className="relative inline-block border-4 border-indigo-200 rounded-2xl overflow-hidden shadow-2xl">
                    <img
                      ref={imageRef}
                      src={imageUrl}
                      alt="Imagem base"
                      onLoad={loadImage}
                      className="max-w-full h-auto block"
                    />
                    <canvas
                      ref={canvasRef}
                      className="absolute inset-0 cursor-crosshair"
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                    />
                  </div>

                  <p className="text-center text-gray-600 mt-4">
                    <strong>Clique e arraste</strong> para criar regiões ocultas
                  </p>

                  {masks.length > 0 && (
                    <div className="mt-6 p-5 bg-gray-50 rounded-xl">
                      <h4 className="font-semibold text-lg mb-3">Regiões definidas ({masks.length})</h4>
                      <div className="flex flex-wrap gap-3">
                        {masks.map(mask => (
                          <div key={mask.id} className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow border">
                            <span className="font-medium">{mask.label}</span>
                            <button
                              type="button"
                              onClick={() => removeMask(mask.id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* IMAGE_TEXT */}
          {type === 'image_text' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Front */}
              <div className="space-y-4">
                <label className="block font-semibold text-gray-700 mb-3">Frente</label>
                <textarea
                  value={front}
                  onChange={e => setFront(e.target.value)}
                  required
                  rows="4"
                  className="w-full p-5 border-2 border-gray-300 rounded-xl focus:border-indigo-500"
                  placeholder="Texto da frente"
                />
                <div 
                  {...getRootProps()} 
                  className={`p-6 border-2 border-dashed rounded-xl text-center cursor-pointer ${isDragActive ? 'border-indigo-600 bg-indigo-100' : 'border-gray-300 hover:border-indigo-400'}`}
                >
                  <input {...getInputProps()} />
                  {imageUrl ? (
                    <img src={imageUrl} alt="Preview Frente" className="max-w-xs mx-auto rounded-lg" />
                  ) : (
                    <p className="text-gray-600">Imagem da Frente (opcional)</p>
                  )}
                </div>
              </div>

              {/* Back */}
              <div className="space-y-4">
                <label className="block font-semibold text-gray-700 mb-3">Verso</label>
                <textarea
                  value={back}
                  onChange={e => setBack(e.target.value)}
                  required
                  rows="4"
                  className="w-full p-5 border-2 border-gray-300 rounded-xl focus:border-indigo-500"
                  placeholder="Texto do verso"
                />
                <div 
                  {...getBackRootProps()} 
                  className={`p-6 border-2 border-dashed rounded-xl text-center cursor-pointer ${isBackDragActive ? 'border-indigo-600 bg-indigo-100' : 'border-gray-300 hover:border-indigo-400'}`}
                >
                  <input {...getBackInputProps()} />
                  {backImageUrl ? (
                    <img src={backImageUrl} alt="Preview Verso" className="max-w-xs mx-auto rounded-lg" />
                  ) : (
                    <p className="text-gray-600">Imagem do Verso (opcional)</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* PHONETIC */}
          {type === 'phonetic' && (
            <div className="space-y-6">
              <div>
                <label className="block font-semibold text-gray-700 mb-3">Palavra Completa</label>
                <input
                  type="text"
                  value={word}
                  onChange={e => setWord(e.target.value)}
                  required
                  className="w-full p-4 border-2 border-gray-300 rounded-xl focus:border-indigo-500"
                  placeholder="Ex: pato"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-3">Fonemas (cada um acende separadamente)</label>
                <div className="space-y-3">
                  {phonemes.map((phoneme, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <span className="text-gray-600 font-semibold w-8">{index + 1}.</span>
                      <input
                        type="text"
                        value={phoneme.text}
                        onChange={e => updatePhoneme(index, e.target.value)}
                        required
                        className="flex-1 p-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500"
                        placeholder={`Ex: ${index === 0 ? 'pa' : 'to'}`}
                      />
                      {phonemes.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removePhoneme(index)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={addPhoneme}
                  className="mt-3 px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Adicionar Fonema
                </button>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-3">Imagem (opcional)</label>
                <div {...getRootProps()} className="p-8 border-2 border-dashed border-gray-300 rounded-xl text-center cursor-pointer hover:border-indigo-400">
                  <input {...getInputProps()} />
                  {imageUrl ? (
                    <img src={imageUrl} alt="Preview" className="max-w-xs mx-auto rounded-lg" />
                  ) : (
                    <p className="text-gray-600">Clica para adicionar imagem</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* DICTATION */}
          {type === 'dictation' && (
            <div className="space-y-6">
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg">
                <div className="flex items-start gap-2">
                  <Info className="w-5 h-5 text-blue-700 mt-0.5" />
                  <p className="text-sm text-blue-800">
                    <strong>Ditado:</strong> O texto será convertido em áudio automaticamente. O aluno ouve e escreve o que ouviu.
                  </p>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-3">Texto para Ditado</label>
                <textarea
                  value={audioText}
                  onChange={e => setAudioText(e.target.value)}
                  required
                  rows="4"
                  className="w-full p-4 border-2 border-gray-300 rounded-xl focus:border-indigo-500"
                  placeholder="Ex: O gato subiu ao telhado"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-3">Resposta Esperada</label>
                <input
                  type="text"
                  value={expectedAnswer}
                  onChange={e => setExpectedAnswer(e.target.value)}
                  required
                  className="w-full p-4 border-2 border-gray-300 rounded-xl focus:border-indigo-500"
                  placeholder="Geralmente igual ao texto acima"
                />
                <button
                  type="button"
                  onClick={() => setExpectedAnswer(audioText)}
                  className="mt-2 text-sm text-indigo-600 hover:text-indigo-800"
                >
                  Copiar do texto acima
                </button>
              </div>

              <div>
                <button
                  type="button"
                  onClick={generateAudioPreview}
                  disabled={generatingPreview || !audioText.trim()}
                  className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 flex items-center gap-2"
                >
                  <Volume2 className="w-5 h-5" />
                  {generatingPreview ? 'A gerar...' : 'Preview de Áudio'}
                </button>
                {previewAudioUrl && (
                  <audio ref={audioPreviewRef} src={previewAudioUrl} controls className="mt-3 w-full" />
                )}
              </div>
            </div>
          )}

          {/* AUDIO QUESTION */}
          {type === 'audio_question' && (
            <div className="space-y-6">
              <div className="bg-purple-50 border-l-4 border-purple-500 p-4 rounded-lg">
                <div className="flex items-start gap-2">
                  <Info className="w-5 h-5 text-purple-700 mt-0.5" />
                  <p className="text-sm text-purple-800">
                    <strong>Pergunta em Áudio:</strong> Perfeito para tabuada, cálculos mentais, etc. O aluno ouve a pergunta e responde em voz alta.
                  </p>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-3">Pergunta (será convertida em áudio)</label>
                <textarea
                  value={audioText}
                  onChange={e => setAudioText(e.target.value)}
                  required
                  rows="3"
                  className="w-full p-4 border-2 border-gray-300 rounded-xl focus:border-indigo-500"
                  placeholder="Ex: Quanto é cinco vezes quatro?"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-3">Resposta Esperada</label>
                <input
                  type="text"
                  value={expectedAnswer}
                  onChange={e => setExpectedAnswer(e.target.value)}
                  required
                  className="w-full p-4 border-2 border-gray-300 rounded-xl focus:border-indigo-500"
                  placeholder="Ex: 20 ou vinte"
                />
              </div>

              <div>
                <button
                  type="button"
                  onClick={generateAudioPreview}
                  disabled={generatingPreview || !audioText.trim()}
                  className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 flex items-center gap-2"
                >
                  <Volume2 className="w-5 h-5" />
                  {generatingPreview ? 'A gerar...' : 'Preview de Áudio'}
                </button>
                {previewAudioUrl && (
                  <audio ref={audioPreviewRef} src={previewAudioUrl} controls className="mt-3 w-full" />
                )}
              </div>
            </div>
          )}

          {/* READING */}
          {type === 'reading' && (
            <div className="space-y-6">
              <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-lg">
                <div className="flex items-start gap-2">
                  <Info className="w-5 h-5 text-green-700 mt-0.5" />
                  <p className="text-sm text-green-800">
                    <strong>Leitura:</strong> O aluno vê o texto e lê em voz alta. Perfeito para trava-línguas, frases complexas, etc.
                  </p>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-3">Texto para Ler</label>
                <textarea
                  value={word}
                  onChange={e => setWord(e.target.value)}
                  required
                  rows="5"
                  className="w-full p-4 border-2 border-gray-300 rounded-xl focus:border-indigo-500 text-lg"
                  placeholder="Ex: O rato roeu a rolha da garrafa do rei da Rússia"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-3">Resposta Esperada</label>
                <input
                  type="text"
                  value={expectedAnswer}
                  onChange={e => setExpectedAnswer(e.target.value)}
                  required
                  className="w-full p-4 border-2 border-gray-300 rounded-xl focus:border-indigo-500"
                  placeholder="Geralmente igual ao texto acima"
                />
                <button
                  type="button"
                  onClick={() => setExpectedAnswer(word)}
                  className="mt-2 text-sm text-indigo-600 hover:text-indigo-800"
                >
                  Copiar do texto acima
                </button>
              </div>
            </div>
          )}

          {/* SPELLING */}
          {type === 'spelling' && (
            <div className="space-y-6">
              <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-lg">
                <div className="flex items-start gap-2">
                  <Info className="w-5 h-5 text-yellow-700 mt-0.5" />
                  <p className="text-sm text-yellow-800">
                    <strong>Soletrar:</strong> O aluno ouve a palavra e soletra-a. A resposta esperada deve ser a palavra soletrada com espaços.
                  </p>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-3">Palavra para soletrar (será convertida em áudio)</label>
                <input
                  type="text"
                  value={audioText}
                  onChange={e => setAudioText(e.target.value)}
                  required
                  className="w-full p-4 border-2 border-gray-300 rounded-xl focus:border-indigo-500"
                  placeholder="Ex: pato"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-3">Resposta Esperada (letras separadas por espaço)</label>
                <input
                  type="text"
                  value={expectedAnswer}
                  onChange={e => setExpectedAnswer(e.target.value)}
                  required
                  className="w-full p-4 border-2 border-gray-300 rounded-xl focus:border-indigo-500"
                  placeholder="Ex: p a t o"
                />
                <button
                  type="button"
                  onClick={() => setExpectedAnswer(audioText.split('').join(' '))}
                  className="mt-2 text-sm text-indigo-600 hover:text-indigo-800"
                >
                  Gerar a partir da palavra
                </button>
              </div>

              <div>
                <button
                  type="button"
                  onClick={generateAudioPreview}
                  disabled={generatingPreview || !audioText.trim()}
                  className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 flex items-center gap-2"
                >
                  <Volume2 className="w-5 h-5" />
                  {generatingPreview ? 'A gerar...' : 'Preview de Áudio'}
                </button>
                {previewAudioUrl && (
                  <audio ref={audioPreviewRef} src={previewAudioUrl} controls className="mt-3 w-full" />
                )}
              </div>
            </div>
          )}
        </div>

        {/* Dificuldade (apenas para tipos de áudio) */}
        {['dictation', 'audio_question', 'reading', 'spelling'].includes(type) && (
          <div className="bg-gray-50 p-6 rounded-xl">
            <label className="block font-semibold text-gray-700 mb-3">Nível de Dificuldade</label>
            <div className="flex gap-3">
              {[1, 2, 3, 4, 5].map(level => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setDifficultyLevel(level)}
                  className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                    difficultyLevel === level
                      ? 'bg-indigo-600 text-white shadow-lg scale-105'
                      : 'bg-white text-gray-700 hover:bg-indigo-50'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
            <p className="text-sm text-gray-600 mt-2">
              1 = Muito Fácil | 5 = Muito Difícil
            </p>
          </div>
        )}

        {/* Campos comuns: Dicas, Data e Assunto */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block font-semibold text-gray-700 mb-3">Dicas (opcional, uma por linha)</label>
            <textarea
              value={hints}
              onChange={e => setHints(e.target.value)}
              rows="4"
              className="w-full p-4 border-2 border-gray-300 rounded-xl focus:border-indigo-500"
              placeholder="Pense na organela responsável pela respiração celular..."
            />
          </div>
          
          <div>
            <label className="block font-semibold text-gray-700 mb-3">Data de Disponibilização *</label>
            <input
              type="date"
              value={scheduledDate}
              onChange={e => setScheduledDate(e.target.value)}
              required
              className="w-full p-4 border-2 border-gray-300 rounded-xl focus:border-indigo-500 text-lg"
            />
            <p className="text-sm text-gray-600 mt-2">
              Os alunos só verão este flashcard a partir desta data.
            </p>
          </div>
          
          <div>
            <label className="block font-semibold text-gray-700 mb-3">Assunto (opcional)</label>
            <input
              type="text"
              list="assuntos-list"
              value={assuntoName}
              onChange={e => setAssuntoName(e.target.value)}
              className="w-full p-4 border-2 border-gray-300 rounded-xl focus:border-indigo-500 text-lg"
              placeholder="Ex: Biologia Celular"
            />
            <datalist id="assuntos-list">
              {assuntosList.map(assunto => (
                <option key={assunto.id} value={assunto.name} />
              ))}
            </datalist>
            <p className="text-sm text-gray-600 mt-2">
              Podes escolher um assunto existente ou criar um novo.
            </p>
          </div>
        </div>

        {/* Botões */}
        <div className="flex justify-end gap-6 pt-6 border-t-2 border-gray-200">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-8 py-4 bg-gray-200 text-gray-800 font-semibold rounded-xl hover:bg-gray-300 transition shadow"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-10 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-xl text-lg"
          >
            {loading ? 'A criar...' : 'Criar Flashcard'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default FlashCardCreator;
