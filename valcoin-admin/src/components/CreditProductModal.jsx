import React, { useState, useEffect } from 'react';
import { XCircle } from 'lucide-react';

const CreditProductModal = ({ isOpen, onClose, onSave, product }) => {
    const [formData, setFormData] = useState({
        name: '',
        interest_rate: '0.00',
        max_amount: '1000.00',
        term_months: 12,
        payment_period: 'monthly',
        is_active: true,
    });

    useEffect(() => {
        if (product) {
            setFormData({
                name: product.name || '',
                interest_rate: product.interest_rate || '0.00',
                max_amount: product.max_amount || '1000.00',
                term_months: product.term_months || 12,
                payment_period: product.payment_period || 'monthly',
                is_active: product.is_active !== undefined ? product.is_active : true,
            });
        } else {
            setFormData({
                name: '',
                interest_rate: '0.00',
                max_amount: '1000.00',
                term_months: 12,
                payment_period: 'monthly',
                is_active: true,
            });
        }
    }, [product]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleSave = () => {
        onSave(formData);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold">{product ? 'Editar Produto de Crédito' : 'Novo Produto de Crédito'}</h3>
                        <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                            <XCircle className="w-6 h-6" />
                        </button>
                    </div>
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Nome</label>
                                <input type="text" name="name" value={formData.name} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Taxa de Juro Anual (%)</label>
                                <input type="number" step="0.01" name="interest_rate" value={formData.interest_rate} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Montante Máximo</label>
                                <input type="number" step="0.01" name="max_amount" value={formData.max_amount} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Prazo (meses)</label>
                                <input type="number" name="term_months" value={formData.term_months} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Frequência de Pagamento de Juros</label>
                                <select name="payment_period" value={formData.payment_period} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm">
                                    <option value="daily">Diário</option>
                                    <option value="weekly">Semanal</option>
                                    <option value="monthly">Mensal</option>
                                </select>
                            </div>
                            <div className="flex items-center">
                                <input id="is_active" type="checkbox" name="is_active" checked={formData.is_active} onChange={handleChange} className="h-4 w-4 rounded border-gray-300" />
                                <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">Ativo</label>
                            </div>
                        </div>
                        <div className="flex justify-end space-x-2 pt-4">
                            <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50">Cancelar</button>
                            <button onClick={handleSave} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700">Guardar</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreditProductModal;
