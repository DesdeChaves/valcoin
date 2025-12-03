import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { updateSubject } from '../services';

const DepartmentCell = ({ subject, departments, onUpdate }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [currentDepartmentId, setCurrentDepartmentId] = useState(subject.departamento_id);

  const handleChange = async (e) => {
    const newDepartmentId = e.target.value ? e.target.value : null;
    setIsLoading(true);

    try {
      const updatedData = {
        ...subject,
        departamento_id: newDepartmentId,
      };
      // The API expects the full object, so we remove the fields it doesn't need for the update
      delete updatedData.departamento_nome; 

      await updateSubject(subject.id, updatedData);
      
      setCurrentDepartmentId(newDepartmentId);
      toast.success(`Departamento de '${subject.nome}' atualizado com sucesso!`);
      onUpdate(); // Trigger a refresh in the parent component
    } catch (error) {
      console.error('Failed to update department for subject:', error);
      toast.error('Falha ao atualizar o departamento.');
      // Revert UI on failure
      e.target.value = currentDepartmentId;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative">
      <select
        value={currentDepartmentId || ''}
        onChange={handleChange}
        disabled={isLoading}
        className={`w-full p-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
          isLoading ? 'bg-gray-200 cursor-not-allowed' : 'bg-white'
        }`}
        onClick={(e) => e.stopPropagation()} // Prevent row click event when clicking the select
      >
        <option value="">Sem departamento</option>
        {departments.map((dep) => (
          <option key={dep.id} value={dep.id}>
            {dep.nome}
          </option>
        ))}
      </select>
    </div>
  );
};

export default DepartmentCell;
