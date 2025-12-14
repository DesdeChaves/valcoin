// src/pages/Obrigado.js
import React from 'react';
import { useLocation, Link } from 'react-router-dom';

const Obrigado = () => {
  const location = useLocation();
  const { state } = location;

  const mensagem = state?.mensagem || 'A sua resposta foi submetida com sucesso!';
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-lg p-8">
        <div className="bg-white rounded-2xl shadow-xl p-10">
          <svg className="w-20 h-20 text-green-500 mx-auto mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Obrigado!</h1>
          <p className="text-lg text-gray-700 mb-8">
            {mensagem}
          </p>
          <Link
            to="/"
            className="inline-block bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-medium hover:bg-blue-700"
          >
            Voltar à Página Principal
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Obrigado;
