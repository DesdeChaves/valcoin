// src/components/Professor/FlashCardCreator.js

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { api, audioApi } from '../../api';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { Mic, Volume2, Plus, Trash2, Info } from 'lucide-react';
import ConversionWheel from './ConversionWheel'; // Import the ConversionWheel component

/**
 * FlashCardCreator - VERSÃO FINAL COMPLETA
 * 
 * Inclui todas as correções de image occlusion (coordenadas naturais)
 * + Todos os tipos de flashcards funcionais
 */

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

  // Campos para flashcards de roda
  const [rodaPergunta, setRodaPergunta] = useState('');
  const [rodaResposta, setRodaResposta] = useState('');
  const [rodaRespostaOpcional, setRodaRespostaOpcional] = useState('');
  
  // Campos para flashcards de áudio
  const [word, setWord] = useState(''); // Para phonetic e reading
  const [phonemes, setPhonemes] = useState([{ text: '', order: 1 }]); // Para phonetic
  const [audioText, setAudioText] = useState(''); // Para dictation, audio_question, spelling
  const [expectedAnswer, setExpectedAnswer] = useState(''); // Para todos os tipos de áudio
  const [difficultyLevel, setDifficultyLevel] = useState(1);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [uploading, setUploading] = useState(false);
  const [previewAudioUrl, setPreviewAudioUrl] = useState('');
  const [generatingPreview, setGeneratingPreview] = useState(false);

  // CORREÇÃO IMAGE OCCLUSION: Dimensões naturais e renderizadas
  const [naturalDimensions, setNaturalDimensions] = useState({ width: 0, height: 0 });
  const [clientDimensions, setClientDimensions] = useState({ width: 0, height: 0 });

  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const containerRef = useRef(null);
  const audioPreviewRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentMask, setCurrentMask] = useState(null);

  const navigate = useNavigate();

  // ADICIONAR NO ESTADO (no topo do componente):
  const [activeTemplateTab, setActiveTemplateTab] = useState('single');

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
    { value: 'spelling', title: '🔤 Soletrar', desc: 'Ouvir e soletrar a palavra', category: 'Com Áudio' },
    { value: 'roda', title: '⚙️ Roda', desc: 'Fatores de conversão e cálculos', category: 'Cálculo' }
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

  /**
   * CORREÇÃO: Carregar imagem e capturar dimensões naturais
   */
  const loadImage = () => {
    const img = imageRef.current;
    const canvas = canvasRef.current;
    if (img && canvas) {
      const clientW = img.clientWidth;
      const clientH = img.clientHeight;
      const naturalW = img.naturalWidth;
      const naturalH = img.naturalHeight;
      
      console.log('Dimensões da imagem:', {
        renderizadas: { width: clientW, height: clientH },
        naturais: { width: naturalW, height: naturalH }
      });
      
      canvas.width = clientW;
      canvas.height = clientH;
      canvas.style.width = clientW + 'px';
      canvas.style.height = clientH + 'px';
      
      setClientDimensions({ width: clientW, height: clientH });
      setNaturalDimensions({ width: naturalW, height: naturalH });
      
      redrawCanvas();
    }
  };

  /**
   * Redesenhar canvas com máscaras
   */
  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || naturalDimensions.width === 0) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const scaleX = clientDimensions.width / naturalDimensions.width;
    const scaleY = clientDimensions.height / naturalDimensions.height;

    masks.forEach(mask => {
      const x = mask.x * scaleX;
      const y = mask.y * scaleY;
      const w = mask.width * scaleX;
      const h = mask.height * scaleY;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(x, y, w, h);

      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3;
      ctx.strokeRect(x, y, w, h);

      const barHeight = Math.min(30, h * 0.3);
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(x, y + h - barHeight, w, barHeight);
      
      ctx.font = '14px sans-serif';
      ctx.fillStyle = 'white';
      ctx.textAlign = 'center';
      ctx.fillText(mask.label, x + w / 2, y + h - barHeight / 2 + 5);
    });

    if (currentMask && currentMask.width > 0 && currentMask.height > 0) {
      const cx = currentMask.x * scaleX;
      const cy = currentMask.y * scaleY;
      const cw = currentMask.width * scaleX;
      const ch = currentMask.height * scaleY;
      
      ctx.strokeStyle = '#4f46e5';
      ctx.lineWidth = 4;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(cx, cy, cw, ch);
      ctx.setLineDash([]);
    }
  };
  
  const onDrop = useCallback(async (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setUploading(true);
    setError('');

    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await api.post('/upload-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setImageUrl(response.data.path);
      setMasks([]);
      setNaturalDimensions({ width: 0, height: 0 });
      setClientDimensions({ width: 0, height: 0 });
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
        headers: { 'Content-Type': 'multipart/form-data' }
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
      setError('Erro ao gerar preview de áudio.');
    } finally {
      setGeneratingPreview(false);
    }
  };

  useEffect(() => {
    if (imageUrl && naturalDimensions.width > 0) {
      redrawCanvas();
    }
  }, [masks, currentMask, imageUrl, naturalDimensions, clientDimensions]);

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
        if (naturalDimensions.width === 0 || naturalDimensions.height === 0) {
          setError('Dimensões da imagem não carregadas. Aguarda o carregamento completo.');
          setLoading(false);
          return;
        }

        payload.image_url = imageUrl;
        
        // CORREÇÃO: Usar dimensões naturais para converter para fracionais
        payload.occlusion_data = masks.map(m => {
          const fracX = m.x / naturalDimensions.width;
          const fracY = m.y / naturalDimensions.height;
          const fracW = m.width / naturalDimensions.width;
          const fracH = m.height / naturalDimensions.height;
          
          console.log('Máscara convertida:', {
            original: { x: m.x, y: m.y, w: m.width, h: m.height },
            fracionais: { x: fracX, y: fracY, w: fracW, h: fracH },
            dimensoesNaturais: naturalDimensions
          });
          
          return {
            mask_id: m.id,
            label: m.label,
            shape: 'rect',
            coords: [fracX, fracY, fracW, fracH]
          };
        });
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
      else if (type === 'roda') {
        if (!front.trim() || !rodaPergunta.trim() || !rodaResposta.trim()) {
          setError('Pergunta, configuração da roda de pergunta e configuração da roda de resposta são obrigatórios para o tipo Roda.');
          setLoading(false);
          return;
        }
        endpoint = '/flashcards/roda'; // Assuming a new endpoint for roda type
        payload = {
          discipline_id: disciplineId,
          front: front,
          roda_pergunta: rodaPergunta,
          roda_resposta: rodaResposta,
          roda_resposta_opcional: rodaRespostaOpcional, // Optional
          scheduled_date: scheduledDate,
          assunto_name: assuntoName
        };
      }

      await api.post(endpoint, payload);
      setSuccess('Flashcard criado com sucesso! 🧠');
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
    setNaturalDimensions({ width: 0, height: 0 });
    setClientDimensions({ width: 0, height: 0 });
    setActiveTemplateTab('single');
  };

  /**
   * CORREÇÃO: Eventos de desenho com coordenadas naturais
   */
  const startDrawing = (e) => {
    if (type !== 'image_occlusion' || !imageUrl || naturalDimensions.width === 0) {
      console.log('Desenho bloqueado:', { type, imageUrl, naturalDimensions });
      return;
    }
    
    const canvasX = e.nativeEvent.offsetX;
    const canvasY = e.nativeEvent.offsetY;
    
    console.log('Start drawing:', { canvasX, canvasY });
    
    const scaleX = naturalDimensions.width / clientDimensions.width;
    const scaleY = naturalDimensions.height / clientDimensions.height;
    
    const naturalX = canvasX * scaleX;
    const naturalY = canvasY * scaleY;
    
    console.log('Natural coords:', { naturalX, naturalY, scaleX, scaleY });
    
    setCurrentMask({ 
      id: Date.now(), 
      x: naturalX, 
      y: naturalY, 
      width: 0, 
      height: 0, 
      label: '' 
    });
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing || !currentMask) return;
    
    e.preventDefault();
    
    const canvasX = e.nativeEvent.offsetX;
    const canvasY = e.nativeEvent.offsetY;
    
    const scaleX = naturalDimensions.width / clientDimensions.width;
    const scaleY = naturalDimensions.height / clientDimensions.height;
    
    const naturalX = canvasX * scaleX;
    const naturalY = canvasY * scaleY;
    
    const width = naturalX - currentMask.x;
    const height = naturalY - currentMask.y;

    setCurrentMask(prev => ({
      ...prev,
      width,
      height
    }));
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    
    if (currentMask && Math.abs(currentMask.width) > 30 && Math.abs(currentMask.height) > 30) {
      const label = prompt('Nome da região (ex: "Coração", "Mitocôndria"):', 'Região');
      if (label && label.trim()) {
        // Normalizar coordenadas
        let x = currentMask.x;
        let y = currentMask.y;
        let w = currentMask.width;
        let h = currentMask.height;
        
        if (w < 0) {
          x = x + w;
          w = Math.abs(w);
        }
        if (h < 0) {
          y = y + h;
          h = Math.abs(h);
        }
        
        const newMask = {
          id: currentMask.id,
          x,
          y,
          width: w,
          height: h,
          label: label.trim()
        };
        
        setMasks(prev => [...prev, newMask]);
        console.log('Máscara adicionada:', newMask);
      }
    } else if (currentMask) {
      console.log('Máscara muito pequena:', currentMask);
      alert('A região deve ter pelo menos 30x30 pixels. Tenta desenhar uma área maior.');
    }
    
    setCurrentMask(null);
    setIsDrawing(false);
  };

  const removeMask = (id) => {
    setMasks(prev => prev.filter(m => m.id !== id));
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
                  <div 
                    ref={containerRef}
                    className="relative mx-auto rounded-lg shadow-md border-2 border-gray-300 overflow-hidden"
                    style={{ maxWidth: '100%', userSelect: 'none' }}
                  >
                    <img
                      ref={imageRef}
                      src={imageUrl}
                      alt="Imagem base"
                      onLoad={loadImage}
                      className="w-full h-auto block"
                      style={{ 
                        maxHeight: '600px', 
                        objectFit: 'contain',
                        pointerEvents: 'none'
                      }}
                      draggable={false}
                    />
                    
                    <canvas
                      ref={canvasRef}
                      className="absolute top-0 left-0 cursor-crosshair"
                      style={{ touchAction: 'none' }}
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                    />
                  </div>

                  {naturalDimensions.width > 0 && (
                    <div className="text-center text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                      📐 Dimensões da imagem: {naturalDimensions.width} × {naturalDimensions.height}px
                      {clientDimensions.width > 0 && (
                        <span className="ml-2">
                          | Renderizada: {clientDimensions.width} × {clientDimensions.height}px
                        </span>
                      )}
                    </div>
                  )}

                  <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      <strong>Como usar:</strong> Clica e arrasta sobre a imagem para criar uma região oculta. 
                      Arrasta pelo menos 30 pixels em cada direção.
                    </p>
                  </div>

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

          {/* RODA DE CONVERSÃO - VERSÃO MÚLTIPLAS RODAS */}
          {type === 'roda' && (
            <div className="space-y-6">
              <div className="bg-indigo-50 border-l-4 border-indigo-500 p-4 rounded-lg">
                <div className="flex items-start gap-2">
                  <Info className="w-5 h-5 text-indigo-700 mt-0.5" />
                  <div className="text-sm text-indigo-800">
                    <p className="font-semibold mb-2">⚙️ Roda de Conversão</p>
                    <p className="mb-2">Perfeito para ensinar fatores de conversão: massa molar, densidade, volume molar, etc.</p>
                    
                    <div className="mt-3 space-y-1">
                      <p><strong>Uma roda:</strong> <code className="bg-white px-1">cor|topo|unid|esq|unid|dir|unid</code></p>
                      <p><strong>Múltiplas rodas:</strong> <code className="bg-white px-1">roda1;roda2;roda3</code> (separar com <strong>;</strong>)</p>
                    </div>
                    
                    <p className="mt-2 text-xs">Cores: pink, blue, green, orange, purple, red, yellow, cyan</p>
                  </div>
                </div>
              </div>

              {/* Pergunta (texto livre) */}
              <div>
                <label className="block font-semibold text-gray-700 mb-3">Pergunta / Contexto</label>
                <textarea
                  value={front}
                  onChange={e => setFront(e.target.value)}
                  required
                  rows="3"
                  className="w-full p-4 border-2 border-gray-300 rounded-xl focus:border-indigo-500"
                  placeholder="Ex: Calcula a massa de água sabendo que ρ=1,04 g/dm³ e V=100 dm³"
                />
              </div>

              {/* Roda da Pergunta */}
              <div>
                <label className="block font-semibold text-gray-700 mb-3">
                  Configuração das Rodas (Pergunta) *
                </label>
                <textarea
                  value={rodaPergunta}
                  onChange={e => setRodaPergunta(e.target.value)}
                  required
                  rows="4"
                  className="w-full p-4 border-2 border-gray-300 rounded-xl focus:border-indigo-500 font-mono text-sm"
                  placeholder="Uma roda: pink|m|g|ρ|g/dm³|V|dm³|massa|volume&#10;Múltiplas: pink|m|g|ρ|g/dm³|100|dm³;blue|m|g|M|g/mol|n|mol"
                />
                
                {/* Contador de rodas */}
                {rodaPergunta && (
                  <div className="mt-2 flex items-center gap-2 text-sm">
                    <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded font-semibold">
                      {rodaPergunta.split(';').filter(r => r.trim()).length} roda{rodaPergunta.split(';').filter(r => r.trim()).length > 1 ? 's' : ''}
                    </span>
                    <span className="text-gray-600">
                      {rodaPergunta.split(';').filter(r => r.trim()).length > 1 ? 'Conversão em série ou comparação' : 'Roda única'}
                    </span>
                  </div>
                )}

                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-600 bg-gray-50 p-3 rounded">
                  <div><strong>Posição 1:</strong> Cor</div>
                  <div><strong>Posição 2:</strong> Topo (numerador)</div>
                  <div><strong>Posição 3:</strong> Unidade topo</div>
                  <div><strong>Posição 4:</strong> Esquerda (denominador 1)</div>
                  <div><strong>Posição 5:</strong> Unidade esquerda</div>
                  <div><strong>Posição 6:</strong> Direita (denominador 2)</div>
                  <div><strong>Posição 7:</strong> Unidade direita</div>
                  <div><strong>Posição 8:</strong> Label topo (opcional)</div>
                  <div><strong>Posição 9:</strong> Label direita (opcional)</div>
                </div>
              </div>

              {/* Preview da Roda Pergunta */}
              {rodaPergunta && (
                <div className="bg-gray-50 p-6 rounded-xl border-2 border-gray-200">
                  <h4 className="font-semibold text-gray-700 mb-4 text-center flex items-center justify-center gap-2">
                    <span>👁️</span>
                    Preview da Pergunta
                  </h4>
                  <ConversionWheel config={rodaPergunta} revealed={false} />
                </div>
              )}

              {/* Roda da Resposta */}
              <div>
                <label className="block font-semibold text-gray-700 mb-3">
                  Configuração das Rodas (Resposta) *
                </label>
                <textarea
                  value={rodaResposta}
                  onChange={e => setRodaResposta(e.target.value)}
                  required
                  rows="4"
                  className="w-full p-4 border-2 border-gray-300 rounded-xl focus:border-indigo-500 font-mono text-sm"
                  placeholder="Mesmo formato, mas com valores calculados&#10;Ex: pink|104|g|1.04|g/dm³|100|dm³;blue|104|g|18|g/mol|5.78|mol"
                />
                <p className="text-sm text-gray-600 mt-2">
                  💡 Deve ter o <strong>mesmo número de rodas</strong> que a pergunta, mas com os valores resolvidos
                </p>

                {/* Botão de cópia rápida */}
                <button
                  type="button"
                  onClick={() => setRodaResposta(rodaPergunta)}
                  className="mt-2 text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  📋 Copiar da pergunta (depois edita os valores)
                </button>
              </div>

              {/* Preview da Roda Resposta */}
              {rodaResposta && (
                <div className="bg-green-50 p-6 rounded-xl border-2 border-green-200">
                  <h4 className="font-semibold text-gray-700 mb-4 rext-center flex items-center justify-center gap-2">
                    <span>✅</span>
                    Preview da Resposta
                  </h4>
                  <ConversionWheel config={rodaResposta} revealed={true} />
                </div>
              )}

              {/* Resposta Opcional (texto explicativo) */}
              <div>
                <label className="block font-semibold text-gray-700 mb-3">
                  Explicação Adicional (opcional)
                </label>
                <textarea
                  value={rodaRespostaOpcional}
                  onChange={e => setRodaRespostaOpcional(e.target.value)}
                  rows="3"
                  className="w-full p-4 border-2 border-gray-300 rounded-xl focus:border-indigo-500"
                  placeholder="Ex: A densidade relaciona massa e volume: ρ = m/V = 104g/100dm³ = 1,04 g/dm³"
                />
              </div>

              {/* Templates Rápidos - EXPANDIDO */}
              <div className="bg-white border-2 border-indigo-200 p-5 rounded-xl">
                <h4 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
                  <span>⚡</span>
                  Templates Rápidos
                </h4>

                {/* Tabs para organizar templates */}
                <div className="mb-4 flex gap-2 border-b">
                  <button
                    type="button"
                    onClick={() => setActiveTemplateTab('single')}
                    className={`px-4 py-2 font-medium ${activeTemplateTab === 'single' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-600'}`}
                  >
                    Roda Única
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTemplateTab('series')}
                    className={`px-4 py-2 font-medium ${activeTemplateTab === 'series' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-600'}`}
                  >
                    Conversão em Série
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTemplateTab('comparison')}
                    className={`px-4 py-2 font-medium ${activeTemplateTab === 'comparison' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-600'}`}
                  >
                    Comparação
                  </button>
                </div>

                <div className="space-y-2">
                  {/* RODA ÚNICA */}
                  {activeTemplateTab === 'single' && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setRodaPergunta('pink|m|g|ρ|g/cm³|V|cm³|massa|volume');
                          setRodaResposta('pink|m|g|ρ|g/cm³|V|cm³|massa|volume');
                          setFront('Calcula usando a roda da densidade');
                        }}
                        className="w-full text-left px-4 py-3 bg-pink-50 hover:bg-pink-100 rounded-lg transition"
                      >
                        <div className="font-semibold text-pink-900">Densidade (ρ = m/V)</div>
                        <div className="text-xs text-pink-700 mt-1">pink|m|g|ρ|g/cm³|V|cm³</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setRodaPergunta('blue|m|g|M|g/mol|n|mol|massa|moles');
                          setRodaResposta('blue|m|g|M|g/mol|n|mol|massa|moles');
                          setFront('Calcula usando a roda da massa molar');
                        }}
                        className="w-full text-left px-4 py-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition"
                      >
                        <div className="font-semibold text-blue-900">Massa Molar (M = m/n)</div>
                        <div className="text-xs text-blue-700 mt-1">blue|m|g|M|g/mol|n|mol</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setRodaPergunta('green|V|dm³|Vm|dm³/mol|n|mol|volume|moles');
                          setRodaResposta('green|V|dm³|Vm|dm³/mol|n|mol|volume|moles');
                          setFront('Calcula usando a roda do volume molar');
                        }}
                        className="w-full text-left px-4 py-3 bg-green-50 hover:bg-green-100 rounded-lg transition"
                      >
                        <div className="font-semibold text-green-900">Volume Molar (Vm = V/n)</div>
                        <div className="text-xs text-green-700 mt-1">green|V|dm³|Vm|dm³/mol|n|mol</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setRodaPergunta('orange|n|mol|C|mol/dm³|V|dm³|moles|volume');
                          setRodaResposta('orange|n|mol|C|mol/dm³|V|dm³|moles|volume');
                          setFront('Calcula usando a roda da concentração');
                        }}
                        className="w-full text-left px-4 py-3 bg-orange-50 hover:bg-orange-100 rounded-lg transition"
                      >
                        <div className="font-semibold text-orange-900">Concentração (C = n/V)</div>
                        <div className="text-xs text-orange-700 mt-1">orange|n|mol|C|mol/dm³|V|dm³</div>
                      </button>
                    </>
                  )}

                  {/* CONVERSÃO EM SÉRIE */}
                  {activeTemplateTab === 'series' && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setRodaPergunta('blue|m|g|M|g/mol|n|mol|massa|moles;green|V|dm³|Vm|dm³/mol|n|mol|volume|moles');
                          setRodaResposta('blue|m|g|M|g/mol|n|mol|massa|moles;green|V|dm³|Vm|dm³/mol|n|mol|volume|moles');
                          setFront('Conversão massa → moles → volume');
                        }}
                        className="w-full text-left px-4 py-3 bg-gradient-to-r from-blue-50 to-green-50 hover:from-blue-100 hover:to-green-100 rounded-lg transition"
                      >
                        <div className="font-semibold text-gray-900">Massa → Moles → Volume</div>
                        <div className="text-xs text-gray-700 mt-1">2 rodas: Massa Molar + Volume Molar</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setRodaPergunta('pink|m|g|ρ|g/cm³|V|cm³|massa|volume;blue|m|g|M|g/mol|n|mol|massa|moles');
                          setRodaResposta('pink|m|g|ρ|g/cm³|V|cm³|massa|volume;blue|m|g|M|g/mol|n|mol|massa|moles');
                          setFront('Conversão densidade → massa → moles');
                        }}
                        className="w-full text-left px-4 py-3 bg-gradient-to-r from-pink-50 to-blue-50 hover:from-pink-100 hover:to-blue-100 rounded-lg transition"
                      >
                        <div className="font-semibold text-gray-900">Densidade → Massa → Moles</div>
                        <div className="text-xs text-gray-700 mt-1">2 rodas: Densidade + Massa Molar</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setRodaPergunta('green|V|dm³|Vm|dm³/mol|n|mol|volume|moles;orange|n|mol|C|mol/dm³|Vsol|dm³|moles|solução');
                          setRodaResposta('green|V|dm³|Vm|dm³/mol|n|mol|volume|moles;orange|n|mol|C|mol/dm³|Vsol|dm³|moles|solução');
                          setFront('Conversão volume gás → moles → concentração');
                        }}
                        className="w-full text-left px-4 py-3 bg-gradient-to-r from-green-50 to-orange-50 hover:from-green-100 hover:to-orange-100 rounded-lg transition"
                      >
                        <div className="font-semibold text-gray-900">Volume → Moles → Concentração</div>
                        <div className="text-xs text-gray-700 mt-1">2 rodas: Volume Molar + Concentração</div>
                      </button>
                    </>
                  )}

                  {/* COMPARAÇÃO */}
                  {activeTemplateTab === 'comparison' && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setRodaPergunta('blue|m1|g|ρ1|g/cm³|V|cm³|substância 1|volume;pink|m2|g|ρ2|g/cm³|V|cm³|substância 2|volume');
                          setRodaResposta('blue|m1|g|ρ1|g/cm³|V|cm³|substância 1|volume;pink|m2|g|ρ2|g/cm³|V|cm³|substância 2|volume');
                          setFront('Compara as densidades de duas substâncias');
                        }}
                        className="w-full text-left px-4 py-3 bg-gradient-to-r from-blue-50 to-pink-50 hover:from-blue-100 hover:to-pink-100 rounded-lg transition"
                      >
                        <div className="font-semibold text-gray-900">Comparação de Densidades</div>
                        <div className="text-xs text-gray-700 mt-1">2 rodas lado a lado (mesma densidade, massas diferentes)</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setRodaPergunta('orange|n1|mol|C1|mol/dm³|V|dm³|solução A|volume;purple|n2|mol|C2|mol/dm³|V|dm³|solução B|volume');
                          setRodaResposta('orange|n1|mol|C1|mol/dm³|V|dm³|solução A|volume;purple|n2|mol|C2|mol/dm³|V|dm³|solução B|volume');
                          setFront('Compara as concentrações de duas soluções');
                        }}
                        className="w-full text-left px-4 py-3 bg-gradient-to-r from-orange-50 to-purple-50 hover:from-orange-100 hover:to-purple-100 rounded-lg transition"
                      >
                        <div className="font-semibold text-gray-900">Comparação de Concentrações</div>
                        <div className="text-xs text-gray-700 mt-1">2 rodas lado a lado (mesmo volume, concentrações diferentes)</div>
                      </button>
                    </>
                  )}
                </div>
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
