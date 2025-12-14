// src/components/Common/RatingButtons.js

import React from 'react';
import { XCircle, Frown, Meh, Smile } from 'lucide-react';

const RatingButtons = ({ onRate, disabled = false }) => {
  const ratings = [
    {
      value: 1,
      label: 'Again',
      color: 'from-red-500 to-rose-600',
      hover: 'hover:from-red-600 hover:to-rose-700',
      icon: XCircle,
      description: 'Esqueci completamente'
    },
    {
      value: 2,
      label: 'Hard',
      color: 'from-orange-500 to-amber-600',
      hover: 'hover:from-orange-600 hover:to-amber-700',
      icon: Frown,
      description: 'Difícil, lembro com esforço'
    },
    {
      value: 3,
      label: 'Good',
      color: 'from-green-500 to-emerald-600',
      hover: 'hover:from-green-600 hover:to-emerald-700',
      icon: Meh,
      description: 'Correto, mas com hesitação'
    },
    {
      value: 4,
      label: 'Easy',
      color: 'from-blue-500 to-indigo-600',
      hover: 'hover:from-blue-600 hover:to-indigo-700',
      icon: Smile,
      description: 'Fácil, lembro imediatamente'
    }
  ];

  return (
    <div className="mt-10">
      <p className="text-center text-lg font-medium text-gray-700 mb-8">
        Como foi a tua recordação?
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
        {ratings.map((rating) => {
          const Icon = rating.icon;

          return (
            <button
              key={rating.value}
              onClick={() => onRate(rating.value)}
              disabled={disabled}
              className={`
                relative group p-8 rounded-2xl shadow-xl transition-all transform hover:scale-110
                bg-gradient-to-br ${rating.color} ${rating.hover}
                text-white font-bold text-xl disabled:opacity-50 disabled:cursor-not-allowed
                focus:outline-none focus:ring-4 focus:ring-white focus:ring-opacity-50
              `}
            >
              {/* Ícone grande */}
              <Icon className="w-16 h-16 mx-auto mb-4" strokeWidth={2} />

              {/* Label principal */}
              <div className="text-2xl mb-2">{rating.label}</div>

              {/* Tooltip com descrição */}
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-4 px-4 py-2 bg-black text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                {rating.description}
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-8 border-transparent border-t-black"></div>
              </div>

              {/* Atalho de teclado (visual) */}
              <kbd className="absolute top-3 right-3 px-3 py-1 bg-white bg-opacity-20 rounded-lg text-sm font-medium">
                {rating.value}
              </kbd>
            </button>
          );
        })}
      </div>

      {/* Instruções de teclado */}
      <p className="text-center mt-10 text-gray-600 text-sm">
        💡 <strong>Dica:</strong> Usa os números <kbd className="mx-1 px-2 py-1 bg-gray-200 rounded">1</kbd>
        <kbd className="mx-1 px-2 py-1 bg-gray-200 rounded">2</kbd>
        <kbd className="mx-1 px-2 py-1 bg-gray-200 rounded">3</kbd>
        <kbd className="mx-1 px-2 py-1 bg-gray-200 rounded">4</kbd> para responder mais rápido!
      </p>
    </div>
  );
};

export default RatingButtons;
