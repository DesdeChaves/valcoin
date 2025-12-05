// src/components/eqavet/AssociarTurmasModal.jsx
import React, { useState, useEffect } from 'react';
import { getClasses, getTurmasByCiclo, updateTurmasForCiclo } from '../../services/api';

const AssociarTurmasModal = ({ ciclo, onClose }) => {
  const [allTurmas, setAllTurmas] = useState([]);
  const [associatedTurmas, setAssociatedTurmas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [turmasData, associatedData] = await Promise.all([
          getClasses(),
          getTurmasByCiclo(ciclo.id)
        ]);
        setAllTurmas(turmasData);
        setAssociatedTurmas(associatedData);
      } catch (err) {
        console.error(err);
        alert('Erro ao carregar dados das turmas');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [ciclo.id]);

  const handleCheckboxChange = (turmaId) => {
    setAssociatedTurmas(prev =>
      prev.includes(turmaId)
        ? prev.filter(id => id !== turmaId)
        : [...prev, turmaId]
    );
  };

  const handleSave = async () => {
    try {
      await updateTurmasForCiclo(ciclo.id, associatedTurmas);
      onClose(true); // Pass true to indicate that the list should be reloaded
    } catch (err) {
      console.error(err);
      alert('Erro ao guardar as associações');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg">
        <h2 className="text-2xl font-bold mb-4">Associar Turmas a "{ciclo.designacao}"</h2>
        {loading ? (
          <p>A carregar turmas...</p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {allTurmas.map(turma => (
              <div key={turma.id} className="flex items-center">
                <input
                  type="checkbox"
                  id={`turma-${turma.id}`}
                  checked={associatedTurmas.includes(turma.id)}
                  onChange={() => handleCheckboxChange(turma.id)}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                />
                <label htmlFor={`turma-${turma.id}`} className="ml-2 text-gray-700">
                  {turma.nome} ({turma.ano_letivo})
                </label>
              </div>
            ))}
          </div>
        )}
        <div className="mt-6 flex justify-end gap-4">
          <button onClick={() => onClose(false)} className="bg-gray-500 text-white px-6 py-2 rounded hover:bg-gray-600">
            Cancelar
          </button>
          <button onClick={handleSave} className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700" disabled={loading}>
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
};

export default AssociarTurmasModal;
