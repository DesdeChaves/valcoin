/**
 * InstrumentForm.js
 * 
 * Formulário para criar ou editar um Instrumento de Avaliação.
 * 
 * Funcionalidades:
 * - Carrega dossiês do professor
 * - Carrega critérios automaticamente ao selecionar um dossiê
 * - Preenche dossiê + critério ao editar um instrumento
 * - Envia `dossie_id` no `onSave`
 * - Tratamento completo de loading, erro e edição
 * 
 * API:
 * - fetchProfessorDossiers(professorId, false) → Array de disciplinas com dossiês
 * - fetchCriteriaByDossier(dossierId) → { dossie: {...}, criterios: [...] }
 * 
 * Props:
 * @param {boolean} isOpen - Controla visibilidade do modal
 * @param {function} onClose - Fecha o modal
 * @param {function} onSave - Recebe os dados do formulário
 * @param {object} instrument - Dados do instrumento (se edição)
 * @param {string} professorId - ID do professor logado
 */

import React, { useState, useEffect } from 'react';
import { X, Save, FileText, Calendar, Target, CheckSquare, AlertCircle } from 'lucide-react';
import { fetchProfessorDossiers, fetchCriteriaByDossier } from '../../utils/api';

// Estado inicial do formulário (evita duplicação)
const initialFormState = {
    nome: '',
    descricao: '',
    tipo: 'outro',
    ponderacao: '',
    criterio_id: '',
    data_avaliacao: '',
    cotacao_maxima: 20,
    observacoes: '',
    ativo: true,
};

const InstrumentForm = ({ isOpen, onClose, onSave, instrument, professorId }) => {
    // =================================================================
    // ESTADOS
    // =================================================================
    const [formData, setFormData] = useState(initialFormState);
    const [dossiers, setDossiers] = useState([]);           // Todos os dossiês do professor
    const [criteria, setCriteria] = useState([]);           // Critérios do dossiê selecionado
    const [selectedDossierId, setSelectedDossierId] = useState(''); // ID do dossiê selecionado
    const [loadingDossiers, setLoadingDossiers] = useState(true);
    const [loadingCriteria, setLoadingCriteria] = useState(false);
    const [error, setError] = useState(null);

    // =================================================================
    // 1. CARREGAR DOSSIÊS DO PROFESSOR
    // =================================================================
    useEffect(() => {
        if (!professorId) {
            setLoadingDossiers(false);
            return;
        }

        const fetchDossiersData = async () => {
            try {
                setLoadingDossiers(true);
                setError(null);

                const response = await fetchProfessorDossiers(professorId, false);
                console.log('[InstrumentForm] fetchProfessorDossiers response:', response);

                // Estrutura esperada: Array de disciplinas → cada uma com .dossiers
                const allDossiers = Array.isArray(response)
                    ? response.flatMap(discipline => discipline.dossiers || [])
                    : [];

                setDossiers(allDossiers);
            } catch (err) {
                console.error('[InstrumentForm] Error fetching dossiers:', err);
                setError('Erro ao carregar dossiês. Tente novamente.');
            } finally {
                setLoadingDossiers(false);
            }
        };

        fetchDossiersData();
    }, [professorId]);

    // =================================================================
    // 2. CARREGAR CRITÉRIOS QUANDO MUDA O DOSSIÊ SELECIONADO
    // =================================================================
    useEffect(() => {
        if (!selectedDossierId) {
            setCriteria([]);
            setFormData(prev => ({ ...prev, criterio_id: '' }));
            return;
        }

        const fetchCriteria = async () => {
            try {
                setLoadingCriteria(true);
                setError(null);

                const response = await fetchCriteriaByDossier(selectedDossierId);
                console.log('[InstrumentForm] fetchCriteriaByDossier response:', response);

                // API retorna: { dossie: {...}, criterios: [...] }
                const criterios = Array.isArray(response.criterios) ? response.criterios : [];
                setCriteria(criterios);

                // Se o critério atual não existe mais neste dossiê, limpa
                if (formData.criterio_id && !criterios.some(c => c.id === formData.criterio_id)) {
                    setFormData(prev => ({ ...prev, criterio_id: '' }));
                }
            } catch (err) {
                console.error('[InstrumentForm] Error fetching criteria:', err);
                setError('Erro ao carregar critérios.');
                setCriteria([]);
            } finally {
                setLoadingCriteria(false);
            }
        };

        fetchCriteria();
    }, [selectedDossierId]);

    // =================================================================
    // 3. PREENCHER FORMULÁRIO AO EDITAR INSTRUMENTO
    // =================================================================
    useEffect(() => {
        if (!instrument) {
            // Novo instrumento
            setFormData(initialFormState);
            setSelectedDossierId('');
            return;
        }

        console.log('[InstrumentForm] Editando instrumento:', instrument);

        // Preenche todos os campos
        const newFormData = { ...initialFormState };
        Object.keys(newFormData).forEach(key => {
            if (instrument[key] !== undefined && instrument[key] !== null) {
                newFormData[key] = instrument[key];
            }
        });

        // Formata data
        if (instrument.data_avaliacao) {
            newFormData.data_avaliacao = new Date(instrument.data_avaliacao)
                .toISOString()
                .split('T')[0];
        }

        // FORÇA criterio_id como string (evita bug de tipo)
        newFormData.criterio_id = String(instrument.criterio_id || '');

        setFormData(newFormData);

        // Define dossiê automaticamente (se disponível)
        if (instrument.dossie_id && dossiers.length > 0) {
            const exists = dossiers.some(d => d.id === instrument.dossie_id);
            if (exists && selectedDossierId !== instrument.dossie_id) {
                console.log('[InstrumentForm] Definindo dossiê via instrument.dossie_id:', instrument.dossie_id);
                setSelectedDossierId(instrument.dossie_id);
            }
        }
    }, [instrument, dossiers]);

    // =================================================================
    // HANDLERS
    // =================================================================
    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
    };

    const handleDossierChange = (e) => {
        const value = e.target.value;
        console.log('[InstrumentForm] Dossiê selecionado:', value);
        setSelectedDossierId(value);
        setFormData(prev => ({
            ...prev,
            criterio_id: '',
            dossie_id: value,
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        console.log('[InstrumentForm] Salvando instrumento:', { ...formData, dossie_id: selectedDossierId });

        onSave({
            ...formData,
            dossie_id: selectedDossierId,
            criterio_id: formData.criterio_id || null,
        });
    };

    // =================================================================
    // RENDER (não renderiza se fechado)
    // =================================================================
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gradient-to-br from-slate-900/95 via-blue-900/95 to-slate-900/95 backdrop-blur-sm overflow-y-auto h-full w-full flex justify-center items-start py-8 px-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden border border-blue-200/20">
                {/* HEADER */}
                <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 px-8 py-6 relative overflow-hidden">
                    <div className="absolute inset-0 opacity-10">
                        <div
                            className="absolute inset-0"
                            style={{
                                backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,.05) 10px, rgba(255,255,255,.05) 20px)`
                            }}
                        ></div>
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
                            aria-label="Fechar"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* FORMULÁRIO */}
                <form onSubmit={handleSubmit} className="p-8">
                    <div className="space-y-6">

                        {/* DOSSIÊ + CRITÉRIO */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                            {/* DOSSIÊ */}
                            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-5 rounded-xl border border-blue-200">
                                <label className="flex items-center gap-2 text-blue-900 text-sm font-semibold mb-3" htmlFor="dossie_id">
                                    <Target className="w-4 h-4" />
                                    Dossiê *
                                </label>
                                {error && !loadingDossiers ? (
                                    <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg border border-red-200">
                                        <AlertCircle className="w-4 h-4" />
                                        {error}
                                    </div>
                                ) : loadingDossiers ? (
                                    <div className="flex items-center gap-2 text-blue-600 text-sm bg-blue-50 p-3 rounded-lg border border-blue-200">
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                        Carregando dossiês...
                                    </div>
                                ) : dossiers.length === 0 ? (
                                    <div className="text-gray-500 text-sm bg-gray-50 p-3 rounded-lg border border-gray-200">
                                        Nenhum dossiê disponível
                                    </div>
                                ) : (
                                    <select
                                        id="dossie_id"
                                        value={selectedDossierId}
                                        onChange={handleDossierChange}
                                        className="w-full px-4 py-3 bg-white border-2 border-blue-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all appearance-none"
                                        required
                                    >
                                        <option value="">Selecione um dossiê</option>
                                        {dossiers.map(d => (
                                            <option key={d.id} value={d.id}>
                                                {d.nome} - {d.subject_name || d.subject?.name}
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>

                            {/* CRITÉRIO */}
                            <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-5 rounded-xl border border-indigo-200">
                                <label className="flex items-center gap-2 text-indigo-900 text-sm font-semibold mb-3" htmlFor="criterio_id">
                                    <CheckSquare className="w-4 h-4" />
                                    Critério *
                                </label>
                                {!selectedDossierId ? (
                                    <div className="text-gray-500 text-sm bg-gray-50 p-3 rounded-lg border border-gray-200">
                                        Selecione um dossiê primeiro
                                    </div>
                                ) : loadingCriteria ? (
                                    <div className="flex items-center gap-2 text-indigo-600 text-sm bg-indigo-50 p-3 rounded-lg border border-indigo-200">
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
                                        Carregando critérios...
                                    </div>
                                ) : criteria.length === 0 ? (
                                    <div className="text-gray-500 text-sm bg-gray-50 p-3 rounded-lg border border-gray-200">
                                        Nenhum critério disponível
                                    </div>
                                ) : (
                                    <select
                                        id="criterio_id"
                                        name="criterio_id"
                                        value={formData.criterio_id}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 bg-white border-2 border-indigo-200 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all appearance-none"
                                        required
                                    >
                                        <option value="">Selecione um critério</option>
                                        {criteria.map(c => (
                                            <option key={c.id} value={String(c.id)}>
                                                {c.nome} ({c.ponderacao}%)
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>
                        </div>

                        {/* NOME + TIPO */}
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
                                    placeholder="Ex: Teste 1"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-gray-700 text-sm font-semibold mb-2" htmlFor="tipo">
                                    Tipo de Instrumento *
                                </label>
                                <select
                                    id="tipo"
                                    name="tipo"
                                    value={formData.tipo}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:bg-white transition-all appearance-none"
                                    required
                                >
                                    <option value="outro">Outro</option>
                                    <option value="teste">Teste</option>
                                    <option value="ficha_trabalho">Ficha de Trabalho</option>
                                    <option value="projeto">Projeto</option>
                                    <option value="apresentacao">Apresentação</option>
                                </select>
                            </div>
                        </div>

                        {/* DESCRIÇÃO */}
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
                            />
                        </div>

                        {/* PONDERAÇÃO + DATA + COTAÇÃO */}
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
                                    min="0"
                                    max="100"
                                    required
                                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:bg-white transition-all"
                                    placeholder="0-100"
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
                                    min="1"
                                    required
                                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:bg-white transition-all"
                                />
                            </div>
                        </div>

                        {/* OBSERVAÇÕES */}
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
                            />
                        </div>

                        {/* STATUS ATIVO */}
                        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-5">
                            <label className="flex items-center gap-3 cursor-pointer group">
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

                    {/* BOTÕES DE AÇÃO */}
                    <div className="flex items-center justify-between gap-4 mt-8 pt-6 border-t-2 border-gray-100">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg transition-all duration-200 border-2 border-gray-200"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loadingDossiers || loadingCriteria}
                            className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-lg transition-all duration-200 shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            <Save className="w-4 h-4" />
                            {loadingDossiers || loadingCriteria ? 'Salvando...' : 'Salvar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default InstrumentForm;
