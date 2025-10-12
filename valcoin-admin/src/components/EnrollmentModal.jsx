// src/components/EnrollmentModal.jsx
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { createAlunoTurma, updateAlunoTurma } from '../services/api';

const EnrollmentModal = ({
  showModal,
  closeModal,
  modalType,
  selectedItem,
  users,
  classes,
  setAlunoTurma,
  onSave,
}) => {
  const [formData, setFormData] = useState({
    aluno_id: '',
    turma_id: '',
    ano_letivo: '2024/2025',
    ativo: true,
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    console.log('EnrollmentModal useEffect triggered:', {
      showModal,
      modalType,
      selectedItem,
      usersLength: users?.length,
      classesLength: classes?.length,
    });

    if (modalType === 'editAlunoTurma' && selectedItem) {
      setFormData({
        aluno_id: selectedItem.aluno_id || '',
        turma_id: selectedItem.turma_id || '',
        ano_letivo: selectedItem.ano_letivo || '2024/2025',
        ativo: selectedItem.ativo ?? true,
      });
    } else if (modalType === 'createAlunoTurma') {
      setFormData({
        aluno_id: '',
        turma_id: '',
        ano_letivo: '2024/2025',
        ativo: true,
      });
    }
    setErrors({});
  }, [modalType, selectedItem, showModal]);

  const validateForm = () => {
    const newErrors = {};
    if (!formData.aluno_id) newErrors.aluno_id = 'Selecione um aluno';
    if (!formData.turma_id) newErrors.turma_id = 'Selecione uma turma';
    if (!formData.ano_letivo || formData.ano_letivo.trim() === '') {
      newErrors.ano_letivo = 'Ano letivo é obrigatório';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('Form submission started with:', formData);

    if (!validateForm()) {
      console.log('Form validation failed:', errors);
      return;
    }

    setIsSubmitting(true);

    try {
      if (modalType === 'createAlunoTurma') {
        console.log('Creating new enrollment...');
        if (onSave) {
          await onSave(formData);
        } else {
          const response = await createAlunoTurma(formData);
          setAlunoTurma((prev) => [...prev, response]);
          toast.success('Matrícula criada com sucesso!');
        }
      } else if (modalType === 'editAlunoTurma' && selectedItem) {
        console.log('Updating enrollment with ID:', selectedItem.id);
        if (onSave) {
          await onSave(formData);
        } else {
          const response = await updateAlunoTurma(selectedItem.id, formData);
          setAlunoTurma((prev) =>
            prev.map((item) => (item.id === selectedItem.id ? response : item))
          );
          toast.success('Matrícula atualizada com sucesso!');
        }
      }
      closeModal();
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'Erro ao salvar matrícula';
      console.error('Enrollment save error:', {
        message: errorMsg,
        fullError: error,
        response: error.response?.data,
      });
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field, value) => {
    console.log(`Form field changed: ${field} = ${value}`);
    setFormData((prevData) => ({
      ...prevData,
      [field]: value,
    }));
    if (errors[field]) {
      setErrors((prevErrors) => ({
        ...prevErrors,
        [field]: undefined,
      }));
    }
  };

  if (!showModal) return null;

  const students = Array.isArray(users) ? users.filter((u) => u.tipo_utilizador === 'ALUNO') : [];
  const availableClasses = Array.isArray(classes) ? classes : [];

  console.log('Modal rendering with:', {
    studentsCount: students.length,
    classesCount: availableClasses.length,
    formData,
    errors,
  });

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-semibold mb-4">
          {modalType === 'createAlunoTurma' ? 'Nova Matrícula' : 'Editar Matrícula'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Aluno *
            </label>
            <select
              value={formData.aluno_id}
              onChange={(e) => handleInputChange('aluno_id', e.target.value)}
              className={`w-full border rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.aluno_id ? 'border-red-300' : 'border-gray-300'
              }`}
              disabled={isSubmitting}
            >
              <option value="">Selecione um aluno</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.nome} ({student.numero_mecanografico})
                </option>
              ))}
            </select>
            {errors.aluno_id && (
              <p className="text-red-500 text-xs mt-1">{errors.aluno_id}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Turma *
            </label>
            <select
              value={formData.turma_id}
              onChange={(e) => handleInputChange('turma_id', e.target.value)}
              className={`w-full border rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.turma_id ? 'border-red-300' : 'border-gray-300'
              }`}
              disabled={isSubmitting}
            >
              <option value="">Selecione uma turma</option>
              {availableClasses.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.nome} ({cls.codigo})
                </option>
              ))}
            </select>
            {errors.turma_id && (
              <p className="text-red-500 text-xs mt-1">{errors.turma_id}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ano Letivo *
            </label>
            <input
              type="text"
              value={formData.ano_letivo}
              onChange={(e) => handleInputChange('ano_letivo', e.target.value)}
              placeholder="2024/2025"
              className={`w-full border rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.ano_letivo ? 'border-red-300' : 'border-gray-300'
              }`}
              disabled={isSubmitting}
            />
            {errors.ano_letivo && (
              <p className="text-red-500 text-xs mt-1">{errors.ano_letivo}</p>
            )}
          </div>

          {modalType === 'editAlunoTurma' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estado
              </label>
              <select
                value={formData.ativo}
                onChange={(e) => handleInputChange('ativo', e.target.value === 'true')}
                className="w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={isSubmitting}
              >
                <option value={true}>Ativo</option>
                <option value={false}>Inativo</option>
              </select>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => {
                console.log('Modal cancelled');
                closeModal();
              }}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EnrollmentModal;
