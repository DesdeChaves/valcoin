// src/components/professor/ProfessorTransactionForm.jsx
import React, { useState, useEffect } from 'react';
import { createProfessorTransaction, getSettings } from '../../services';
import { Users, DollarSign, FileText, Receipt, Sparkles, Calculator, CheckCircle, AlertCircle, RotateCcw, Send } from 'lucide-react';
import ValCoinIcon from '../icons/ValCoinIcon';

const ProfessorTransactionForm = ({ users, onTransactionCreated }) => {
  const [utilizador_destino_id, setUtilizadorDestinoId] = useState('');
  const [montante, setMontante] = useState('');
  const [descricao, setDescricao] = useState('');
  const [taxa_iva_ref, setTaxaIvaRef] = useState('isento');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [settings, setSettings] = useState(null);
  const [calculatedAmounts, setCalculatedAmounts] = useState(null);

  // Carregar configurações para obter taxas de IVA
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const settingsData = await getSettings();
        setSettings(settingsData);
      } catch (err) {
        console.error('Erro ao carregar configurações:', err);
      }
    };
    fetchSettings();
  }, []);

  // Calcular valores com IVA sempre que montante ou taxa mudarem
  useEffect(() => {
    if (montante && settings?.taxasIVA) {
      const valor = parseFloat(montante);
      const taxaIVA = settings.taxasIVA[taxa_iva_ref] || 0;
      
      if (valor > 0 && taxaIVA > 0) {
        const taxaDecimal = taxaIVA / 100;
        const valorSemIVA = valor / (1 + taxaDecimal);
        const valorIVA = valor - valorSemIVA;
        
        setCalculatedAmounts({
          valorTotal: valor,
          valorSemIVA: parseFloat(valorSemIVA.toFixed(2)),
          valorIVA: parseFloat(valorIVA.toFixed(2)),
          taxaIVA: taxaIVA
        });
      } else {
        setCalculatedAmounts({
          valorTotal: valor,
          valorSemIVA: valor,
          valorIVA: 0,
          taxaIVA: 0
        });
      }
    } else {
      setCalculatedAmounts(null);
    }
  }, [montante, taxa_iva_ref, settings]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const transactionData = {
        utilizador_destino_id,
        montante: parseFloat(montante),
        descricao,
        taxa_iva_ref
      };

      console.log('Sending transaction data:', transactionData);
      const result = await createProfessorTransaction(transactionData);
      console.log('Transaction created successfully:', result);
      
      setSuccess('Pagamento criado com sucesso!');
      
      // Limpar formulário
      setUtilizadorDestinoId('');
      setMontante('');
      setDescricao('');
      setTaxaIvaRef('isento');
      setCalculatedAmounts(null);
      
      // Chamar callback se fornecido (para atualizar lista de pagamentos)
      if (onTransactionCreated) {
        onTransactionCreated();
      }
    } catch (err) {
      console.error('Erro ao criar transação:', err);
      console.error('Error response:', err.response?.data);
      setError(err.response?.data?.error || 'Falha ao criar o pagamento');
    }
  };

  const handleClear = () => {
    setUtilizadorDestinoId('');
    setMontante('');
    setDescricao('');
    setTaxaIvaRef('isento');
    setError('');
    setSuccess('');
    setCalculatedAmounts(null);
  };

  const formatCurrency = (amount) => {
    return (
      <span className="inline-flex items-center gap-1">
        {`${parseFloat(amount).toFixed(2)}`}
        <ValCoinIcon className="w-4 h-4" />
      </span>
    );
  };

  if (!settings) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 p-8">
            <div className="text-center py-16">
              <div className="relative mx-auto w-16 h-16 mb-4">
                <div className="absolute inset-0 border-4 border-blue-200 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-blue-600 rounded-full animate-spin border-t-transparent"></div>
              </div>
              <p className="text-gray-600 font-medium">Carregando configurações...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Modern Header */}
        <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 rounded-3xl p-8 text-white shadow-2xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-24 -translate-x-24"></div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <DollarSign className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Novo Pagamento</h1>
                <p className="text-blue-100 text-lg">Criar pagamento manual para aluno</p>
              </div>
            </div>
          </div>
        </div>

        {/* Modern Form */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 p-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            
            {/* Destinatário */}
            <div className="space-y-3">
              <label htmlFor="destinatario" className="flex items-center gap-2 text-sm font-bold text-gray-700">
                <div className="p-1.5 bg-blue-100 rounded-lg">
                  <Users className="w-4 h-4 text-blue-600" />
                </div>
                Destinatário *
              </label>
              <div className="relative">
                <select
                  id="destinatario"
                  value={utilizador_destino_id}
                  onChange={(e) => setUtilizadorDestinoId(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-white/80 backdrop-blur-sm border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300 appearance-none cursor-pointer font-medium"
                >
                  <option value="">👥 Selecione um destinatário...</option>
                  {users
                    .filter((user) => user.tipo_utilizador === 'ALUNO')
                    .map((user) => (
                      <option key={user.id} value={user.id}>
                        🎓 {user.nome} ({user.numero_mecanografico}) - {formatCurrency(user.saldo || 0)}
                      </option>
                    ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <div className="w-2 h-2 border-r-2 border-b-2 border-gray-400 rotate-45"></div>
                </div>
              </div>
            </div>

            {/* Valor */}
            <div className="space-y-3">
              <label htmlFor="montante" className="flex items-center gap-2 text-sm font-bold text-gray-700">
                <div className="p-1.5 bg-emerald-100 rounded-lg">
                  <Calculator className="w-4 h-4 text-emerald-600" />
                </div>
                Valor Total <ValCoinIcon className="w-4 h-4" /> *
              </label>
              <div className="relative">
                <input
                  id="montante"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={montante}
                  onChange={(e) => setMontante(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-white/80 backdrop-blur-sm border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all duration-300 font-mono text-lg"
                  placeholder="0.00"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <ValCoinIcon className="w-5 h-5 text-gray-400" />
                </div>
              </div>
            </div>

            {/* Taxa de IVA */}
            <div className="space-y-3">
              <label htmlFor="taxa_iva" className="flex items-center gap-2 text-sm font-bold text-gray-700">
                <div className="p-1.5 bg-purple-100 rounded-lg">
                  <Receipt className="w-4 h-4 text-purple-600" />
                </div>
                Taxa de IVA
              </label>
              <div className="relative">
                <select
                  id="taxa_iva"
                  value={taxa_iva_ref}
                  onChange={(e) => setTaxaIvaRef(e.target.value)}
                  className="w-full px-4 py-3 bg-white/80 backdrop-blur-sm border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 transition-all duration-300 appearance-none cursor-pointer font-medium"
                >
                  {Object.entries(settings.taxasIVA || {}).map(([ref, taxa]) => (
                    <option key={ref} value={ref}>
                      {ref === 'isento' ? '🚫 Isento de IVA' : `📊 ${taxa}% (${ref})`}
                    </option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <div className="w-2 h-2 border-r-2 border-b-2 border-gray-400 rotate-45"></div>
                </div>
              </div>
            </div>

            {/* Resumo dos valores calculados */}
            {calculatedAmounts && (
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-6 shadow-lg">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Sparkles className="w-5 h-5 text-blue-600" />
                  </div>
                  <h4 className="font-bold text-blue-900 text-lg">Resumo do Pagamento</h4>
                </div>
                
                <div className="space-y-3 text-blue-800">
                  <div className="flex justify-between items-center p-3 bg-white/50 rounded-xl">
                    <span className="font-medium">Valor sem IVA:</span>
                    <span className="font-bold text-lg font-mono">{formatCurrency(calculatedAmounts.valorSemIVA)}</span>
                  </div>
                  
                  {calculatedAmounts.valorIVA > 0 && (
                    <div className="flex justify-between items-center p-3 bg-white/50 rounded-xl">
                      <span className="font-medium">IVA ({calculatedAmounts.taxaIVA}%):</span>
                      <span className="font-bold text-lg font-mono">{formatCurrency(calculatedAmounts.valorIVA)}</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between items-center p-4 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-xl border-2 border-blue-300">
                    <span className="font-bold text-lg">Total:</span>
                    <span className="font-bold text-2xl font-mono text-blue-700">{formatCurrency(calculatedAmounts.valorTotal)}</span>
                  </div>
                </div>
                
                {calculatedAmounts.valorIVA > 0 && (
                  <div className="mt-4 p-3 bg-blue-100 rounded-xl">
                    <div className="flex items-center gap-2 text-blue-700">
                      <CheckCircle className="w-4 h-4" />
                      <span className="text-sm font-medium">
                        O IVA será automaticamente transferido para a escola
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Descrição */}
            <div className="space-y-3">
              <label htmlFor="descricao" className="flex items-center gap-2 text-sm font-bold text-gray-700">
                <div className="p-1.5 bg-orange-100 rounded-lg">
                  <FileText className="w-4 h-4 text-orange-600" />
                </div>
                Descrição *
              </label>
              <textarea
                id="descricao"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                required
                rows={4}
                className="w-full px-4 py-3 bg-white/80 backdrop-blur-sm border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500 transition-all duration-300 resize-none"
                placeholder="✍️ Descreva o motivo do pagamento..."
              />
            </div>

            {/* Mensagens de erro e sucesso */}
            {error && (
              <div className="bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-200 rounded-2xl p-4 shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-red-800 mb-1">Erro no Pagamento</h4>
                    <p className="text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            )}
            
            {success && (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl p-4 shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-green-800 mb-1">Sucesso!</h4>
                    <p className="text-green-700">{success}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Botões de ação */}
            <div className="flex flex-col sm:flex-row gap-4 pt-6">
              <button
                type="button"
                onClick={handleClear}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-4 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl font-bold transition-all duration-300 hover:scale-105 shadow-lg"
              >
                <RotateCcw className="w-5 h-5" />
                <span>Limpar Formulário</span>
              </button>
              
              <button
                type="submit"
                disabled={!utilizador_destino_id || !montante || !descricao}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-4 text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed rounded-xl font-bold transition-all duration-300 hover:scale-105 disabled:hover:scale-100 shadow-lg"
              >
                <Send className="w-5 h-5" />
                <span>Criar Pagamento</span>
              </button>
            </div>
          </form>
        </div>

        {/* Modern Footer */}
        <div className="bg-gradient-to-r from-gray-50 to-slate-50 rounded-2xl p-6 border border-gray-200">
          <div className="text-center space-y-3">
            <div className="flex justify-center">
              <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-800 mb-1">Pagamento Manual</h3>
              <p className="text-gray-600 text-sm">
                Crie pagamentos personalizados com cálculo automático de IVA e gestão inteligente de saldos.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfessorTransactionForm;
