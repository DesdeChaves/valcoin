import React, { useState, useEffect } from 'react';
import { getClasses, getTurmasByCiclo, updateTurmasForCiclo } from '../services'; // Adjust path as needed
import { X } from 'lucide-react';
import { toast } from 'react-toastify';

const AssociarTurmasModal = ({ ciclo, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [allClasses, setAllClasses] = useState([]);
  const [selectedTurmaIds, setSelectedTurmaIds] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [classesData, turmasByCicloData] = await Promise.all([
          getClasses(),
          getTurmasByCiclo(ciclo.id)
        ]);
        setAllClasses(classesData);
        setSelectedTurmaIds(turmasByCicloData);
      } catch (error) {
        console.error('Erro ao carregar dados para o modal de turmas:', error);
        toast.error('Erro ao carregar turmas.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [ciclo.id]);

  const handleCheckboxChange = (turmaId) => {
    setSelectedTurmaIds(prev =>
      prev.includes(turmaId)
        ? prev.filter(id => id !== turmaId)
        : [...prev, turmaId]
    );
  };

  const handleSave = async () => {
    try {
      await updateTurmasForCiclo(ciclo.id, selectedTurmaIds);
      toast.success('Turmas associadas com sucesso!');
      onClose(true); // Close and trigger reload
    } catch (error) {
      console.error('Erro ao associar turmas ao ciclo:', error);
      toast.error('Erro ao associar turmas.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Gerir Turmas para {ciclo.designacao}</h2>
          <button onClick={() => onClose(false)} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        {loading ? (
          <p>Carregando turmas...</p>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto border p-2 rounded">
            {allClasses.length === 0 ? (
              <p>Nenhuma turma disponível.</p>
            ) : (
              allClasses.map(turma => (
                <div key={turma.id} className="flex items-center">
                  <input
                    type="checkbox"
                    id={`turma-${turma.id}`}
                    checked={selectedTurmaIds.includes(turma.id)}
                    onChange={() => handleCheckboxChange(turma.id)}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor={`turma-${turma.id}`} className="ml-2 text-gray-700">
                    {turma.nome} ({turma.codigo})
                  </label>
                </div>
              ))
            )}
          </div>
        )}

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => onClose(false)} className="bg-gray-300 text-gray-800 px-4 py-2 rounded hover:bg-gray-400">
            Cancelar
          </button>
          <button onClick={handleSave} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
};

export default AssociarTurmasModal;