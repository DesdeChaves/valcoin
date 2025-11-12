import React, { useState, useEffect } from 'react';
import { fetchProfessorDisciplines } from '../../utils/api';

const DossierForm = ({ isOpen, onClose, onSave, dossier, professorId }) => {
    const [formData, setFormData] = useState({
        nome: '',
        descricao: '',
        professor_disciplina_turma_id: '',
        data_inicio: '',
        data_fim: '',
        ativo: true, // New field
        escala_avaliacao: 20,
    });
    const [disciplines, setDisciplines] = useState([]);
    const [loadingDisciplines, setLoadingDisciplines] = useState(true);
    const [errorDisciplines, setErrorDisciplines] = useState(null);

    useEffect(() => {
        if (professorId) {
            const fetchDisciplines = async () => {
                try {
                    const response = await fetchProfessorDisciplines(professorId);
                    setDisciplines(response);
                    setLoadingDisciplines(false);
                } catch (err) {
                    setErrorDisciplines('Error fetching disciplines');
                    setLoadingDisciplines(false);
                    console.error('Error fetching disciplines:', err);
                }
            };
            fetchDisciplines();
        }
    }, [professorId]);

    useEffect(() => {
        if (dossier) {
            setFormData({
                nome: dossier.nome || '',
                descricao: dossier.descricao || '',
                professor_disciplina_turma_id: dossier.professor_disciplina_turma_id || '',
                data_inicio: dossier.data_inicio ? new Date(dossier.data_inicio).toISOString().split('T')[0] : '',
                data_fim: dossier.data_fim ? new Date(dossier.data_fim).toISOString().split('T')[0] : '',
                ativo: dossier.ativo !== undefined ? dossier.ativo : true,
                escala_avaliacao: dossier.escala_avaliacao || 20,
            });
        } else {
            setFormData({
                nome: '',
                descricao: '',
                professor_disciplina_turma_id: '',
                data_inicio: '',
                data_fim: '',
                ativo: true,
                escala_avaliacao: 20,
            });
        }
    }, [dossier]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData((prevData) => ({
            ...prevData,
            [name]: type === 'checkbox' ? checked : value,
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex justify-center items-center">
            <div className="bg-white p-8 rounded-lg shadow-xl w-1/2">
                <h2 className="text-xl font-bold mb-4">{dossier ? 'Editar Dossiê' : 'Novo Dossiê'}</h2>
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="nome">Nome</label>
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
                    <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="descricao">Descrição</label>
                        <textarea
                            id="descricao"
                            name="descricao"
                            value={formData.descricao}
                            onChange={handleChange}
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        ></textarea>
                    </div>
                    <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="professor_disciplina_turma_id">Disciplina</label>
                        {loadingDisciplines ? (
                            <div>Loading disciplines...</div>
                        ) : errorDisciplines ? (
                            <div className="text-red-500">{errorDisciplines}</div>
                        ) : (
                            <select
                                id="professor_disciplina_turma_id"
                                name="professor_disciplina_turma_id"
                                value={formData.professor_disciplina_turma_id}
                                onChange={handleChange}
                                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                required
                                disabled={!!dossier} // Disable if editing existing dossier
                            >
                                <option value="">Selecione uma disciplina</option>
                                {disciplines.map((discipline) => (
                                    <option key={discipline.professor_disciplina_turma_id} value={discipline.professor_disciplina_turma_id}>
                                        {discipline.subject_name} ({discipline.class_name})
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>
                    <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="data_inicio">Data de Início</label>
                        <input
                            type="date"
                            id="data_inicio"
                            name="data_inicio"
                            value={formData.data_inicio}
                            onChange={handleChange}
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        />
                    </div>
                    <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="data_fim">Data de Fim</label>
                        <input
                            type="date"
                            id="data_fim"
                            name="data_fim"
                            value={formData.data_fim}
                            onChange={handleChange}
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        />
                    </div>
                    <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="escala_avaliacao">Escala de Avaliação</label>
                        <select
                            id="escala_avaliacao"
                            name="escala_avaliacao"
                            value={formData.escala_avaliacao}
                            onChange={handleChange}
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        >
                            <option value="5">0-5</option>
                            <option value="20">0-20</option>
                            <option value="100">0-100</option>
                        </select>
                    </div>
                    <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="ativo">Ativo</label>
                        <input
                            type="checkbox"
                            id="ativo"
                            name="ativo"
                            checked={formData.ativo}
                            onChange={handleChange}
                            className="ml-2 leading-tight"
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
                            onClick={onClose}
                            className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                        >
                            Cancelar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default DossierForm;