import React, { useState } from 'react';
import { XCircle, CheckCircle, AlertTriangle } from 'lucide-react';
import { changePassword } from '../services';

const ChangePasswordModal = ({ showModal, closeModal }) => {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [feedback, setFeedback] = useState({ message: '', type: '' });
  const [errors, setErrors] = useState({});

  if (!showModal) return null;

  const validateForm = () => {
    const newErrors = {};
    if (!oldPassword) newErrors.oldPassword = 'Senha antiga é obrigatória';
    if (!newPassword) newErrors.newPassword = 'Nova senha é obrigatória';
    if (newPassword.length < 6) newErrors.newPassword = 'A nova senha deve ter pelo menos 6 caracteres';
    if (newPassword !== confirmPassword) newErrors.confirmPassword = 'As senhas não coincidem';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }

    try {
      await changePassword({ oldPassword, newPassword });
      setFeedback({ message: 'Senha alterada com sucesso!', type: 'success' });
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(closeModal, 2000);
    } catch (error) {
      setFeedback({ message: error.response?.data?.error || 'Falha ao alterar a senha.', type: 'error' });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Alterar Senha</h3>
            <button onClick={closeModal} className="text-gray-500 hover:text-gray-700">
              <XCircle className="w-6 h-6" />
            </button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Senha Antiga</label>
                <input
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className={`w-full p-2 border rounded-lg ${errors.oldPassword ? 'border-red-500' : 'border-gray-300'}`}
                />
                {errors.oldPassword && <p className="text-red-500 text-xs mt-1">{errors.oldPassword}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nova Senha</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={`w-full p-2 border rounded-lg ${errors.newPassword ? 'border-red-500' : 'border-gray-300'}`}
                />
                {errors.newPassword && <p className="text-red-500 text-xs mt-1">{errors.newPassword}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar Nova Senha</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`w-full p-2 border rounded-lg ${errors.confirmPassword ? 'border-red-500' : 'border-gray-300'}`}
                />
                {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>}
              </div>
            </div>
            {feedback.message && (
              <div className={`mt-4 flex items-center text-sm ${feedback.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                {feedback.type === 'success' ? <CheckCircle className="w-4 h-4 mr-2" /> : <AlertTriangle className="w-4 h-4 mr-2" />}
                {feedback.message}
              </div>
            )}
            <div className="flex justify-end space-x-3 pt-6">
              <button type="button" onClick={closeModal} className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
                Cancelar
              </button>
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Alterar Senha
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChangePasswordModal;
