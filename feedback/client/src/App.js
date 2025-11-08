import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import ProfessorLayout from './components/Professor/ProfessorLayout';
import ProfessorDashboard from './components/Professor/ProfessorDashboard';
import DossierPage from './components/Professor/DossierPage';
import CriterionPage from './components/Professor/CriterionPage';
import InstrumentPage from './components/Professor/InstrumentPage';
import InstrumentDetailsPage from './components/Professor/InstrumentDetailsPage';
import CounterPage from './components/Professor/CounterPage';
import StudentLayout from './components/Student/StudentLayout';
import StudentDashboard from './components/Student/StudentDashboard';
import DisciplineDossiersPage from './components/Student/DisciplineDossiersPage';
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

function App() {
  return (
    <Router basename="/feedback">
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/professor" element={<ProfessorLayout />}>
          <Route path="dashboard" element={<ProfessorDashboard />} />
          <Route path="dossiers" element={<DossierPage />} />
          <Route path="criteria" element={<CriterionPage />} />
          <Route path="instruments" element={<InstrumentPage />} />
          <Route path="counters" element={<CounterPage />} />
          <Route path="dossiers/all" element={<AllDossiersPage />} />
          <Route path="criteria/all" element={<AllCriteriaPage />} />
          <Route path="instruments/all" element={<AllInstrumentsPage />} />
          <Route path="dossiers/:professorDisciplinaTurmaId" element={<DossierManagementPage />} />

          <Route path="dossier/:dossieId/criteria" element={<CriteriaManagementPage />} />

          <Route path="criterio/:criterioId/instruments" element={<InstrumentManagementPage />} />

          <Route path="instrument/:instrumentId/grades" element={<GradesPage />} />
          <Route path="instrument/:instrumentId/details" element={<InstrumentDetailsPage />} />
          <Route path="dossier/:dossieId/counters" element={<CounterManagementPage />} />
          <Route path="dossier/:dossieId/contadores" element={<DossierCountersPage />} />
          <Route path="counter/:counterId/results" element={<CounterResultsPage />} />
          <Route path="dossier/:dossieId/type/:tipo/results" element={<CounterTypeResultsPage />} />
          <Route path="dossier/:dossieId/grades" element={<DossierGradesPage />} />
          <Route path="dossier/:dossieId/momentos-avaliacao" element={<MomentoAvaliacaoManagementPage />} />
          <Route path="momento-avaliacao/:momentoId/notas-finais" element={<MomentoAvaliacaoNotasFinaisPage />} />
          <Route path="student-view" element={<StudentViewPage />} />
          <Route path="student-grades/:studentId" element={<StudentGradesPage />} />

        </Route>
        <Route path="/student" element={<StudentLayout />}>
          <Route path="dashboard" element={<StudentDashboard />} />
          <Route path="discipline/:disciplineId" element={<DisciplineDossiersPage />} />
          <Route path="dossier/:dossierId/grades" element={<DossierGradeDetailsPage />} />
          <Route path="counters" element={<StudentCountersPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
