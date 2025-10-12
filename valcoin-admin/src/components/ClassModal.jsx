// ClassModal.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { XCircle } from 'lucide-react';
import { toast } from 'react-toastify';

const ClassModal = ({ 
  showModal, 
  closeModal, 
  modalType, 
  selectedItem, 
  onSave, 
  onDelete, 
  users = [], 
  ciclos = [] 
}) => {
  const [formData, setFormData] = useState({
    codigo: '',
    nome: '',
    ciclo_id: '',
    ano_letivo: '',
    diretor_turma_id: '',
    ativo: true,
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Debug logging
  console.log('ClassModal render:', {
    showModal,
    modalType,
    selectedItem,
    usersCount: users?.length || 0,
    ciclosCount: ciclos?.length || 0,
  });

  const professors = useMemo(() => {
    console.log('ClassModal: Computing professors...');
    if (!Array.isArray(users)) {
      console.warn('ClassModal: users prop is not an array', users);
      return [];
    }

    const filteredProfessors = users.filter((user) => {
      if (!user) return false;
      const tipo = String(user.tipo_utilizador || '').toUpperCase().trim();
      return tipo === 'PROFESSOR';
    });

    console.log('ClassModal: Final filtered professors:', filteredProfessors);
    return filteredProfessors;
  }, [users]);

  useEffect(() => {
    if (!showModal) return;

    console.log('ClassModal: useEffect - setting form data');
    const currentYear = new Date().getFullYear();
    const defaultAnoLetivo = `${currentYear}/${currentYear + 1}`;

    const newFormData = {
      codigo: '',
      nome: '',
      ciclo_id: ciclos.length > 0 ? ciclos[0].id : '',
      ano_letivo: defaultAnoLetivo,
      diretor_turma_id: '',
      ativo: true,
    };

    if (selectedItem && modalType !== 'create') {
      newFormData.codigo = selectedItem.codigo || '';
      newFormData.nome = selectedItem.nome || '';
      newFormData.ciclo_id = selectedItem.ciclo_id || (ciclos.length > 0 ? ciclos[0].id : '');
      newFormData.ano_letivo = selectedItem.ano_letivo || defaultAnoLetivo;
      newFormData.diretor_turma_id = selectedItem.diretor_turma_id || '';
      newFormData.ativo = selectedItem.ativo !== undefined ? selectedItem.ativo : true;
    }

    setFormData(newFormData);
    setErrors({});
  }, [showModal, modalType, selectedItem, ciclos]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.codigo?.trim()) {
      newErrors.codigo = 'Código é obrigatório';
    } else if (!/^[A-Za-z0-9]+$/.test(formData.codigo)) {
      newErrors.codigo = 'Código deve conter apenas letras e números';
    }

    if (!formData.nome?.trim()) {
      newErrors.nome = 'Nome é obrigatório';
    }

    if (!formData.ciclo_id) {
      newErrors.ciclo_id = 'Ciclo é obrigatório';
    }

    if (!formData.ano_letivo?.trim()) {
      newErrors.ano_letivo = 'Ano letivo é obrigatório';
    } else if (!/^\d{4}\/\d{4}$/.test(formData.ano_letivo)) {
      newErrors.ano_letivo = 'Ano letivo deve estar no formato AAAA/AAAA';
    }

    if (formData.diretor_turma_id && !professors.find(p => p.id === formData.diretor_turma_id)) {
      newErrors.diretor_turma_id = 'Professor selecionado inválido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      await onSave(formData);
      toast.success(modalType === 'create' ? 'Turma criada com sucesso!' : 'Turma atualizada com sucesso!');
    } catch (error) {
      console.error('ClassModal: Save error:', error);
      toast.error('Erro ao salvar turma.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsSubmitting(true);
    try {
      await onDelete();
      toast.success('Turma excluída com sucesso!');
    } catch (error) {
      console.error('ClassModal: Delete error:', error);
      toast.error('Erro ao excluir turma.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!showModal) return null;

  if ((modalType === 'create' || modalType === 'edit') && ciclos.length === 0) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg max-w-md w-full p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-red-600">Erro</h3>
            <button onClick={closeModal} className="text-gray-500 hover:text-gray-700">
              <XCircle className="w-6 h-6" />
            </button>
          </div>
          <p className="text-gray-600 mb-4">
            Não há ciclos de ensino registados. É necessário ter pelo menos um ciclo para criar turmas.
          </p>
          <div className="flex justify-end space-x-3">
            <button
              onClick={closeModal}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">
              {modalType === 'view' && 'Visualizar'}
              {modalType === 'edit' && 'Editar'}
              {modalType === 'create' && 'Criar Nova'}
              {modalType === 'delete' && 'Confirmar Exclusão'} Turma
            </h3>
            <button onClick={closeModal} className="text-gray-500 hover:text-gray-700">
              <XCircle className="w-6 h-6" />
            </button>
          </div>

          {modalType === 'delete' ? (
            <div className="space-y-4">
              <p className="text-gray-600">
                Tem certeza que deseja excluir a turma "{selectedItem?.nome || ''}"? 
                Esta ação não pode ser desfeita.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={closeModal}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                  disabled={isSubmitting}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Excluindo...' : 'Excluir'}
                </button>
              </div>
            </div>
          ) : modalType === 'view' ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Código</label>
                  <p className="w-full p-2 border border-gray-300 rounded-lg bg-gray-100">
                    {formData.codigo}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                  <p className="w-full p-2 border border-gray-300 rounded-lg bg-gray-100">
                    {formData.nome}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ano Letivo</label>
                  <p className="w-full p-2 border border-gray-300 rounded-lg bg-gray-100">
                    {formData.ano_letivo}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ciclo</label>
                  <p className="w-full p-2 border border-gray-300 rounded-lg bg-gray-100">
                    {ciclos.find(c => c.id === formData.ciclo_id)?.nome || 'N/A'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Diretor de Turma</label>
                  <p className="w-full p-2 border border-gray-300 rounded-lg bg-gray-100">
                    {professors.find(p => p.id === formData.diretor_turma_id)?.nome || 'Nenhum'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                  <p className="w-full p-2 border border-gray-300 rounded-lg bg-gray-100">
                    {formData.ativo ? 'Ativo' : 'Inativo'}
                  </p>
                </div>
              </div>
              <div className="flex justify-end pt-4">
                <button
                  onClick={closeModal}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Fechar
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Código da Turma</label>
                  <input
                    type="text"
                    name="codigo"
                    className={`w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.codigo ? 'border-red-500' : ''
                    }`}
                    value={formData.codigo}
                    onChange={handleInputChange}
                    disabled={isSubmitting}
                    placeholder="Ex: 9A2024"
                  />
                  {errors.codigo && <p className="text-red-500 text-xs mt-1">{errors.codigo}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Turma</label>
                  <input
                    type="text"
                    name="nome"
                    className={`w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.nome ? 'border-red-500' : ''
                    }`}
                    value={formData.nome}
                    onChange={handleInputChange}
                    disabled={isSubmitting}
                    placeholder="Ex: Turma A, 9º1, etc."
                  />
                  {errors.nome && <p className="text-red-500 text-xs mt-1">{errors.nome}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ano Letivo</label>
                  <input
                    type="text"
                    name="ano_letivo"
                    className={`w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.ano_letivo ? 'border-red-500' : ''
                    }`}
                    value={formData.ano_letivo}
                    onChange={handleInputChange}
                    disabled={isSubmitting}
                    placeholder="Ex: 2024/2025"
                  />
                  {errors.ano_letivo && <p className="text-red-500 text-xs mt-1">{errors.ano_letivo}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ciclo</label>
                  <select
                    name="ciclo_id"
                    className={`w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.ciclo_id ? 'border-red-500' : ''
                    }`}
                    value={formData.ciclo_id}
                    onChange={handleInputChange}
                    disabled={isSubmitting}
                  >
                    <option value="">Selecione o ciclo</option>
                    {ciclos.map((ciclo) => (
                      <option key={ciclo.id} value={ciclo.id}>
                        {ciclo.nome}
                      </option>
                    ))}
                  </select>
                  {errors.ciclo_id && <p className="text-red-500 text-xs mt-1">{errors.ciclo_id}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Diretor de Turma</label>
                  <select
                    name="diretor_turma_id"
                    className={`w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.diretor_turma_id ? 'border-red-500' : ''
                    }`}
                    value={formData.diretor_turma_id}
                    onChange={handleInputChange}
                    disabled={isSubmitting}
                  >
                    <option value="">Nenhum</option>
                    {professors.map((professor) => (
                      <option key={professor.id} value={professor.id}>
                        {professor.nome}
                      </option>
                    ))}
                  </select>
                  {errors.diretor_turma_id && <p className="text-red-500 text-xs mt-1">{errors.diretor_turma_id}</p>}
                </div>
                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      name="ativo"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-2"
                      checked={formData.ativo}
                      onChange={handleInputChange}
                      disabled={isSubmitting}
                    />
                    <span className="text-sm font-medium text-gray-700">Turma ativa</span>
                  </label>
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                    disabled={isSubmitting}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Salvando...' : modalType === 'create' ? 'Criar' : 'Salvar'}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClassModal;
