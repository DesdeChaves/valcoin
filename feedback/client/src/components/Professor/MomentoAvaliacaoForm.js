import React, { useState, useEffect } from 'react';

const MomentoAvaliacaoForm = ({ momento, onSave, onCancel }) => {
    const [formData, setFormData] = useState({
        nome: '',
    });

    useEffect(() => {
        if (momento) {
            setFormData({
                nome: momento.nome || '',
            });
        } else {
            setFormData({
                nome: '',
            });
        }
    }, [momento]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prevData) => ({
            ...prevData,
            [name]: value,
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <form onSubmit={handleSubmit}>
            <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="nome">
                    Nome do Momento de Avaliação
                </label>
                <input
                    type="text"
                    id="nome"
                    name="nome"
                    value={formData.nome}
                    onChange={handleChange}
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    required
                />
            </div>
            <div className="flex items-center justify-between">
                <button
                    type="submit"
                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                >
                    Salvar
                </button>
                <button
                    type="button"
                    onClick={onCancel}
                    className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                >
                    Cancelar
                </button>
            </div>
        </form>
    );
};

export default MomentoAvaliacaoForm;