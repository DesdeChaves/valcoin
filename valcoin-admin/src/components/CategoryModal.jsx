import React, { useState, useEffect } from 'react';
import { XCircle } from 'lucide-react';

const CategoryModal = ({ isOpen, onClose, onSave, category }) => {
    const [name, setName] = useState('');
    const [isDeductible, setIsDeductible] = useState(false);
    const [maxDeductionValue, setMaxDeductionValue] = useState('0.00');

    useEffect(() => {
        if (category) {
            setName(category.name || '');
            setIsDeductible(category.is_deductible || false);
            setMaxDeductionValue(category.max_deduction_value || '0.00');
        } else {
            setName('');
            setIsDeductible(false);
            setMaxDeductionValue('0.00');
        }
    }, [category]);

    const handleSave = () => {
        onSave({
            name,
            is_deductible: isDeductible,
            max_deduction_value: parseFloat(maxDeductionValue) || 0,
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full">
                <div className="p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold">{category ? 'Editar Categoria' : 'Adicionar Categoria'}</h3>
                        <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                            <XCircle className="w-6 h-6" />
                        </button>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Nome da Categoria</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                            />
                        </div>
                        <div className="flex items-center">
                            <input
                                id="isDeductible"
                                type="checkbox"
                                checked={isDeductible}
                                onChange={(e) => setIsDeductible(e.target.checked)}
                                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <label htmlFor="isDeductible" className="ml-2 block text-sm text-gray-900">É Dedutível?</label>
                        </div>
                        {isDeductible && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Valor Máximo de Dedução</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={maxDeductionValue}
                                    onChange={(e) => setMaxDeductionValue(e.target.value)}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                />
                            </div>
                        )}
                        <div className="flex justify-end space-x-2 pt-4">
                            <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">Cancelar</button>
                            <button onClick={handleSave} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">Guardar</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CategoryModal;