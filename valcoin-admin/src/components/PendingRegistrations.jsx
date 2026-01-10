import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { getPendingRegistrations, approvePendingRegistration, rejectPendingRegistration } from '../services/api';
import { Check, X, Loader2 } from 'lucide-react';

const PendingRegistrations = () => {
    const [pendingUsers, setPendingUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [processingId, setProcessingId] = useState(null);

    const fetchPendingUsers = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getPendingRegistrations();
            setPendingUsers(data);
        } catch (err) {
            console.error('Failed to fetch pending registrations:', err);
            setError('Erro ao carregar registos pendentes.');
            toast.error('Erro ao carregar registos pendentes.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPendingUsers();
    }, [fetchPendingUsers]);

    const handleApprove = async (id) => {
        setProcessingId(id);
        try {
            await approvePendingRegistration(id);
            toast.success('Registo aprovado com sucesso!');
            fetchPendingUsers(); // Refresh the list
        } catch (err) {
            console.error('Failed to approve registration:', err);
            toast.error('Erro ao aprovar registo.');
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async (id) => {
        setProcessingId(id);
        try {
            await rejectPendingRegistration(id);
            toast.info('Registo rejeitado.');
            fetchPendingUsers(); // Refresh the list
        } catch (err) {
            console.error('Failed to reject registration:', err);
            toast.error('Erro ao rejeitar registo.');
        } finally {
            setProcessingId(null);
        }
    };

    if (loading) {
        return <div className="text-center p-4">A carregar registos pendentes...</div>;
    }

    if (error) {
        return <div className="text-center p-4 text-red-600">{error}</div>;
    }

    return (
        <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium mb-4">Gerir Registos Externos Pendentes</h3>
            {pendingUsers.length === 0 ? (
                <p className="text-gray-600">Nenhum registo pendente encontrado.</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data do Pedido</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {pendingUsers.map((user) => (
                                <tr key={user.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.nome}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(user.data_pedido).toLocaleString()}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button
                                            onClick={() => handleApprove(user.id)}
                                            disabled={processingId === user.id}
                                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 mr-2"
                                        >
                                            {processingId === user.id ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Check className="h-4 w-4 mr-1" />}
                                            Aprovar
                                        </button>
                                        <button
                                            onClick={() => handleReject(user.id)}
                                            disabled={processingId === user.id}
                                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                                        >
                                            {processingId === user.id ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <X className="h-4 w-4 mr-1" />}
                                            Rejeitar
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default PendingRegistrations;