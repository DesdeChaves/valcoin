import React, { useState, useEffect } from 'react';
import { fetchProfessorDisciplines, fetchDossiersByDiscipline } from '../../utils/api';

const CriterionForm = ({ isOpen, onClose, onSave, criterion, professorId }) => {
    const [formData, setFormData] = useState({
        nome: '',
        descricao: '',
        ponderacao: '',
        dossie_id: '',
        ordem: '',
    });
    const [disciplines, setDisciplines] = useState([]);
    const [dossiers, setDossiers] = useState([]);
    const [selectedDisciplineId, setSelectedDisciplineId] = useState('');
    const [loadingData, setLoadingData] = useState(true);
    const [errorData, setErrorData] = useState(null);
    const [saving, setSaving] = useState(false);

    // Fetch disciplines on component mount
    useEffect(() => {
        if (professorId) {
            const fetchDisciplines = async () => {
                try {
                    const response = await fetchProfessorDisciplines(professorId);
                    setDisciplines(response.data);
                    setLoadingData(false);
                } catch (err) {
                    setErrorData('Error fetching disciplines');
                    setLoadingData(false);
                    console.error('Error fetching disciplines:', err);
                }
            };
            fetchDisciplines();
        }
    }, [professorId]);

    // Fetch dossiers when selectedDisciplineId changes
    useEffect(() => {
        console.log('selectedDisciplineId changed:', selectedDisciplineId);
        if (selectedDisciplineId) {
            const fetchDossiers = async () => {
                try {
                    const response = await fetchDossiersByDiscipline(selectedDisciplineId);
                    setDossiers(response.data.dossies);
                    console.log('Fetched dossiers:', response.data.dossies);
                } catch (err) {
                    setErrorData('Error fetching dossiers');
                    console.error('Error fetching dossiers:', err);
                }
            };
            fetchDossiers();
        } else {
            setDossiers([]);
            console.log('selectedDisciplineId is empty, dossiers reset.');
        }
    }, [selectedDisciplineId]);

    // Populate form data when editing an existing criterion
    useEffect(() => {
        if (criterion) {
            setFormData({
                nome: criterion.nome || '',
                descricao: criterion.descricao || '',
                ponderacao: criterion.ponderacao || '',
                dossie_id: criterion.dossie_id || '',
                ordem: criterion.ordem || '',
            });
        } else {
            setFormData({
                nome: '',
                descricao: '',
                ponderacao: '',
                dossie_id: '',
                ordem: '',
            });
            setSelectedDisciplineId('');
        }
    }, [criterion]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prevData) => ({
            ...prevData,
            [name]: value,
        }));
    };

    const handleDisciplineChange = (e) => {
        const { value } = e.target;
        console.log('Discipline selected value:', value);
        setSelectedDisciplineId(value);
        console.log('selectedDisciplineId after update:', value);
        setFormData((prevData) => ({
            ...prevData,
            dossie_id: '', // Reset dossier when discipline changes
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await onSave(formData);
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-fade-in">
                {/* Header */}
                <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-6 py-4 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-semibold">
                            {criterion ? 'Editar Critério' : 'Novo Critério'}
                        </h2>
                        <p className="text-sm text-purple-100 mt-1">
                            {criterion ? 'Atualize as informações do critério' : 'Preencha os campos para criar um novo critério'}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-purple-800 rounded-lg transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Form Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    <form onSubmit={handleSubmit} id="criterion-form">
                        {/* Discipline Selection */}
                        <div className="mb-6">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Disciplina *
                            </label>
                            {loadingData ? (
                                <div className="flex items-center justify-center py-4">
                                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600 mr-2"></div>
                                    <span className="text-gray-600">Carregando disciplinas...</span>
                                </div>
                            ) : errorData ? (
                                <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded-r">
                                    <p className="text-sm text-red-700">{errorData}</p>
                                </div>
                            ) : (
                                <div className="relative">
                                    <select
                                        id="discipline"
                                        name="discipline"
                                        value={selectedDisciplineId}
                                        onChange={handleDisciplineChange}
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed appearance-none"
                                        required
                                        disabled={!!criterion}
                                    >
                                        <option value="">Selecione uma disciplina</option>
                                        {disciplines.map((discipline) => (
                                            <option key={discipline.professor_disciplina_turma_id} value={discipline.professor_disciplina_turma_id}>
                                                {discipline.subject_name} ({discipline.class_name})
                                            </option>
                                        ))}
                                    </select>
                                    <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            )}
                            {criterion && (
                                <p className="mt-1 text-xs text-gray-500">
                                    Não é possível alterar a disciplina ao editar um critério
                                </p>
                            )}
                        </div>

                        {/* Dossier Selection */}
                        <div className="mb-6">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Dossiê *
                            </label>
                            {errorData ? (
                                <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded-r">
                                    <p className="text-sm text-red-700">{errorData}</p>
                                </div>
                            ) : (
                                <div className="relative">
                                    <select
                                        id="dossie_id"
                                        name="dossie_id"
                                        value={formData.dossie_id}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed appearance-none"
                                        required
                                        disabled={!!criterion || !selectedDisciplineId}
                                    >
                                        <option value="">Selecione um dossiê</option>
                                        {console.log('Dossiers for rendering:', dossiers)}
                                        {dossiers.map((dossier) => (
                                            <option key={dossier.id} value={dossier.id}>
                                                {dossier.nome}
                                            </option>
                                        ))}
                                    </select>
                                    <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            )}
                            {!selectedDisciplineId && !criterion && (
                                <p className="mt-1 text-xs text-gray-500">
                                    Selecione primeiro uma disciplina
                                </p>
                            )}
                            {criterion && (
                                <p className="mt-1 text-xs text-gray-500">
                                    Não é possível alterar o dossiê ao editar um critério
                                </p>
                            )}
                        </div>

                        {/* Criterion Name */}
                        <div className="mb-6">
                            <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="nome">
                                Nome do Critério *
                            </label>
                            <input
                                type="text"
                                id="nome"
                                name="nome"
                                value={formData.nome}
                                onChange={handleChange}
                                placeholder="Ex: Conhecimento Científico"
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                required
                            />
                        </div>

                        {/* Description */}
                        <div className="mb-6">
                            <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="descricao">
                                Descrição
                            </label>
                            <textarea
                                id="descricao"
                                name="descricao"
                                value={formData.descricao}
                                onChange={handleChange}
                                placeholder="Descreva o critério de avaliação..."
                                rows="3"
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                            />
                        </div>

                        {/* Ponderação and Ordem in Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            {/* Ponderação */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="ponderacao">
                                    Ponderação (%) *
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        id="ponderacao"
                                        name="ponderacao"
                                        value={formData.ponderacao}
                                        onChange={handleChange}
                                        placeholder="0-100"
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                        required
                                        min="0"
                                        max="100"
                                    />
                                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">
                                        %
                                    </span>
                                </div>
                                <p className="mt-1 text-xs text-gray-500">
                                    Peso deste critério na avaliação final
                                </p>
                            </div>

                            {/* Ordem */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="ordem">
                                    Ordem
                                </label>
                                <input
                                    type="number"
                                    id="ordem"
                                    name="ordem"
                                    value={formData.ordem}
                                    onChange={handleChange}
                                    placeholder="1, 2, 3..."
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                />
                                <p className="mt-1 text-xs text-gray-500">
                                    Ordem de apresentação
                                </p>
                            </div>
                        </div>

                        {/* Required Fields Notice */}
                        <div className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded-r mb-6">
                            <div className="flex items-center">
                                <svg className="w-5 h-5 text-blue-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <p className="text-sm text-blue-700">
                                    Os campos marcados com * são obrigatórios
                                </p>
                            </div>
                        </div>
                    </form>
                </div>

                {/* Footer Actions */}
                <div className="bg-gray-50 px-6 py-4 flex items-center justify-end space-x-3 border-t border-gray-200">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors font-medium"
                        disabled={saving}
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        form="criterion-form"
                        disabled={saving}
                        className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center"
                    >
                        {saving ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                A guardar...
                            </>
                        ) : (
                            <>
                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                {criterion ? 'Atualizar' : 'Criar Critério'}
                            </>
                        )}
                    </button>
                </div>
            </div>

            <style jsx>{`
                @keyframes fade-in {
                    from {
                        opacity: 0;
                        transform: translateY(-20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                .animate-fade-in {
                    animation: fade-in 0.3s ease-out;
                }
            `}</style>
        </div>
    );
};

export default CriterionForm;
