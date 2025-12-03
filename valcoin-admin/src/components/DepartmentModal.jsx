import React, { useState, useEffect } from 'react';
import { XCircle, Trash, Plus, Edit, Eye, BookOpen } from 'lucide-react';
import { toast } from 'react-toastify';

const DepartmentModal = ({ showModal, closeModal, modalType, selectedItem, onSave, users = [] }) => {
  const [formData, setFormData] = useState({ nome: '', codigo: '', ativo: true, descricao: '', coordenador_id: null });
  const [error, setError] = useState('');

  useEffect(() => {
    if (showModal && selectedItem && modalType !== 'create') {
      setFormData({
        nome: selectedItem.nome,
        codigo: selectedItem.codigo,
        ativo: selectedItem.ativo,
        descricao: selectedItem.descricao || '',
        coordenador_id: selectedItem.coordenador_id || null,
      });
    } else {
      setFormData({ nome: '', codigo: '', ativo: true, descricao: '', coordenador_id: null });
    }
    setError('');
  }, [showModal, modalType, selectedItem]);

  if (!showModal) return null;

  const isViewMode = modalType === 'view';
  const isCreateMode = modalType === 'create';
  const isEditMode = modalType === 'edit';
  const isDeleteMode = modalType === 'delete';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isDeleteMode && (!formData.nome.trim() || !formData.codigo.trim())) {
      setError('O nome e o código do departamento são obrigatórios.');
      return;
    }

    try {
      await onSave(formData);
      closeModal();
    } catch (err) {
      console.error('Error saving department:', err);
      toast.error(err.response?.data?.error || 'Erro ao salvar departamento.');
    }
  };

  const renderContent = () => {
    if (isDeleteMode) {
      return (
        <div className="text-center">
          <h4 className="font-semibold text-lg mb-3">Desativar Departamento</h4>
          <p>Tem certeza que deseja desativar o departamento <strong>{selectedItem?.nome}</strong>?</p>
          <p className="text-sm text-red-600 mt-2">Esta ação não pode ser desfeita.</p>
        </div>
      );
    }

    if (isViewMode) {
      return (
        <div className="space-y-4">
          <div>
            <label className="font-semibold">Nome</label>
            <p>{selectedItem.nome}</p>
          </div>
          <div>
            <label className="font-semibold">Código</label>
            <p>{selectedItem.codigo}</p>
          </div>
          <div>
            <label className="font-semibold">Descrição</label>
            <p>{selectedItem.descricao || 'N/A'}</p>
          </div>
          <div>
            <label className="font-semibold">Coordenador</label>
            <p>{selectedItem.coordenador_nome || 'Nenhum'}</p>
          </div>
          <div>
            <label className="font-semibold">Status</label>
            <p>
              <span className={`px-2 py-1 rounded text-sm ${selectedItem.ativo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {selectedItem.ativo ? 'Ativo' : 'Inativo'}
              </span>
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div>
          <label htmlFor="nome" className="block text-sm font-medium text-gray-700">Nome do Departamento</label>
          <input
            id="nome"
            name="nome"
            type="text"
            value={formData.nome}
            onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
            className="mt-1 block w-full p-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            placeholder="Ex: Ciências e Tecnologia"
          />
        </div>
        <div>
          <label htmlFor="codigo" className="block text-sm font-medium text-gray-700">Código do Departamento</label>
          <input
            id="codigo"
            name="codigo"
            type="text"
            value={formData.codigo}
            onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
            className="mt-1 block w-full p-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            placeholder="Ex: CT"
          />
          {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
        </div>
        <div>
            <label htmlFor="descricao" className="block text-sm font-medium text-gray-700">Descrição</label>
            <textarea
                id="descricao"
                name="descricao"
                rows="3"
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                className="mt-1 block w-full p-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="Breve descrição do departamento"
            ></textarea>
        </div>
        <div>
            <label htmlFor="coordenador" className="block text-sm font-medium text-gray-700">Coordenador</label>
            <select
                id="coordenador"
                name="coordenador_id"
                value={formData.coordenador_id || ''}
                onChange={(e) => setFormData({ ...formData, coordenador_id: e.target.value ? e.target.value : null })}
                className="mt-1 block w-full p-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
                <option value="">Selecione um coordenador</option>
                {users
                    .filter(u => u.tipo_utilizador === 'ADMIN' || u.tipo_utilizador === 'PROFESSOR')
                    .map(user => (
                        <option key={user.id} value={user.id}>{user.nome}</option>
                ))}
            </select>
        </div>
        <div className="flex items-center">
          <input
            id="ativo"
            name="ativo"
            type="checkbox"
            checked={formData.ativo}
            onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <label htmlFor="ativo" className="ml-2 block text-sm text-gray-900">
            Ativo
          </label>
        </div>
      </div>
    );
  };

  const getTitle = () => {
    if (isViewMode) return 'Visualizar Departamento';
    if (isEditMode) return 'Editar Departamento';
    if (isDeleteMode) return 'Desativar Departamento';
    return 'Criar Novo Departamento';
  };

  const getIcon = () => {
    if (isViewMode) return <Eye className="w-5 h-5 mr-2" />;
    if (isEditMode) return <Edit className="w-5 h-5 mr-2" />;
    if (isDeleteMode) return <Trash className="w-5 h-5 mr-2" />;
    return <Plus className="w-5 h-5 mr-2" />;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full flex flex-col">
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="text-xl font-semibold flex items-center">
            {getIcon()}
            {getTitle()}
          </h3>
          <button onClick={closeModal} className="text-gray-500 hover:text-gray-700">
            <XCircle className="w-6 h-6" />
          </button>
        </div>
        <div className="p-6 flex-grow">
          <form id="department-form" onSubmit={handleSubmit}>
            {renderContent()}
          </form>
        </div>
        <div className="p-4 border-t flex justify-end space-x-3">
          <button
            type="button"
            onClick={closeModal}
            className="px-4 py-2 border rounded-md text-sm font-medium hover:bg-gray-50"
          >
            {isViewMode ? 'Fechar' : 'Cancelar'}
          </button>
          {!isViewMode && (
            <button
              type="submit"
              form="department-form"
              className={`px-4 py-2 text-white rounded-md text-sm font-medium ${
                isDeleteMode ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isCreateMode ? 'Criar' : isEditMode ? 'Salvar' : 'Desativar'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default DepartmentModal;
