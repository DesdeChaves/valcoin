import React, { useState, useEffect } from 'react';
import { XCircle, CheckCircle, AlertTriangle } from 'lucide-react';

const UserModal = ({ showModal, closeModal, modalType, selectedItem, onSave, onDelete }) => {
  const [formData, setFormData] = useState({});
  const [newPassword, setNewPassword] = useState('');
  const [passwordFeedback, setPasswordFeedback] = useState({ message: '', type: '' });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (showModal) {
      if (selectedItem && modalType !== 'create') {
        setFormData({
          numero_mecanografico: selectedItem.numero_mecanografico || '',
          nome: selectedItem.nome || '',
          email: selectedItem.email || '',
          tipo_utilizador: selectedItem.tipo_utilizador || 'ALUNO',
          ano_escolar: selectedItem.ano_escolar || '',
          ativo: selectedItem.ativo ?? true,
          saldo: selectedItem.saldo ?? 0,
        });
      } else {
        setFormData({
          numero_mecanografico: '',
          nome: '',
          email: '',
          tipo_utilizador: 'ALUNO',
          ano_escolar: '',
          ativo: true,
          password: '',
          saldo: 0,
        });
      }
      setErrors({});
      setNewPassword('');
      setPasswordFeedback({ message: '', type: '' });
    }
  }, [showModal, modalType, selectedItem]);

  if (!showModal) return null;

  const isViewMode = modalType === 'view';
  const isDeleteMode = modalType === 'delete';

  const validateForm = () => {
    const newErrors = {};
    if (!formData.numero_mecanografico) newErrors.numero_mecanografico = 'Número mecanográfico é obrigatório';
    if (!formData.nome) newErrors.nome = 'Nome é obrigatório';
    if (!formData.email) newErrors.email = 'Email é obrigatório';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email inválido';
    if (modalType === 'create' && !formData.password) newErrors.password = 'Senha é obrigatória';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      onSave(formData);
    }
  };

  const handlePasswordChange = async () => {
    if (!newPassword || newPassword.length < 6) {
      setPasswordFeedback({ message: 'A nova senha deve ter pelo menos 6 caracteres.', type: 'error' });
      return;
    }

    try {
      const response = await fetch(`/api/admin/users/${selectedItem.id}/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: JSON.stringify({ password: newPassword }),
      });

      if (response.ok) {
        setPasswordFeedback({ message: 'Senha alterada com sucesso!', type: 'success' });
        setNewPassword('');
      } else {
        const errorData = await response.json();
        setPasswordFeedback({ message: errorData.error || 'Falha ao alterar a senha.', type: 'error' });
      }
    } catch (error) {
      setPasswordFeedback({ message: 'Erro de rede. Tente novamente.', type: 'error' });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">
              {modalType === 'view' && 'Visualizar'}
              {modalType === 'edit' && 'Editar'}
              {modalType === 'create' && 'Criar Novo'}
              {modalType === 'delete' && 'Confirmar Exclusão'} Utilizador
            </h3>
            <button onClick={closeModal} className="text-gray-500 hover:text-gray-700">
              <XCircle className="w-6 h-6" />
            </button>
          </div>
          {isDeleteMode ? (
            <div className="space-y-4">
              <p className="text-gray-600">
                Tem certeza que deseja excluir o utilizador "{selectedItem?.nome || ''}"?
              </p>
              <div className="flex justify-end space-x-3">
                <button onClick={closeModal} className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
                  Cancelar
                </button>
                <button onClick={onDelete} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
                  Excluir
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Número Mecanográfico</label>
                    <input
                      type="text"
                      name="numero_mecanografico"
                      className={`w-full p-2 border rounded-lg ${errors.numero_mecanografico ? 'border-red-500' : 'border-gray-300'}`}
                      value={formData.numero_mecanografico || ''}
                      onChange={handleInputChange}
                      disabled={isViewMode}
                    />
                    {errors.numero_mecanografico && <p className="text-red-500 text-xs mt-1">{errors.numero_mecanografico}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                    <input
                      type="text"
                      name="nome"
                      className={`w-full p-2 border rounded-lg ${errors.nome ? 'border-red-500' : 'border-gray-300'}`}
                      value={formData.nome || ''}
                      onChange={handleInputChange}
                      disabled={isViewMode}
                    />
                    {errors.nome && <p className="text-red-500 text-xs mt-1">{errors.nome}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      name="email"
                      className={`w-full p-2 border rounded-lg ${errors.email ? 'border-red-500' : 'border-gray-300'}`}
                      value={formData.email || ''}
                      onChange={handleInputChange}
                      disabled={isViewMode}
                    />
                    {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Utilizador</label>
                    <select
                      name="tipo_utilizador"
                      className="w-full p-2 border border-gray-300 rounded-lg"
                      value={formData.tipo_utilizador || 'ALUNO'}
                      onChange={handleInputChange}
                      disabled={isViewMode}
                    >
                      <option value="ALUNO">Aluno</option>
                      <option value="PROFESSOR">Professor</option>
                      <option value="ADMIN">Administrador</option>
                    </select>
                  </div>
                  {formData.tipo_utilizador === 'ALUNO' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Ano Escolar</label>
                      <input
                        type="number"
                        name="ano_escolar"
                        className={`w-full p-2 border rounded-lg ${errors.ano_escolar ? 'border-red-500' : 'border-gray-300'}`}
                        value={formData.ano_escolar || ''}
                        onChange={handleInputChange}
                        disabled={isViewMode}
                      />
                      {errors.ano_escolar && <p className="text-red-500 text-xs mt-1">{errors.ano_escolar}</p>}
                    </div>
                  )}
                  {(modalType === 'view' || modalType === 'edit') && selectedItem?.data_criacao && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Data de Criação</label>
                      <input
                        type="text"
                        className="w-full p-2 border border-gray-300 rounded-lg bg-gray-100"
                        value={new Date(selectedItem.data_criacao).toLocaleDateString('pt-PT')}
                        disabled
                      />
                    </div>
                  )}
                  {modalType === 'create' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
                      <input
                        type="password"
                        name="password"
                        className={`w-full p-2 border rounded-lg ${errors.password ? 'border-red-500' : 'border-gray-300'}`}
                        value={formData.password || ''}
                        onChange={handleInputChange}
                      />
                      {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
                    </div>
                  )}
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ativo</label>
                    <input
                      type="checkbox"
                      name="ativo"
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                      checked={formData.ativo ?? true}
                      onChange={handleInputChange}
                      disabled={isViewMode}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Saldo</label>
                    <input
                      type="number"
                      name="saldo"
                      className={`w-full p-2 border rounded-lg ${errors.saldo ? 'border-red-500' : 'border-gray-300'}`}
                      value={formData.saldo ?? 0}
                      onChange={handleInputChange}
                      disabled={isViewMode}
                    />
                    {errors.saldo && <p className="text-red-500 text-xs mt-1">{errors.saldo}</p>}
                  </div>
                </div>

                {/* Password Change Section - Only in Edit Mode */}
                {modalType === 'edit' && (
                  <div className="pt-4 mt-4 border-t">
                    <h4 className="text-md font-semibold mb-2">Alterar Senha</h4>
                    <div className="flex items-start space-x-2">
                      <div className="flex-grow">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nova Senha</label>
                        <input
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-lg"
                          placeholder="Mínimo 6 caracteres"
                        />
                      </div>
                      <button 
                        type="button"
                        onClick={handlePasswordChange}
                        className="px-4 py-2 mt-7 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                      >
                        Alterar Senha
                      </button>
                    </div>
                    {passwordFeedback.message && (
                      <div className={`mt-2 flex items-center text-sm ${passwordFeedback.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                        {passwordFeedback.type === 'success' ? <CheckCircle className="w-4 h-4 mr-2" /> : <AlertTriangle className="w-4 h-4 mr-2" />}
                        {passwordFeedback.message}
                      </div>
                    )}
                  </div>
                )}

                {!isViewMode && (
                  <div className="flex justify-end space-x-3 pt-4">
                    <button type="button" onClick={closeModal} className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
                      Cancelar
                    </button>
                    <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                      {modalType === 'create' ? 'Criar' : 'Salvar'}
                    </button>
                  </div>
                )}
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserModal;
