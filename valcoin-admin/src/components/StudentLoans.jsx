import React, { useState, useEffect } from 'react';
import { getStudentLoans, approveLoan, rejectLoan } from '../services/api';

const StudentLoans = () => {
    const [loans, setLoans] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchLoans = async () => {
        try {
            const data = await getStudentLoans();
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

    const handleApprove = async (id) => {
        try {
            await approveLoan(id);
            fetchLoans();
        } catch (error) {
            console.error('Error approving loan:', error);
            alert('Erro ao aprovar o empréstimo.');
        }
    };

    const handleReject = async (id) => {
        try {
            await rejectLoan(id);
            fetchLoans();
        } catch (error) {
            console.error('Error rejecting loan:', error);
            alert('Erro ao rejeitar o empréstimo.');
        }
    };

    if (loading) {
        return <div>A carregar...</div>;
    }

    return (
        <div className="p-6">
            <h2 className="text-2xl font-semibold mb-4">Empréstimos de Alunos</h2>
            <div className="overflow-x-auto bg-white rounded shadow">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aluno</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Produto</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Montante</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data Pedido</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {loans.map((loan) => (
                            <tr key={loan.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{loan.student_name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{loan.product_name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{loan.amount} VC</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(loan.created_at).toLocaleDateString()}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{loan.status}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    {loan.status === 'PENDING' && (
                                        <>
                                            <button onClick={() => handleApprove(loan.id)} className="text-green-600 hover:text-green-900 mr-4">Aprovar</button>
                                            <button onClick={() => handleReject(loan.id)} className="text-red-600 hover:text-red-900">Rejeitar</button>
                                        </>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default StudentLoans;
