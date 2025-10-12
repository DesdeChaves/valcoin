import React, { useState } from 'react';
import { XCircle } from 'lucide-react';

const RepaymentModal = ({ isOpen, onClose, onSave, loan }) => {
    const [amount, setAmount] = useState('');

    const handleSave = () => {
        onSave({ loan_id: loan.id, amount });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-lg w-full">
                <div className="p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold">Pagar Empréstimo: {loan.product_name}</h3>
                        <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                            <XCircle className="w-6 h-6" />
                        </button>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Montante</label>
                            <input 
                                type="number" 
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" 
                                max={loan.amount - (loan.paid_amount || 0)} // This should be the outstanding amount
                            />
                            <p className="text-xs text-gray-500 mt-1">Total em dívida: {loan.amount - (loan.paid_amount || 0)} VC</p> 
                        </div>
                        <div className="flex justify-end space-x-2 pt-4">
                            <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50">Cancelar</button>
                            <button onClick={handleSave} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700">Confirmar Pagamento</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RepaymentModal;
