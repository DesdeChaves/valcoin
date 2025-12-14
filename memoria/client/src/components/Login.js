import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

function Login() {
  const [numero_mecanografico, setNumeroMecanografico] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/auth/login', {
        numero_mecanografico,
        password,
      });
      const { data } = response;
      localStorage.setItem('authToken', data.accessToken);
      localStorage.setItem('user', JSON.stringify(data.user));
      if (data.user.tipo_utilizador === 'PROFESSOR') {
        navigate('/professor/dashboard');
      } else if (data.user.tipo_utilizador === 'ALUNO') {
        navigate('/student/dashboard');
      } else {
        setError('Tipo de utilizador não suportado.');
      }
    } catch (err) {
      setError('Credenciais inválidas. Por favor, tente novamente.');
      console.error('Login error:', err);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold text-center mb-6">Login</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="numero_mecanografico">
              Número Mecanográfico
            </label>
            <input
              type="text"
              id="numero_mecanografico"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              value={numero_mecanografico}
              onChange={(e) => setNumeroMecanografico(e.target.value)}
              required
            />
          </div>
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">
              Password
            </label>
            <input
              type="password"
              id="password"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 mb-3 leading-tight focus:outline-none focus:shadow-outline"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className="text-red-500 text-xs italic mb-4">{error}</p>}
          <div className="flex items-center justify-between">
            <button
              type="submit"
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            >
              Entrar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Login;
