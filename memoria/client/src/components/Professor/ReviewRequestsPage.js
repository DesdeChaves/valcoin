import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import * as memoriaApi from '../../services/memoria.api';
import { toast } from 'react-toastify';

const ReviewRequestsPage = () => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const fetchRequests = useCallback(async () => {
        try {
            setLoading(true);
            const response = await memoriaApi.getFlashcardReviewRequests();
            setRequests(response.data || []);
        } catch (error) {
            console.error("Erro ao carregar pedidos de revisão:", error);
            toast.error("Não foi possível carregar os pedidos de revisão.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchRequests();
    }, [fetchRequests]);

    const handleUpdateRequest = async (id, estado) => {
        try {
            await memoriaApi.updateFlashcardReviewRequest(id, { estado });
            toast.success("Pedido de revisão atualizado com sucesso!");
            fetchRequests(); // Refresh the list
        } catch (error) {
            console.error("Erro ao atualizar pedido de revisão:", error);
            toast.error("Não foi possível atualizar o pedido de revisão.");
        }
    };

    const handleEditFlashcard = (flashcardId) => {
        navigate(`/manage?flashcardId=${flashcardId}`);
    };

    if (loading) {
        return <div className="text-center p-8">A carregar pedidos de revisão...</div>;
    }

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <h1 className="text-2xl font-bold text-gray-800 mb-6">Pedidos de Revisão de Flashcards</h1>
            {requests.length === 0 ? (
                <p className="text-gray-600">Não existem pedidos de revisão pendentes.</p>
            ) : (
                <div className="bg-white shadow-md rounded-lg overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aluno</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Flashcard (Frente)</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Motivo</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data do Pedido</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {requests.map((request) => (
                                <tr key={request.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{request.aluno_nome}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700" dangerouslySetInnerHTML={{ __html: request.flashcard_front }}></td>
                                    <td className="px-6 py-4 text-sm text-gray-700">{request.motivo}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(request.data_pedido).toLocaleString()}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <button
                                            onClick={() => handleEditFlashcard(request.flashcard_id)}
                                            className="text-blue-600 hover:text-blue-900 mr-4"
                                        >
                                            Editar Flashcard
                                        </button>
                                        <button
                                            onClick={() => handleUpdateRequest(request.id, 'resolvido')}
                                            className="text-green-600 hover:text-green-900 mr-4"
                                        >
                                            Marcar como Resolvido
                                        </button>
                                        <button
                                            onClick={() => handleUpdateRequest(request.id, 'inativado')}
                                            className="text-red-600 hover:text-red-900"
                                        >
                                            Inativar
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

export default ReviewRequestsPage;

