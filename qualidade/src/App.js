// src/App.jsx
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Layout from './components/Layout/Layout';
import useAuth from './hooks/useAuth';

// PÁGINAS
import Dashboard from './pages/Dashboard';
import QuestionariosGestao from './pages/QuestionariosGestao';
import QuestionarioResponder from './pages/QuestionarioResponder'; // Responder via token
import QuestionarioResultados from './pages/QuestionarioResultados'; // Ver respostas
import QuestionarioEditor from './pages/QuestionarioEditor'; // Ver respostas
import AplicacoesGestao from './pages/AplicacoesGestao'; // Ver respostas
import AplicacaoEdit from './pages/AplicacaoEdit'; // Ver respostas
import AplicacaoCreate from './pages/AplicacaoCreate';
import Obrigado from './pages/Obrigado';

// Import Empresa Components
import EmpresasList from './pages/Empresas/EmpresasList';
import EmpresaForm from './pages/Empresas/EmpresaForm';
import EmpresaDetail from './pages/Empresas/EmpresaDetail';
import QualidadeEqavet from './pages/QualidadeEqavet';

import StudentDashboard from './pages/student/StudentDashboard';
import StudentAplicações from './pages/student/StudentAplicações';
import StudentQuestionarioResponder from './pages/student/StudentQuestionarioResponder';

function App() {
  const { user, loading, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');

  // This component will handle the private routes
  const PrivateRoutes = () => {
    useEffect(() => {
      if (!loading && !user) {
        return <Navigate to="/" replace />;
      }
    }, [user, loading]);

    if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <p className="text-xl text-gray-700">A carregar Gestão da Qualidade...</p>
        </div>
      );
    }

    if (!user) {
      return null;
    }

    return (
      <Layout currentUser={user} userType={user.tipo_utilizador} onLogout={logout} activeTab={activeTab} setActiveTab={setActiveTab}>
        <Outlet />
      </Layout>
    );
  };

  return (
    <Router basename="/qualidade">
      <Routes>
        {/* Public Routes */}
        <Route path="public/responder/:token" element={<QuestionarioResponder />} />
        <Route path="obrigado" element={<Obrigado />} />

        {/* Private Routes */}
        <Route element={<PrivateRoutes />}>
          {user?.tipo_utilizador === 'PROFESSOR' || user?.tipo_utilizador === 'ADMIN' ? (
            <>
              <Route index element={<Dashboard />} />
              <Route path="questionarios" element={<QuestionariosGestao />} />
              <Route path="questionarios/criar" element={<QuestionarioEditor />} />
              <Route path="questionarios/editar/:id" element={<QuestionarioEditor />} />
              <Route path="aplicacoes" element={<AplicacoesGestao />} />
              <Route path="aplicacoes/editar/:id" element={<AplicacaoEdit />} />
              <Route path="aplicacoes/criar" element={<AplicacaoCreate />} />
              <Route path="aplicacoes/resultados/:id" element={<QuestionarioResultados />} />

              {/* ROTAS PARA EMPRESAS */}
              <Route path="empresas" element={<EmpresasList />} />
              <Route path="empresas/create" element={<EmpresaForm />} />
              <Route path="empresas/edit/:id" element={<EmpresaForm />} />
              <Route path="empresas/:id" element={<EmpresaDetail />} />
              <Route path="eqavet" element={<QualidadeEqavet />} />
            </>
          ) : user?.tipo_utilizador === 'ALUNO' ? (
            <>
              <Route index element={<StudentDashboard />} />
              <Route path="aplicacoes" element={<StudentAplicações />} />
              <Route path="student/responder/:aplicacaoId" element={<StudentQuestionarioResponder />} />
            </>
          ) : (
            // Fallback for other roles or unauthenticated users if they somehow reach here
            <Route path="*" element={<Navigate to="/" replace />} />
          )}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
