// src/components/eqavet/Indicadores.jsx
import React from 'react';
import IndicadoresForm from './IndicadoresForm';

const Indicadores = ({ currentUser }) => {
  // TODO: Implement a way to select the cicloId
  const cicloId = 1; 

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Indicadores</h2>
      <IndicadoresForm cicloId={cicloId} currentUser={currentUser} />
    </div>
  );
};

export default Indicadores;
