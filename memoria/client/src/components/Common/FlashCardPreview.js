// src/components/Common/FlashcardPreview.js

import React from 'react';
import { BookOpen, EyeOff, Image } from 'lucide-react';

const FlashcardPreview = ({ card, showAnswer = false, className = '' }) => {
  if (!card) return null;

  const { type, front, back, cloze_text, image_url, occlusion_data = [], hints = [] } = card;

  const renderTypeIcon = () => {
    switch (type) {
      case 'basic':
        return <BookOpen className="w-5 h-5" />;
      case 'cloze':
        return <EyeOff className="w-5 h-5" />;
      case 'image_occlusion':
        return <Image className="w-5 h-5" />;
      default:
        return null;
    }
  };

  const renderContent = () => {
    switch (type) {
      case 'basic':
        return (
          <div className="space-y-6">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-2">Frente</p>
              <div className="p-5 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl border border-indigo-200">
                <p className="text-lg text-indigo-900 whitespace-pre-wrap">{front || 'Sem conteúdo'}</p>
              </div>
            </div>
            {showAnswer && (
              <div>
                <p className="text-sm font-medium text-gray-600 mb-2">Verso</p>
                <div className="p-5 bg-gradient-to-br from-green-50 to-emerald-100 rounded-xl border border-green-200">
                  <p className="text-lg text-green-900 whitespace-pre-wrap">{back || 'Sem resposta'}</p>
                </div>
              </div>
            )}
          </div>
        );

      case 'cloze':
        // Substituir lacunas por ___ e mostrar resposta se showAnswer
        const displayedText = cloze_text?.replace(/{{c\d+::(.*?)}}/g, (match, answer) => {
          return showAnswer ? `<strong class="text-purple-800">${answer}</strong>` : '_____';
        });

        return (
          <div className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-200">
            <div
              className="text-xl leading-relaxed text-purple-900"
              dangerouslySetInnerHTML={{ __html: displayedText || 'Sem texto cloze' }}
            />
          </div>
        );

      case 'image_occlusion':
        const maskCount = occlusion_data.length;

        return (
          <div className="text-center space-y-4">
            {image_url ? (
              <div className="relative inline-block">
                <img
                  src={image_url}
                  alt="Imagem base"
                  className="max-w-full h-auto rounded-xl shadow-lg border-4 border-indigo-200"
                />
                {showAnswer &&
                  occlusion_data.map((mask, idx) => (
                    <div
                      key={idx}
                      className="absolute bg-black bg-opacity-70 border-4 border-red-500 rounded-lg flex items-center justify-center text-white font-bold text-lg"
                      style={{
                        left: `${mask.coords[0]}px`,
                        top: `${mask.coords[1]}px`,
                        width: `${mask.coords[2]}px`,
                        height: `${mask.coords[3]}px`
                      }}
                    >
                      {mask.label}
                    </div>
                  ))}
              </div>
            ) : (
              <div className="bg-gray-200 border-4 border-dashed border-gray-400 rounded-xl w-96 h-64 flex items-center justify-center">
                <p className="text-gray-600">Sem imagem</p>
              </div>
            )}
            <p className="text-lg font-medium text-indigo-800">
              {maskCount} região(ões) oculta(s)
            </p>
            {showAnswer && maskCount > 0 && (
              <div className="flex flex-wrap justify-center gap-3 mt-4">
                {occlusion_data.map((mask, idx) => (
                  <span
                    key={idx}
                    className="px-4 py-2 bg-red-100 text-red-800 rounded-full font-medium"
                  >
                    {mask.label}
                  </span>
                ))}
              </div>
            )}
          </div>
        );

      default:
        return <p className="text-gray-500">Tipo de flashcard desconhecido</p>;
    }
  };

  return (
    <div className={`bg-white rounded-2xl shadow-xl p-8 border border-gray-200 ${className}`}>
      {/* Header com tipo */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl text-white">
            {renderTypeIcon()}
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-800 capitalize">
              {type.replace('_', ' ')}
            </h3>
            <p className="text-sm text-gray-600">
              {hints.length > 0 && `${hints.length} dica(s)`}
            </p>
          </div>
        </div>
      </div>

      {/* Conteúdo principal */}
      <div className="mt-6">
        {renderContent()}
      </div>

      {/* Dicas (sempre visíveis no preview do professor) */}
      {hints.length > 0 && (
        <details className="mt-6">
          <summary className="cursor-pointer text-indigo-700 font-medium hover:text-indigo-800">
            Ver dicas ({hints.length})
          </summary>
          <ul className="mt-3 space-y-2 pl-6 list-disc text-gray-700">
            {hints.map((hint, idx) => (
              <li key={idx}>{hint}</li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
};

export default FlashcardPreview;
