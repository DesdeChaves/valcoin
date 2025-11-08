import React, { useState, useEffect } from 'react';
import { X, Save, FileText, Calendar, Target, CheckSquare, AlertCircle } from 'lucide-react';
import { fetchProfessorDossiers, fetchCriteriaByDossier } from '../../utils/api';

const InstrumentForm = ({ isOpen, onClose, onSave, instrument, professorId }) => {
    const [formData, setFormData] = useState({
        nome: '',
        descricao: '',
        tipo: 'outro',
        ponderacao: '',
        criterio_id: '',
        data_avaliacao: '',
        cotacao_maxima: 20,
        observacoes: '',
        ativo: true,
    });
    const [dossiers, setDossiers] = useState([]);
    const [criteria, setCriteria] = useState([]);
    const [selectedDossierId, setSelectedDossierId] = useState('');
    const [loadingData, setLoadingData] = useState(true);
    const [errorData, setErrorData] = useState(null);

    // Fetch dossiers when professorId changes
    useEffect(() => {
        if (professorId) {
            const fetchDossiersData = async () => {
                try {
                    const response = await fetchProfessorDossiers(professorId, false); // Fetch only active dossiers
                    // Flatten the structure: response.data is an array of disciplines, each with a 'dossiers' array
                    const allDossiers = response.data.flatMap(discipline => discipline.dossiers);
                    setDossiers(allDossiers);
                    setLoadingData(false);
                } catch (err) {
                    setErrorData('Error fetching dossiers');
                    setLoadingData(false);
                    console.error('Error fetching dossiers:', err);
                }
            };
            fetchDossiersData();
        }
    }, [professorId]);

    // Fetch criteria when selectedDossierId changes
    useEffect(() => {
        if (selectedDossierId) {
            const fetchCriteria = async () => {
                try {
                    const response = await fetchCriteriaByDossier(selectedDossierId);
                    setCriteria(response.data.criterios);
                } catch (err) {
                    setErrorData('Error fetching criteria');
                    console.error('Error fetching criteria:', err);
                }
            };
            fetchCriteria();
        } else {
            setCriteria([]);
        }
    }, [selectedDossierId]);

    // Populate form data when editing an existing instrument
    useEffect(() => {
        if (instrument) {
            setFormData({
                nome: instrument.nome || '',
                descricao: instrument.descricao || '',
                tipo: instrument.tipo || 'outro',
                ponderacao: instrument.ponderacao || '',
                criterio_id: instrument.criterio_id || '',
                data_avaliacao: instrument.data_avaliacao ? new Date(instrument.data_avaliacao).toISOString().split('T')[0] : '',
                cotacao_maxima: instrument.cotacao_maxima || 20,
                observacoes: instrument.observacoes || '',
                ativo: instrument.ativo !== undefined ? instrument.ativo : true,
            });
            if (instrument.criterio_id && criteria.length > 0) {
                const foundCriterion = criteria.find(c => c.id === instrument.criterio_id);
                if (foundCriterion) {
                    setSelectedDossierId(foundCriterion.dossie_id);
                }
            }
        } else {
            setFormData({
                nome: '',
                descricao: '',
                tipo: 'outro',
                ponderacao: '',
                criterio_id: '',
                data_avaliacao: '',
                cotacao_maxima: 20,
                observacoes: '',
                ativo: true,
            });
            setSelectedDossierId('');
        }
    }, [instrument]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData((prevData) => ({
            ...prevData,
            [name]: type === 'checkbox' ? checked : value,
        }));
    };

    const handleDossierChange = (e) => {
        const { value } = e.target;
        setSelectedDossierId(value);
        setFormData((prevData) => ({
            ...prevData,
            criterio_id: '',
            dossie_id: value,
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gradient-to-br from-slate-900/95 via-blue-900/95 to-slate-900/95 backdrop-blur-sm overflow-y-auto h-full w-full flex justify-center items-start py-8 px-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden border border-blue-200/20">
                {/* Header com gradiente ODS 17 */}
                <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 px-8 py-6 relative overflow-hidden">
                    <div className="absolute inset-0 opacity-10">
                        <div className="absolute inset-0" style={{
                            backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,.05) 10px, rgba(255,255,255,.05) 20px)`
                        }}></div>
                    </div>
                    <div className="relative flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl">
                                <FileText className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-white">
                                    {instrument ? 'Editar Instrumento' : 'Novo Instrumento'}
                                </h2>
                                <p className="text-blue-100 text-sm mt-1">Avaliação Pedagógica</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            type="button"
                            className="bg-white/10 hover:bg-white/20 backdrop-blur-sm p-2 rounded-lg transition-all duration-200 text-white"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Form Content */}
                <div className="p-8">
                    <div className="space-y-6">
                        {/* Dossiê e Critério - Cards destacados */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-5 rounded-xl border border-blue-200">
                                <label className="flex items-center gap-2 text-blue-900 text-sm font-semibold mb-3" htmlFor="dossie_id">
                                    <Target className="w-4 h-4" />
                                    Dossiê *
                                </label>
                                {errorData ? (
                                    <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg border border-red-200">
                                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                        <span>{errorData}</span>
                                    </div>
                                ) : (
                                    <select
                                        id="dossie_id"
                                        name="dossie_id"
                                        value={selectedDossierId}
                                        onChange={handleDossierChange}
                                        className="w-full px-4 py-3 bg-white border-2 border-blue-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                                        required
                                        disabled={!!instrument}
                                    >
                                        <option value="">Selecione um dossiê</option>
                                        {dossiers.map((dossier) => (
                                            <option key={dossier.id} value={dossier.id}>
                                                {dossier.nome}
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>

                            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-5 rounded-xl border border-blue-200">
                                <label className="flex items-center gap-2 text-blue-900 text-sm font-semibold mb-3" htmlFor="criterio_id">
                                    <CheckSquare className="w-4 h-4" />
                                    Critério *
                                </label>
                                {errorData ? (
                                    <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg border border-red-200">
                                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                        <span>{errorData}</span>
                                    </div>
                                ) : (
                                    <select
                                        id="criterio_id"
                                        name="criterio_id"
                                        value={formData.criterio_id}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 bg-white border-2 border-blue-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                                        required
                                        disabled={!!instrument || !selectedDossierId}
                                    >
                                        <option value="">Selecione um critério</option>
                                        {criteria.map((criterion) => (
                                            <option key={criterion.id} value={criterion.id}>
                                                {criterion.nome}
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>
                        </div>

                        {/* Nome e Tipo */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-gray-700 text-sm font-semibold mb-2" htmlFor="nome">
                                    Nome do Instrumento *
                                </label>
                                <input
                                    type="text"
                                    id="nome"
                                    name="nome"
                                    value={formData.nome}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:bg-white transition-all"
                                    placeholder="Ex: Prova Bimestral"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-gray-700 text-sm font-semibold mb-2" htmlFor="tipo">
                                    Tipo
                                </label>
                                <select
                                    id="tipo"
                                    name="tipo"
                                    value={formData.tipo}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:bg-white transition-all"
                                >
                                    <option value="teste">Prova</option>
                                    <option value="trabalho">Trabalho</option>
                                    <option value="projeto">Projeto</option>
                                    <option value="apresentacao">Apresentação</option>
                                    <option value="participacao">Participação</option>
                                    <option value="outro">Outro</option>
                                </select>
                            </div>
                        </div>

                        {/* Descrição */}
                        <div>
                            <label className="block text-gray-700 text-sm font-semibold mb-2" htmlFor="descricao">
                                Descrição
                            </label>
                            <textarea
                                id="descricao"
                                name="descricao"
                                value={formData.descricao}
                                onChange={handleChange}
                                rows="3"
                                className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:bg-white transition-all resize-none"
                                placeholder="Descreva brevemente o instrumento de avaliação..."
                            ></textarea>
                        </div>

                        {/* Ponderação, Data e Cotação */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label className="block text-gray-700 text-sm font-semibold mb-2" htmlFor="ponderacao">
                                    Ponderação (%) *
                                </label>
                                <input
                                    type="number"
                                    id="ponderacao"
                                    name="ponderacao"
                                    value={formData.ponderacao}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:bg-white transition-all"
                                    placeholder="0-100"
                                    required
                                    min="0"
                                    max="100"
                                />
                            </div>

                            <div>
                                <label className="flex items-center gap-2 text-gray-700 text-sm font-semibold mb-2" htmlFor="data_avaliacao">
                                    <Calendar className="w-4 h-4" />
                                    Data de Avaliação
                                </label>
                                <input
                                    type="date"
                                    id="data_avaliacao"
                                    name="data_avaliacao"
                                    value={formData.data_avaliacao}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:bg-white transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-gray-700 text-sm font-semibold mb-2" htmlFor="cotacao_maxima">
                                    Cotação Máxima *
                                </label>
                                <input
                                    type="number"
                                    id="cotacao_maxima"
                                    name="cotacao_maxima"
                                    value={formData.cotacao_maxima}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:bg-white transition-all"
                                    required
                                    min="1"
                                />
                            </div>
                        </div>

                        {/* Observações */}
                        <div>
                            <label className="block text-gray-700 text-sm font-semibold mb-2" htmlFor="observacoes">
                                Observações
                            </label>
                            <textarea
                                id="observacoes"
                                name="observacoes"
                                value={formData.observacoes}
                                onChange={handleChange}
                                rows="3"
                                className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:bg-white transition-all resize-none"
                                placeholder="Notas adicionais sobre o instrumento..."
                            ></textarea>
                        </div>

                        {/* Status Ativo */}
                        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-5">
                            <label className="flex items-center gap-3 cursor-pointer group" htmlFor="ativo">
                                <input
                                    type="checkbox"
                                    id="ativo"
                                    name="ativo"
                                    checked={formData.ativo}
                                    onChange={handleChange}
                                    className="w-5 h-5 text-blue-600 border-2 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                                />
                                <div>
                                    <span className="text-gray-800 font-semibold group-hover:text-blue-700 transition-colors">
                                        Ativo
                                    </span>
                                    <p className="text-gray-600 text-sm">
                                        Desmarque para desativar este instrumento
                                    </p>
                                </div>
                            </label>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between gap-4 mt-8 pt-6 border-t-2 border-gray-100">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg transition-all duration-200 border-2 border-gray-200"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={handleSubmit}
                            className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-lg transition-all duration-200 shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 flex items-center gap-2"
                        >
                            <Save className="w-4 h-4" />
                            Salvar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InstrumentForm;
