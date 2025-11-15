import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Layout from './components/Layout/Layout'; // Import the main Layout component
import ProfessorDashboard from './components/Professor/ProfessorDashboard';
import DossierPage from './components/Professor/DossierPage';
import CriterionPage from './components/Professor/CriterionPage';
import InstrumentPage from './components/Professor/InstrumentPage';
import InstrumentDetailsPage from './components/Professor/InstrumentDetailsPage';
import CounterPage from './components/Professor/CounterPage';
import StudentDashboard from './components/Student/StudentDashboard';
import DisciplineDossiersPage from './components/Student/DisciplineDossiersPage';
import StudentDisciplinesPage from './components/Student/StudentDisciplinesPage';
import DossierGradeDetailsPage from './components/Student/DossierGradeDetailsPage';
import StudentCountersPage from './components/Student/StudentCountersPage';
import DossierManagementPage from './components/Professor/DossierManagementPage';

import CriteriaManagementPage from './components/Professor/CriteriaManagementPage';

import InstrumentManagementPage from './components/Professor/InstrumentManagementPage';

import CounterManagementPage from './components/Professor/CounterManagementPage';

import GradesPage from './components/Professor/GradesPage';
import AllDossiersPage from './components/Professor/AllDossiersPage';
import AllCriteriaPage from './components/Professor/AllCriteriaPage';
import AllInstrumentsPage from './components/Professor/AllInstrumentsPage';
import DossierCountersPage from './components/Professor/DossierCountersPage';
import CounterResultsPage from './components/Professor/CounterResultsPage';
import CounterTypeResultsPage from './components/Professor/CounterTypeResultsPage';
import DossierGradesPage from './components/Professor/DossierGradesPage';
import MomentoAvaliacaoManagementPage from './components/Professor/MomentoAvaliacaoManagementPage';
import MomentoAvaliacaoNotasFinaisPage from './components/Professor/MomentoAvaliacaoNotasFinaisPage';
import StudentViewPage from './components/Professor/StudentViewPage';
import StudentGradesPage from './components/Professor/StudentGradesPage';
import useAuth from './hooks/useAuth'; // Import the useAuth hook

function App() {
  const { user, loading, logout } = useAuth();
  const [activeTab, setActiveTab] = useState(user?.tipo_utilizador === 'PROFESSOR' ? 'dashboard' : 'dashboard'); // Initialize activeTab

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p>A carregar...</p>
      </div>
    );
  }

  if (!user) {
    // If not authenticated, redirect to the main portal for login
    window.location.replace('http://localhost/');
    return null; // Or render a simple message
  }

  return (
    <Router basename="/feedback">
      <Routes>
        <Route path="/login" element={<Login />} /> {/* Login route, though user should be redirected by useAuth */}
        <Route
          path="/"
          element={
            <Layout
              onLogout={logout}
              currentUser={user}
              userType={user.tipo_utilizador}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
            />
          }
        >
          {user.tipo_utilizador === 'PROFESSOR' && (
            <>
              <Route index element={<ProfessorDashboard />} /> {/* Default route for professor */}
              <Route path="dashboard" element={<ProfessorDashboard />} />
              <Route path="dossiers" element={<DossierPage />} />
              <Route path="criteria" element={<CriterionPage />} />
              <Route path="instruments" element={<InstrumentPage />} />
              <Route path="details" element={<InstrumentDetailsPage />} />
              <Route path="counters" element={<CounterPage />} />
              <Route path="dossiers/all" element={<AllDossiersPage />} />
              <Route path="criteria/all" element={<AllCriteriaPage />} />
              <Route path="instruments/all" element={<AllInstrumentsPage />} />
              <Route path="dossiers/:professorDisciplinaTurmaId" element={<DossierManagementPage />} />
              <Route path="dossier/:dossieId/criteria" element={<CriteriaManagementPage />} />
              <Route path="criterio/:criterioId/instruments" element={<InstrumentManagementPage />} />
              <Route path="professor/instrument/:instrumentId/grades" element={<GradesPage />} />
              <Route path="professor/instrument/:instrumentId/details" element={<InstrumentDetailsPage />} />
              <Route path="dossier/:dossieId/counters" element={<CounterManagementPage />} />
              <Route path="dossier/:dossieId/contadores" element={<DossierCountersPage />} />
              <Route path="professor/counter/:counterId/results" element={<CounterResultsPage />} />
              <Route path="professor/dossier/:dossieId/type/:tipo/results" element={<CounterTypeResultsPage />} />
              <Route path="dossier/:dossieId/grades" element={<DossierGradesPage />} />
              <Route path="dossier/:dossieId/momentos-avaliacao" element={<MomentoAvaliacaoManagementPage />} />
              <Route path="professor/momento-avaliacao/:momentoId/notas-finais" element={<MomentoAvaliacaoNotasFinaisPage />} />
              <Route path="student-view" element={<StudentViewPage />} />
              <Route path="student-grades/:studentId" element={<StudentGradesPage />} />
            </>
          )}
          {user.tipo_utilizador === 'ALUNO' && (
            <>
              <Route index element={<StudentDashboard />} /> {/* Default route for student */}
              <Route path="dashboard" element={<StudentDashboard />} />
              <Route path="disciplines" element={<StudentDisciplinesPage />} />
              <Route path="discipline/:disciplineId" element={<DisciplineDossiersPage />} />
              <Route path="dossier/:dossierId/grades" element={<DossierGradeDetailsPage />} />
              <Route path="counters" element={<StudentCountersPage />} />
            </>
          )}
          <Route path="*" element={<Navigate to="/feedback/dashboard" replace />} /> {/* Redirect to dashboard if route not found */}
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
