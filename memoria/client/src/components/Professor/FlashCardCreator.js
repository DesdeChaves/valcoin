// src/components/Professor/FlashCardCreator.js

import React, { useState, useRef, useEffect } from 'react';
import api from '../../api';
import { useNavigate } from 'react-router-dom';

const FlashCardCreator = ({ disciplineId, onSuccess }) => {
  const [type, setType] = useState('basic');
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [clozeText, setClozeText] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [masks, setMasks] = useState([]); // [{ id, label, x, y, width, height }]
  const [hints, setHints] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentMask, setCurrentMask] = useState(null);

  const navigate = useNavigate();

  // Redesenhar canvas sempre que masks ou currentMask mudam
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !imageUrl) return;

    // Limpar canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Desenhar máscaras existentes
    masks.forEach(mask => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(mask.x, mask.y, mask.width, mask.height);

      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3;
      ctx.strokeRect(mask.x, mask.y, mask.width, mask.height);

      // Label
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(mask.x, mask.y + mask.height - 30, mask.width, 30);
      ctx.font = '14px sans-serif';
      ctx.fillStyle = 'white';
      ctx.textAlign = 'center';
      ctx.fillText(mask.label, mask.x + mask.width / 2, mask.y + mask.height - 10);
    });

    // Desenhar máscara em criação
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

    let payload = {
      discipline_id: disciplineId,
      type,
      hints: hints.split('\n').filter(h => h.trim()),
      scheduled_date: scheduledDate
    };

    if (type === 'basic') {
      payload.front = front;
      payload.back = back;
    } else if (type === 'cloze') {
      payload.cloze_text = clozeText;
    } else if (type === 'image_occlusion') {
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

    try {
      await api.post('/flashcards', payload);
      setSuccess('Flashcard criado com sucesso! 🧠');
      // Reset form
      setFront(''); setBack(''); setClozeText(''); setImageUrl(''); setMasks([]); setHints(''); 
      setScheduledDate('');
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao criar flashcard');
    } finally {
      setLoading(false);
    }
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
    <div className="max-w-5xl mx-auto p-8 bg-gradient-to-br from-indigo-50 to-white rounded-2xl shadow-xl">
      <h2 className="text-4xl font-bold text-indigo-900 mb-8 text-center">Criar Novo Flashcard</h2>

      {error && <div className="mb-6 p-5 bg-red-100 border border-red-400 text-red-800 rounded-lg">{error}</div>}
      {success && <div className="mb-6 p-5 bg-green-100 border border-green-400 text-green-800 rounded-lg">{success}</div>}

      <form onSubmit={handleSubmit} className="space-y-8">

        {/* Seleção do Tipo */}
        <div>
          <label className="block text-xl font-semibold text-gray-800 mb-4">Tipo de Flashcard</label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { value: 'basic', title: 'Básico', desc: 'Pergunta e resposta clássica' },
              { value: 'cloze', title: 'Cloze (Lacunas)', desc: 'Texto com partes ocultas' },
              { value: 'image_occlusion', title: 'Ocultação de Imagem', desc: 'Regiões ocultas numa imagem' }
            ].map(t => (
              <button
                key={t.value}
                type="button"
                onClick={() => {
                  setType(t.value);
                  setMasks([]); // limpar máscaras ao mudar tipo
                }}
                className={`p-6 rounded-xl border-4 transition-all text-left ${
                  type === t.value 
                    ? 'border-indigo-600 bg-indigo-100 shadow-lg scale-105' 
                    : 'border-gray-300 bg-white hover:border-indigo-400 hover:shadow-md'
                }`}
              >
                <div className="font-bold text-lg text-indigo-900">{t.title}</div>
                <div className="text-gray-600 mt-2">{t.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Conteúdo específico */}
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

        {type === 'cloze' && (
          <div>
            <label className="block font-semibold text-gray-700 mb-3">
              {`Texto com Lacunas — use {{c1::resposta}} {{c2::outra}}`}
            </label>
            <textarea
              value={clozeText}
              onChange={e => setClozeText(e.target.value)}
              required
              rows="10"
              className="w-full p-5 border-2 border-gray-300 rounded-xl font-mono text-base focus:border-indigo-500 focus:ring-4 focus:ring-indigo-200"
              placeholder="A {{c1::mitocôndria}} é conhecida como a {{c2::central de energia}} da célula {{c3::eucariótica}}."
            />
            <p className="text-sm text-indigo-600 mt-3 bg-indigo-50 p-4 rounded-lg">
              {`💡 Cada {{c1::...}} cria uma revisão independente. Pode ter quantas quiseres!`}
            </p>
          </div>
        )}

        {type === 'image_occlusion' && (
          <div className="space-y-6">
            <div>
              <label className="block font-semibold text-gray-700 mb-3">URL da Imagem</label>
              <input
                type="url"
                value={imageUrl}
                onChange={e => {
                  setImageUrl(e.target.value);
                  setMasks([]);
                }}
                required
                className="w-full p-4 border-2 border-gray-300 rounded-xl focus:border-indigo-500"
                placeholder="https://exemplo.com/anatomia-coracao.jpg"
              />
            </div>

            {imageUrl && (
              <>
                <div className="relative inline-block border-4 border-indigo-200 rounded-2xl overflow-hidden shadow-2xl">
                  <img
                    ref={imageRef}
                    src={imageUrl}
                    alt="Imagem base"
                    onLoad={loadImage}
                    onError={() => alert('Erro ao carregar imagem')}
                    className="max-w-full h-auto block"
                    crossOrigin="anonymous"
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
                          <span className="font-medium">{mask.label || 'Sem nome'}</span>
                          <button
                            onClick={() => removeMask(mask.id)}
                            className="text-red-600 hover:text-red-800 font-bold"
                          >
                            ✕
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

        {/* Dicas e Data */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <label className="block font-semibold text-gray-700 mb-3">Dicas (opcional, uma por linha)</label>
            <textarea
              value={hints}
              onChange={e => setHints(e.target.value)}
              rows="5"
              className="w-full p-4 border-2 border-gray-300 rounded-xl focus:border-indigo-500"
              placeholder="Pense na organela responsável pela respiração celular..."
            />
          </div>
          <div>
            <label className="block font-semibold text-gray-700 mb-3">Data de Disponibilização</label>
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
        </div>

        {/* Botões */}
        <div className="flex justify-end gap-6 pt-6">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-8 py-4 bg-gray-200 text-gray-800 font-semibold rounded-xl hover:bg-gray-300 transition shadow"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading || (type === 'image_occlusion' && masks.length === 0)}
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
