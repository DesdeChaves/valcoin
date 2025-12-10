import React, { useState, useEffect } from 'react';

const DominioModal = ({ isOpen, onClose, onSave, dominio }) => {
    const [nome, setNome] = useState('');
    const [descricao, setDescricao] = useState('');
    const [ativo, setAtivo] = useState(true);

    useEffect(() => {
        if (dominio) {
            setNome(dominio.nome || '');
            setDescricao(dominio.descricao || '');
            setAtivo(dominio.ativo !== undefined ? dominio.ativo : true);
        } else {
            setNome('');
            setDescricao('');
            setAtivo(true);
        }
    }, [dominio, isOpen]); // Added isOpen to dependency array

    if (!isOpen) return null;

    const handleSave = () => {
        onSave({ nome, descricao, ativo });
    };

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                <div className="mt-3 text-center">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">{dominio ? 'Editar Domínio' : 'Adicionar Novo Domínio'}</h3>
                    <div className="mt-2 px-7 py-3">
                        <input
                            type="text"
                            placeholder="Nome do Domínio"
                            value={nome}
                            onChange={(e) => setNome(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-lg mb-4"
                        />
                        <textarea
                            placeholder="Descrição do Domínio"
                            value={descricao}
                            onChange={(e) => setDescricao(e.target.value)}
                            rows="3"
                            className="w-full p-2 border border-gray-300 rounded-lg mb-4"
                        ></textarea>
                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                id="ativo"
                                checked={ativo}
                                onChange={(e) => setAtivo(e.target.checked)}
                                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                            />
                            <label htmlFor="ativo" className="ml-2 block text-sm text-gray-900">
                                Ativo
                            </label>
                        </div>
                    </div>
                    <div className="items-center px-4 py-3">
                        <button
                            onClick={handleSave}
                            className="px-4 py-2 bg-indigo-600 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            Salvar
                        </button>
                        <button
                            onClick={onClose}
                            className="mt-2 px-4 py-2 bg-gray-200 text-gray-800 text-base font-medium rounded-md w-full shadow-sm hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DominioModal;