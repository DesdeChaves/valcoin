import React, { useState, useEffect } from 'react';
import { getMyStudentLoans, repayStudentLoan } from '../../services/api';
import RepaymentModal from './RepaymentModal';
import ValCoinIcon from '../icons/ValCoinIcon';

const StudentLoanList = () => {
    const [loans, setLoans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedLoan, setSelectedLoan] = useState(null);

    const fetchLoans = async () => {
        try {
            const data = await getMyStudentLoans();
            setLoans(data);
        } catch (error) {
            console.error('Error fetching student loans:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLoans();
    }, []);

    const handleOpenModal = (loan) => {
        setSelectedLoan(loan);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setSelectedLoan(null);
        setIsModalOpen(false);
    };

    const handleSaveRepayment = async (repaymentData) => {
        try {
            await repayStudentLoan(repaymentData.loan_id, { amount: repaymentData.amount });
            alert('Pagamento realizado com sucesso!');
            fetchLoans();
            handleCloseModal();
        } catch (error) {
            console.error('Error repaying loan:', error);
            alert('Erro ao realizar o pagamento.');
        }
    };

    if (loading) {
        return <div>A carregar...</div>;
    }

    return (
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
            <h2 className="text-2xl font-semibold text-gray-700 mb-4">Meus Empréstimos</h2>
            {loans.length > 0 ? (
                <div className="space-y-4">
                    {loans.map(loan => (
                        <div key={loan.id} className="bg-white p-5 rounded-xl shadow-md border border-gray-200">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="font-bold text-lg text-indigo-700">{loan.product_name}</p>
                                    <p className="text-sm text-gray-500">Data Pedido: {new Date(loan.created_at).toLocaleDateString('pt-PT')}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-2xl text-gray-800 flex items-center">{loan.amount - (loan.paid_amount || 0)} <ValCoinIcon className="w-6 h-6 ml-2" /></p>
                                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${loan.status === 'ACTIVE' ? 'bg-yellow-100 text-yellow-800' : loan.status === 'PAID' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                        {loan.status}
                                    </span>
                                </div>
                            </div>
                            {loan.status === 'ACTIVE' && (
                                <button onClick={() => handleOpenModal(loan)} className="mt-4 w-full bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700">Pagar</button>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-gray-500">Ainda não tem empréstimos.</p>
            )}
            <RepaymentModal 
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                onSave={handleSaveRepayment}
                loan={selectedLoan}
            />
        </div>
    );
};

export default StudentLoanList;
