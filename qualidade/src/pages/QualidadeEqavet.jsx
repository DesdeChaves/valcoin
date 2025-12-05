// src/pages/QualidadeEQAVET.jsx
import React, { useState } from 'react';
import EqavetDashboard from '../components/eqavet/EqavetDashboard';
import CiclosFormativos from '../components/eqavet/CiclosFormativos';
import MetasInstitucionais from '../components/eqavet/MetasInstitucionais';
import Indicadores from '../components/eqavet/Indicadores';
import TrackingDiplomados from '../components/eqavet/TrackingDiplomados';

const QualidadeEQAVET = () => {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">EQAVET – Garantia da Qualidade</h1>

      <div className="flex space-x-4 mb-6 border-b">
        {['dashboard', 'ciclos', 'metas', 'indicadores', 'tracking'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === tab
                ? 'border-b-4 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-blue-600'
            }`}
          >
            {tab === 'dashboard' && 'Dashboard EQAVET'}
            {tab === 'ciclos' && 'Ciclos Formativos'}
            {tab === 'metas' && 'Metas Institucionais'}
            {tab === 'indicadores' && 'Indicadores'}
            {tab === 'tracking' && 'Tracking Diplomados'}
          </button>
        ))}
      </div>

      {activeTab === 'dashboard' && <EqavetDashboard />}
      {activeTab === 'ciclos' && <CiclosFormativos />}
      {activeTab === 'metas' && <MetasInstitucionais />}
      {activeTab === 'indicadores' && <Indicadores />}
      {activeTab === 'tracking' && <TrackingDiplomados />}
    </div>
  );
};

export default QualidadeEQAVET;
