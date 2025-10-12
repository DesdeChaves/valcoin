// src/components/student/StudentManualPayment.jsx
import React, { useState, useEffect } from 'react';
import { createStudentManualPayment, getStudentPayableUsers, getStudentSettings } from '../../services';
import ValCoinIcon from '../icons/ValCoinIcon';

const StudentManualPayment = ({ onPaymentCreated }) => {
  const [utilizador_destino_id, setUtilizadorDestinoId] = useState('');
  const [montante, setMontante] = useState('');
  const [descricao, setDescricao] = useState('');
  const [taxa_iva_ref, setTaxaIvaRef] = useState('isento');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [users, setUsers] = useState([]);
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [payableUsers, settingsData] = await Promise.all([
          getStudentPayableUsers(),
          getStudentSettings(),
        ]);
        setUsers(payableUsers);
        setSettings(settingsData);
      } catch (err) {
        console.error('Erro ao carregar dados iniciais:', err);
      }
    };
    fetchInitialData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const paymentData = {
        utilizador_destino_id,
        montante: parseFloat(montante),
        descricao,
        taxa_iva_ref,
      };

      await createStudentManualPayment(paymentData);
      
      setSuccess('Pagamento enviado para aprovação!');
      
      setUtilizadorDestinoId('');
      setMontante('');
      setDescricao('');
      setTaxaIvaRef('isento');
      
      if (onPaymentCreated) {
        onPaymentCreated();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Falha ao enviar o pagamento');
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Pagamento Manual</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="destinatario" className="block text-sm font-medium text-gray-700">
            Pagar a
          </label>
          <select
            id="destinatario"
            value={utilizador_destino_id}
            onChange={(e) => setUtilizadorDestinoId(e.target.value)}
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          >
            <option value="">Selecione o destinatário</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.nome} ({user.tipo_utilizador})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="montante" className="block text-sm font-medium text-gray-700">
            Montante
          </label>
          <div className="mt-1 relative rounded-md shadow-sm">
            <input
              id="montante"
              type="number"
              step="0.01"
              min="0.01"
              value={montante}
              onChange={(e) => setMontante(e.target.value)}
              required
              className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md"
              placeholder="0.00"
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <ValCoinIcon className="h-5 w-5 text-gray-400" />
            </div>
          </div>
        </div>
        <div>
          <label htmlFor="taxa_iva" className="block text-sm font-medium text-gray-700">
            Taxa de IVA
          </label>
          <select
            id="taxa_iva"
            value={taxa_iva_ref}
            onChange={(e) => setTaxaIvaRef(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          >
            {settings &&
              Object.entries(settings.taxasIVA).map(([ref, taxa]) => (
                <option key={ref} value={ref}>
                  {ref === 'isento' ? 'Isento de IVA' : `${taxa}% (${ref})`}
                </option>
              ))}
          </select>
        </div>
        <div>
          <label htmlFor="descricao" className="block text-sm font-medium text-gray-700">
            Descrição
          </label>
          <textarea
            id="descricao"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            required
            rows={3}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="Descreva o motivo do pagamento"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {success && <p className="text-sm text-green-600">{success}</p>}
        <button
          type="submit"
          className="w-full px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Enviar para Aprovação
        </button>
      </form>
    </div>
  );
};

export default StudentManualPayment;