import React, { useState } from 'react';
import axios from 'axios';
import { ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';

const Login = ({ onLogin }) => {
  const [numeroMecanografico, setNumeroMecanografico] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('/api/store/login', {
        numero_mecanografico: numeroMecanografico,
        password: password,
      });
      onLogin(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao fazer login');
    }
  };

  return (
    <div className="max-w-md mx-auto mt-12 bg-white p-8 rounded-xl shadow-lg">
      <h2 className="text-3xl font-bold text-center text-primary mb-6">Login da Loja</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-secondary">Número Mecanográfico</label>
          <input
            type="text"
            value={numeroMecanografico}
            onChange={(e) => setNumeroMecanografico(e.target.value)}
            required
            className="w-full p-3 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary transition"
            placeholder="Digite seu número"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-secondary">Senha</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full p-3 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary transition"
            placeholder="Digite sua senha"
          />
        </div>
        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
        <button
          type="submit"
          className="w-full bg-primary text-white p-3 rounded-md hover:bg-blue-700 transition flex items-center justify-center space-x-2"
        >
          <ArrowRightOnRectangleIcon className="h-5 w-5" />
          <span>Entrar</span>
        </button>
      </form>
    </div>
  );
};

export default Login;
