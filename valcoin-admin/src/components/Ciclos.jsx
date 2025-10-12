import React, { useState, useEffect } from 'react';
import { getAllCiclos, createCiclo, updateCiclo, deleteCiclo } from '../services/api';
import CicloModal from './CicloModal';

const Ciclos = () => {
    const [ciclos, setCiclos] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedCiclo, setSelectedCiclo] = useState(null);

    const fetchCiclos = async () => {
        try {
            const data = await getAllCiclos();
            setCiclos(data);
        } catch (error) {
            console.error('Error fetching ciclos:', error);
        }
    };

    useEffect(() => {
        fetchCiclos();
    }, []);

    const handleSave = async (cicloData) => {
        try {
            if (selectedCiclo) {
                await updateCiclo(selectedCiclo.id, cicloData);
            } else {
                await createCiclo(cicloData);
            }
            fetchCiclos();
            setIsModalOpen(false);
            setSelectedCiclo(null);
        } catch (error) {
            console.error('Error saving ciclo:', error);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Tem a certeza que quer apagar este ciclo?')) {
            try {
                await deleteCiclo(id);
                fetchCiclos();
            } catch (error) {
                console.error('Error deleting ciclo:', error);
                alert('Erro ao apagar o ciclo. Pode estar a ser usado por alguma turma.');
            }
        }
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-semibold">Gerir Ciclos de Ensino</h2>
                <button 
                    onClick={() => { setSelectedCiclo(null); setIsModalOpen(true); }}
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700"
                >
                    Adicionar Ciclo
                </button>
            </div>
            <div className="overflow-x-auto bg-white rounded shadow">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ativo</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {ciclos.map((ciclo) => (
                            <tr key={ciclo.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{ciclo.nome}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{ciclo.ativo ? 'Sim' : 'Não'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <button 
                                        onClick={() => { setSelectedCiclo(ciclo); setIsModalOpen(true); }}
                                        className="text-indigo-600 hover:text-indigo-900 mr-4"
                                    >
                                        Editar
                                    </button>
                                    <button 
                                        onClick={() => handleDelete(ciclo.id)}
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
            <CicloModal 
                isOpen={isModalOpen} 
                onClose={() => { setIsModalOpen(false); setSelectedCiclo(null); }} 
                onSave={handleSave} 
                ciclo={selectedCiclo} 
            />
        </div>
    );
};

export default Ciclos;