// src/App.js

import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Login from './components/Login.js';
import MemoriaLayout from './components/Layout/MemoriaLayout';
import MemoriaProfessorDashboard from './components/Professor/MemoriaProfessorDashboard';
import MemoriaStudentPage from './components/Student/MemoriaStudentPage';
import DisciplineManagement from './components/Student/DisciplineManagement'; // New Import

import useAuth from './hooks/useAuth';
import CreateFlashcardPage from './components/Professor/CreateFlashcardPage';
import ManageFlashcardsPage from './components/Professor/ManageFlashcardsPage';
import ProfessorAnalyticsDashboard from './components/Professor/ProfessorAnalyticsDashboard'; // New Import

function App() {
  const { user, loading, logout } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      window.location.href = '/';
    }
  }, [user, loading]);

  console.log("App.js - user.tipo_utilizador:", user?.tipo_utilizador); // Added for debugging

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-xl font-semibold text-indigo-800">A carregar Memória...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <Router basename="/memoria">
      <Routes>
        <Route
          path="/*"
          element={
            <MemoriaLayout user={user} onLogout={logout}>
              <Outlet />
            </MemoriaLayout>
          }
        >
          {/* Redireciona root para a página correta */}
          <Route 
            index 
            element={
              <Navigate 
                to={user.tipo_utilizador === 'ALUNO' ? '/practice' : '/dashboard'} 
                replace 
              />
            } 
          />

          {/* Rotas Professor */}
          {user.tipo_utilizador === 'PROFESSOR' && (
            <>
                <Route path="dashboard" element={<MemoriaProfessorDashboard />} />
                <Route path="analytics" element={<ProfessorAnalyticsDashboard />} /> {/* New Route */}
                <Route path="create" element={<CreateFlashcardPage />} />
                <Route path="manage" element={<ManageFlashcardsPage />} />
            </>
          )}

          {/* Rotas Aluno */}
          {(user.tipo_utilizador === 'ALUNO' || user.tipo_utilizador === 'EXTERNO') && ( // Added EXTERNO
            <>
              <Route path="practice" element={<MemoriaStudentPage />} />
              <Route path="stats" element={<div>Estatísticas em desenvolvimento</div>} />
              {user.tipo_utilizador === 'EXTERNO' && (
                <Route path="disciplines" element={<DisciplineManagement currentUser={user} />} /> // New route
              )}
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