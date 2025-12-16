import React from 'react';
import { useNavigate } from 'react-router-dom';

const MemoriaProfessorDashboard = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 py-12">
      <div className="max-w-7xl mx-auto px-6">
        <header className="mb-12 text-center">
          <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 mb-4">
            🧠 Bem-vindo ao Memória!
          </h1>
          <p className="text-xl text-gray-700">Cria e gere flashcards com repetição espaçada avançada</p>
        </header>

        <div className="flex justify-center mb-10">
          <div className="bg-white rounded-xl shadow-lg p-2 inline-flex gap-2">
            <button
              onClick={() => navigate('/create')}
              className="px-8 py-4 rounded-lg font-semibold transition bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md"
            >
              ➕ Criar Flashcard
            </button>
            <button
              onClick={() => navigate('/manage')}
              className="px-8 py-4 rounded-lg font-semibold transition text-gray-600 hover:bg-gray-100"
            >
              📋 Gerir Flashcards
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MemoriaProfessorDashboard;