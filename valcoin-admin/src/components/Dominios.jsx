import React, { useState, useEffect } from 'react';
import { getAllDominios, createDominio, updateDominio, deleteDominio } from '../services/api';
import DominioModal from './DominioModal'; // We will create this next

const Dominios = () => {
    const [dominios, setDominios] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedDominio, setSelectedDominio] = useState(null);

    const fetchDominios = async () => {
        try {
            const data = await getAllDominios();
            setDominios(data);
        } catch (error) {
            console.error('Error fetching dominios:', error);
        }
    };

    useEffect(() => {
        fetchDominios();
    }, []);

    const handleSave = async (dominioData) => {
        try {
            if (selectedDominio) {
                await updateDominio(selectedDominio.id, dominioData);
            } else {
                await createDominio(dominioData);
            }
            fetchDominios();
            setIsModalOpen(false);
            setSelectedDominio(null);
        } catch (error) {
            console.error('Error saving dominio:', error);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Tem a certeza que quer apagar este domínio?')) {
            try {
                await deleteDominio(id);
                fetchDominios();
            } catch (error) {
                console.error('Error deleting dominio:', error);
                alert(`Erro ao apagar o domínio: ${error.message}`);
            }
        }
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-semibold">Gerir Domínios de Competência</h2>
                <button 
                    onClick={() => { setSelectedDominio(null); setIsModalOpen(true); }}
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700"
                >
                    Adicionar Domínio
                </button>
            </div>
            <div className="overflow-x-auto bg-white rounded shadow">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descrição</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ativo</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {dominios.map((dominio) => (
                            <tr key={dominio.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{dominio.nome}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{dominio.descricao}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{dominio.ativo ? 'Sim' : 'Não'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <button 
                                        onClick={() => { setSelectedDominio(dominio); setIsModalOpen(true); }}
                                        className="text-indigo-600 hover:text-indigo-900 mr-4"
                                    >
                                        Editar
                                    </button>
                                    <button 
                                        onClick={() => handleDelete(dominio.id)}
                                        className="text-red-600 hover:text-red-900"
                                    >
                                        Apagar
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <DominioModal 
                isOpen={isModalOpen} 
                onClose={() => { setIsModalOpen(false); setSelectedDominio(null); }} 
                onSave={handleSave} 
                dominio={selectedDominio} 
            />
        </div>
    );
};

export default Dominios;