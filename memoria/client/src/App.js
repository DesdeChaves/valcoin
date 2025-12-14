// src/App.js

import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login.js'; // se quiseres login próprio, ou usar o global
import MemoriaLayout from './components/Layout/MemoriaLayout';
import MemoriaProfessorDashboard from './components/Professor/MemoriaProfessorDashboard';
import MemoriaStudentPage from './components/Student/MemoriaStudentPage';
import useAuth from './hooks/useAuth';

function App() {
  const { user, loading, logout } = useAuth();

  // Redirecionar para login externo se não autenticado
  // (assumindo que o token vem do sistema principal)
  useEffect(() => {
    if (!loading && !user) {
      // Redireciona para o login principal da escola
      window.location.href = 'http://localhost:3000/login'; // ajusta para o teu domínio
    }
  }, [user, loading]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-xl font-semibold text-indigo-800">A carregar Memória...</div>
      </div>
    );
  }

  if (!user) {
    return null; // será redirecionado pelo useEffect
  }

  return (
    <Router>
      <Routes>
        {/* Rota principal com layout */}
        <Route
          path="/"
          element={<MemoriaLayout user={user} onLogout={logout} />}
        >
          {/* Redireciona root para a página correta conforme o tipo */}
          <Route index element={<Navigate to={user.tipo_utilizador === 'ALUNO' ? '/practice' : '/dashboard'} replace />} />

          {/* Rotas Professor */}
          {user.tipo_utilizador === 'PROFESSOR' && (
            <>
              <Route path="dashboard" element={<MemoriaProfessorDashboard />} />
              <Route path="create" element={<MemoriaProfessorDashboard activeTab="create" />} />
              <Route path="manage" element={<MemoriaProfessorDashboard activeTab="manage" />} />
            </>
          )}

          {/* Rotas Aluno */}
          {user.tipo_utilizador === 'ALUNO' && (
            <>
              <Route path="practice" element={<MemoriaStudentPage />} />
              <Route path="stats" element={<div>Estatísticas em desenvolvimento</div>} />
            </>
          )}

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
