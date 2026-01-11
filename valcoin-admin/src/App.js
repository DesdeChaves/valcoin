import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import AuroraAdmin from './components/AuroraAdmin';
import Login from './components/Login';
import ProfessorDashboard from './components/professor/ProfessorDashboard';
import StudentDashboard from './components/student/StudentDashboard';
import { ValKidsDashboard } from './components/valkids';

const App = () => {
  const [token, setToken] = useState(localStorage.getItem('authToken'));
  const [user, setUser] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, [token]);

  const handleLogin = (newToken, newUser) => {
    localStorage.setItem('authToken', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
    toast.success('Login realizado com sucesso!');
  };

  const handleLogout = () => {
    console.log('Executing handleLogout...'); // Add this line
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    toast.info('Sessão encerrada');
    window.location.replace(window.location.origin);
  };

  if (!token || !user) {
    return <Login onLogin={handleLogin} />;
  }

  switch (user.tipo_utilizador) {
    case 'ADMIN':
      return <AuroraAdmin onLogout={handleLogout} currentUser={user} />;
    case 'PROFESSOR':
      return <ProfessorDashboard onLogout={handleLogout} currentUser={user} />;
    case 'ALUNO':
      if (user.ano_escolar && user.ano_escolar <= 2) {
        return <ValKidsDashboard onLogout={handleLogout} currentUser={user} />;
      }
      return <StudentDashboard onLogout={handleLogout} currentUser={user} />;
    default:
      return <Login onLogin={handleLogin} />;
  }
};

export default App;
