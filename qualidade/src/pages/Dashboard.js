// src/pages/Dashboard.jsx
import React from 'react';
import useAuth from '../hooks/useAuth';

const Dashboard = () => {
  const { user } = useAuth();

  return (
    <div className="container mx-auto p-6">
      <div className="text-center py-16 bg-white rounded-xl shadow-md">
        <h1 className="text-4xl font-bold text-gray-800">
          Bem-vindo, {user?.nome || 'utilizador'}!
        </h1>
        <p className="text-xl text-gray-600 mt-4">
          Selecione uma opção no menu lateral para começar.
        </p>
      </div>
    </div>
  );
};

export default Dashboard;
