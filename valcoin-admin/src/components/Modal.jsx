import React, { useState } from 'react';
import { XCircle } from 'lucide-react';

const Modal = ({ showModal, closeModal, modalType, selectedItem, activeTab, setClasses }) => {
  // Move useState to the top level, unconditionally
  const [formData, setFormData] = useState({
    id: selectedItem?.id || '',
    codigo: selectedItem?.codigo || '',
    nome: selectedItem?.nome || '',
    ano_letivo: selectedItem?.ano_letivo || '',
    ciclo: selectedItem?.ciclo || '',
    diretor_turma: selectedItem?.diretor_turma || '',
    numero_alunos: selectedItem?.numero_alunos || '',
    ativo: selectedItem?.ativo || true,
  });

  // Early return after hooks
  if (!showModal) return null;

  const isViewMode = modalType === 'view';
  const isEditMode = modalType === 'edit';
  const isCreateMode = modalType === 'create';
  const isDeleteMode = modalType === 'delete';

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleSubmit = () => {
    if (isCreateMode) {
      // Create new class
      setClasses((prevClasses) => [
        ...prevClasses,
        {
          ...formData,
          id: String(prevClasses.length + 1), // Simple ID generation
          numero_alunos: parseInt(formData.numero_alunos, 10),
          ativo: formData.ativo,
        },
      ]);
    } else if (isEditMode) {
      // Update existing class
      setClasses((prevClasses) =>
        prevClasses.map((cls) =>
          cls.id === selectedItem.id
            ? {
                ...formData,
                numero_alunos: parseInt(formData.numero_alunos, 10),
                ativo: formData.ativo,
              }
            : cls
        )
      );
    }
    closeModal();
  };

  const handleDelete = () => {
    // Delete class
    setClasses((prevClasses) => prevClasses.filter((cls) => cls.id !== selectedItem.id));
    closeModal();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">
              {isViewMode && 'Visualizar'}
              {isEditMode && 'Editar'}
              {isCreateMode && 'Criar Nova'}
              {isDeleteMode && 'Confirmar Exclusão'} Turma
            </h3>
            <button onClick={closeModal} className="text-gray-500 hover:text-gray-700">
              <XCircle className="w-6 h-6" />
            </button>
          </div>
          {isDeleteMode ? (
            <div className="space-y-4">
              <p className="text-gray-600">
                Tem certeza que deseja excluir a turma "{selectedItem.nome}"? Esta ação não pode ser
                desfeita.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={closeModal}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Excluir
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {activeTab === 'users' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Número Mecanográfico
                    </label>
                    <input
                      type="text"
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      defaultValue={selectedItem?.numero_mecanografico || ''}
                      disabled={isViewMode}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nome Completo
                    </label>
                    <input
                      type="text"
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      defaultValue={selectedItem?.nome || ''}
                      disabled={isViewMode}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      defaultValue={selectedItem?.email || ''}
                      disabled={isViewMode}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tipo de Utilizador
                    </label>
                    <select
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      defaultValue={selectedItem?.tipo_utilizador || ''}
                      disabled={isViewMode}
                    >
                      <option value="ALUNO">Aluno</option>
                      <option value="PROFESSOR">Professor</option>
                      <option value="DIRETOR_TURMA">Diretor de Turma</option>
                      <option value="DIRECAO">Direção</option>
                      <option value="ADMIN">Administrador</option>
                    </select>
                  </div>
                </div>
              )}
              {activeTab === 'classes' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Código</label>
                    <input
                      type="text"
                      name="codigo"
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={formData.codigo}
                      onChange={handleInputChange}
                      disabled={isViewMode}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                    <input
                      type="text"
                      name="nome"
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={formData.nome}
                      onChange={handleInputChange}
                      disabled={isViewMode}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ano Letivo
                    </label>
                    <input
                      type="text"
                      name="ano_letivo"
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={formData.ano_letivo}
                      onChange={handleInputChange}
                      disabled={isViewMode}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ciclo</label>
                    <select
                      name="ciclo"
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={formData.ciclo}
                      onChange={handleInputChange}
                      disabled={isViewMode}
                    >
                      <option value="">Selecione um ciclo</option>
                      <option value="1_CICLO">1º Ciclo</option>
                      <option value="2_CICLO">2º Ciclo</option>
                      <option value="3_CICLO">3º Ciclo</option>
                      <option value="SECUNDARIO">Secundário</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Diretor de Turma
                    </label>
                    <input
                      type="text"
                      name="diretor_turma"
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={formData.diretor_turma}
                      onChange={handleInputChange}
                      disabled={isViewMode}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Número de Alunos
                    </label>
                    <input
                      type="number"
                      name="numero_alunos"
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={formData.numero_alunos}
                      onChange={handleInputChange}
                      disabled={isViewMode}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ativo</label>
                    <input
                      type="checkbox"
                      name="ativo"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      checked={formData.ativo}
                      onChange={handleInputChange}
                      disabled={isViewMode}
                    />
                  </div>
                </div>
              )}
              {!isViewMode && (
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    onClick={closeModal}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSubmit}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    {isCreateMode ? 'Criar' : 'Salvar'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Modal;
