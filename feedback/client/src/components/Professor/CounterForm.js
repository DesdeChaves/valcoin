import React, { useState, useEffect } from 'react';
import { fetchProfessorDossiers } from '../../utils/api';
import { X, Save, Plus, Trash2, AlertCircle, Target, Settings, Palette, Clock } from 'lucide-react';

const CounterForm = ({ isOpen, onClose, onSave, counter, professorId }) => {
    const [formData, setFormData] = useState({
        shortname: '',
        descritor: '',
        tipo: 'atitudinal',
        incremento: 1,
        dossie_id: '',
        cor: '#000000',
        icone: '',
        periodo_inativacao_segundos: 0,
        modelo_calibracao: 'nenhum',
        parametros_calibracao: JSON.stringify({}),
        modelo_esquecimento: 'nenhum',
        parametros_esquecimento: JSON.stringify({}),
        ativo: true,
        escala: 20,
    });
    const [dossiers, setDossiers] = useState([]);
    const [loadingData, setLoadingData] = useState(true);
    const [errorData, setErrorData] = useState(null);
    const [calibrationPoints, setCalibrationPoints] = useState([]);
    const [exponentialParams, setExponentialParams] = useState({ a: 1, b: 0.1 });
    const [logisticParams, setLogisticParams] = useState({ L: 20, k: 0.5, x0: 10 });

    const inactivityOptions = [
        { label: 'Sem inativação', value: 0 },
        { label: '5 segundos', value: 5 },
        { label: '50 minutos', value: 50 * 60 },
        { label: '100 minutos', value: 100 * 60 },
        { label: '1 dia', value: 1 * 24 * 60 * 60 },
        { label: '5 dias', value: 5 * 24 * 60 * 60 },
        { label: '30 dias', value: 30 * 24 * 60 * 60 },
        { label: '90 dias', value: 90 * 24 * 60 * 60 },
        { label: '120 dias', value: 120 * 24 * 60 * 60 },
    ];

    const calibrationModels = [
        { label: 'Nenhum', value: 'nenhum' },
        { label: 'Linear', value: 'linear' },
        { label: 'Exponencial', value: 'exponencial' },
        { label: 'Logístico', value: 'logistico' },
    ];

    const forgettingModels = [
        { label: 'Nenhum', value: 'nenhum' },
        { label: 'Meia-Vida', value: 'meia_vida' },
        { label: 'Sigmoidal', value: 'sigmoidal' },
    ];

    // Fetch dossiers when professorId changes
    useEffect(() => {
        if (professorId) {
            const fetchDossiersData = async () => {
                try {
                    const response = await fetchProfessorDossiers(professorId, false);
                    const allDossiers = response.flatMap(discipline => discipline.dossiers);
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

    // Populate form data when editing an existing counter
    useEffect(() => {
        if (counter) {
            setFormData({
                shortname: counter.shortname || '',
                descritor: counter.descritor || '',
                tipo: counter.tipo || 'atitudinal',
                incremento: counter.incremento || 1,
                dossie_id: counter.dossie_id || '',
                cor: counter.cor || '#000000',
                icone: counter.icone || '',
                periodo_inativacao_segundos: counter.periodo_inativacao_segundos || 0,
                modelo_calibracao: counter.modelo_calibracao || 'nenhum',
                parametros_calibracao: JSON.stringify(counter.parametros_calibracao || {}),
                modelo_esquecimento: counter.modelo_esquecimento || 'nenhum',
                parametros_esquecimento: JSON.stringify(counter.parametros_esquecimento || {}),
                ativo: counter.ativo !== undefined ? counter.ativo : true,
                escala: counter.escala || 20,
            });

            if (counter.modelo_calibracao === 'linear' && counter.parametros_calibracao && counter.parametros_calibracao.points) {
                setCalibrationPoints(counter.parametros_calibracao.points);
            } else if (counter.modelo_calibracao === 'exponencial' && counter.parametros_calibracao) {
                setExponentialParams(counter.parametros_calibracao);
            } else if (counter.modelo_calibracao === 'logistico' && counter.parametros_calibracao) {
                setLogisticParams(counter.parametros_calibracao);
            } else {
                setCalibrationPoints([]);
            }
        } else {
            setFormData({
                shortname: '',
                descritor: '',
                tipo: 'atitudinal',
                incremento: 1,
                dossie_id: '',
                cor: '#000000',
                icone: '',
                periodo_inativacao_segundos: 0,
                modelo_calibracao: 'nenhum',
                parametros_calibracao: JSON.stringify({}),
                modelo_esquecimento: 'nenhum',
                parametros_esquecimento: JSON.stringify({}),
                ativo: true,
                escala: 20,
            });
        }
    }, [counter]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData((prevData) => {
            const newFormData = {
                ...prevData,
                [name]: type === 'checkbox' ? checked : value,
            };

            // Handle changes to modelo_calibracao
            if (name === 'modelo_calibracao') {
                setCalibrationPoints([]);
                setExponentialParams({ a: 1, b: 0.1 });
                setLogisticParams({ L: newFormData.escala, k: 0.5, x0: 10 });
                newFormData.parametros_calibracao = JSON.stringify({});

                if (value === 'linear') {
                    setCalibrationPoints([{ raw: '', calibrated: '' }]);
                } 
            }
            return newFormData;
        });
    };

    const handleJsonChange = (e) => {
        const { name, value } = e.target;
        try {
            JSON.parse(value);
            setFormData((prevData) => ({
                ...prevData,
                [name]: value,
            }));
        } catch (error) {
            console.error("Invalid JSON input:", error);
            setFormData((prevData) => ({
                ...prevData,
                [name]: value,
            }));
        }
    };

    const handleAddCalibrationPoint = () => {
        setCalibrationPoints([...calibrationPoints, { raw: '', calibrated: '' }]);
    };

    const handleRemoveCalibrationPoint = (index) => {
        const newPoints = calibrationPoints.filter((_, i) => i !== index);
        setCalibrationPoints(newPoints);
    };

    const handleCalibrationPointChange = (index, field, value) => {
        const newPoints = calibrationPoints.map((point, i) => {
            if (i === index) {
                return { ...point, [field]: parseFloat(value) };
            }
            return point;
        });
        setCalibrationPoints(newPoints);
    };

    const handleExponentialParamChange = (field, value) => {
        setExponentialParams(prev => ({ ...prev, [field]: parseFloat(value) }));
    };

    const handleLogisticParamChange = (field, value) => {
        setLogisticParams(prev => ({ ...prev, [field]: parseFloat(value) }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const dataToSave = { ...formData };
        const escala = parseInt(dataToSave.escala, 10);

        if (!dataToSave.descritor.trim()) {
            alert("O descritor é obrigatório.");
            return;
        }

        // Handle calibration parameters based on the selected model
        if (dataToSave.modelo_calibracao === 'linear') {
            if (calibrationPoints.length < 2) {
                alert("Para calibração linear, são necessários pelo menos 2 pontos.");
                return;
            }
            const invalidPoints = calibrationPoints.some(p => p.raw === '' || p.calibrated === '' || isNaN(p.raw) || isNaN(p.calibrated));
            if (invalidPoints) {
                alert("Por favor, preencha todos os valores de pontos de calibração com números válidos.");
                return;
            }
            const outOfScalePoints = calibrationPoints.filter(p => p.calibrated > escala);
            if (outOfScalePoints.length > 0) {
                alert(`Os seguintes pontos calibrados excedem a escala de ${escala}: ${outOfScalePoints.map(p => p.calibrated).join(', ')}`)
                return;
            }
            dataToSave.parametros_calibracao = JSON.stringify({ points: calibrationPoints });
        } else if (dataToSave.modelo_calibracao === 'exponencial') {
            if (isNaN(exponentialParams.a) || isNaN(exponentialParams.b)) {
                alert("Por favor, insira valores numéricos válidos para os parâmetros exponenciais.");
                return;
            }
            const testValue = exponentialParams.a * Math.exp(exponentialParams.b * 100);
            if (testValue > escala * 1.5) {
                alert(`A função exponencial cresce muito rápido. Com os parâmetros atuais, um valor bruto de 100 resultaria em ${testValue.toFixed(2)}, que excede a escala de ${escala}. Tente valores menores para 'b'.`);
                return;
            }
            dataToSave.parametros_calibracao = JSON.stringify(exponentialParams);
        } else if (dataToSave.modelo_calibracao === 'logistico') {
            if (isNaN(logisticParams.L) || isNaN(logisticParams.k) || isNaN(logisticParams.x0)) {
                alert("Por favor, insira valores numéricos válidos para os parâmetros logísticos.");
                return;
            }
            if (logisticParams.L > escala) {
                alert(`O valor máximo (L) da função logística não pode exceder a escala de ${escala}.`);
                return;
            }
            dataToSave.parametros_calibracao = JSON.stringify(logisticParams);
        } else {
            // This 'else' block handles 'nenhum' and any other custom JSON input
            try {
                if (dataToSave.modelo_calibracao === 'nenhum') {
                    dataToSave.parametros_calibracao = JSON.stringify({});
                } else {
                    dataToSave.parametros_calibracao = JSON.parse(formData.parametros_calibracao);
                }
            } catch (error) {
                console.error("Invalid JSON input for calibration parameters:", error);
                alert("Parâmetros de calibração inválidos. Por favor, insira um JSON válido.");
                return;
            }
        }

        // Refine forgetting parameters handling
        try {
            if (dataToSave.modelo_esquecimento === 'nenhum') {
                dataToSave.parametros_esquecimento = JSON.stringify({});
            } else {
                dataToSave.parametros_esquecimento = JSON.parse(formData.parametros_esquecimento);
            }
        } catch (error) {
            console.error("Error parsing forgetting parameters JSON:", error);
            alert("Parâmetros de esquecimento inválidos. Por favor, insira um JSON válido.");
            return;
        }
        onSave(dataToSave);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gradient-to-br from-slate-900/95 via-blue-900/95 to-slate-900/95 backdrop-blur-sm overflow-y-auto h-full w-full flex justify-center items-start py-8 px-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden border border-blue-200/20 max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 px-8 py-6 relative overflow-hidden sticky top-0 z-10">
                    <div className="absolute inset-0 opacity-10">
                        <div className="absolute inset-0" style={{
                            backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,.05) 10px, rgba(255,255,255,.05) 20px)`
                        }}></div>
                    </div>
                    <div className="relative flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl">
                                <Settings className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-white">
                                    {counter ? 'Editar Contador' : 'Novo Contador'}
                                </h2>
                                <p className="text-blue-100 text-sm mt-1">Configure os parâmetros de avaliação</p>
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
                        {/* Dossiê - Destacado */}
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
                                    value={formData.dossie_id}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 bg-white border-2 border-blue-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                                    required
                                    disabled={!!counter}
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

                        {/* Nome e Tipo */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-gray-700 text-sm font-semibold mb-2" htmlFor="shortname">
                                    Nome Curto *
                                </label>
                                <input
                                    type="text"
                                    id="shortname"
                                    name="shortname"
                                    value={formData.shortname}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:bg-white transition-all"
                                    placeholder="Ex: Participação"
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
                                    <option value="atitudinal">Atitudinal</option>
                                    <option value="procedimental">Procedimental</option>
                                    <option value="conceitual">Conceitual</option>
                                </select>
                            </div>
                        </div>

                        {/* Descritor */}
                        <div>
                            <label className="block text-gray-700 text-sm font-semibold mb-2" htmlFor="descritor">
                                Descritor *
                            </label>
                            <textarea
                                id="descritor"
                                name="descritor"
                                value={formData.descritor}
                                onChange={handleChange}
                                rows="3"
                                className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:bg-white transition-all resize-none"
                                placeholder="Descreva o contador..."
                                required
                            />
                        </div>

                        {/* Incremento, Escala e Inativação */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label className="block text-gray-700 text-sm font-semibold mb-2" htmlFor="incremento">
                                    Incremento
                                </label>
                                <input
                                    type="number"
                                    id="incremento"
                                    name="incremento"
                                    value={formData.incremento}
                                    onChange={handleChange}
                                    step="0.01"
                                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:bg-white transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-gray-700 text-sm font-semibold mb-2" htmlFor="escala">
                                    Escala
                                </label>
                                <select
                                    id="escala"
                                    name="escala"
                                    value={formData.escala}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:bg-white transition-all"
                                >
                                    <option value="5">0-5</option>
                                    <option value="20">0-20</option>
                                    <option value="100">0-100</option>
                                </select>
                            </div>

                            <div>
                                <label className="flex items-center gap-2 text-gray-700 text-sm font-semibold mb-2" htmlFor="periodo_inativacao_segundos">
                                    <Clock className="w-4 h-4" />
                                    Inativação
                                </label>
                                <select
                                    id="periodo_inativacao_segundos"
                                    name="periodo_inativacao_segundos"
                                    value={formData.periodo_inativacao_segundos}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:bg-white transition-all"
                                >
                                    {inactivityOptions.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Cor e Ícone */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="flex items-center gap-2 text-gray-700 text-sm font-semibold mb-2" htmlFor="cor">
                                    <Palette className="w-4 h-4" />
                                    Cor
                                </label>
                                <input
                                    type="color"
                                    id="cor"
                                    name="cor"
                                    value={formData.cor}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:bg-white transition-all h-12"
                                />
                            </div>

                            <div>
                                <label className="block text-gray-700 text-sm font-semibold mb-2" htmlFor="icone">
                                    Ícone
                                </label>
                                <input
                                    type="text"
                                    id="icone"
                                    name="icone"
                                    value={formData.icone}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:bg-white transition-all"
                                    placeholder="Ex: 📊"
                                />
                            </div>
                        </div>

                        {/* Modelo de Calibração */}
                        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-5 rounded-xl border border-indigo-200">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                <Settings className="w-5 h-5 text-indigo-600" />
                                Calibração
                            </h3>
                            
                            <div className="mb-4">
                                <label className="block text-gray-700 text-sm font-semibold mb-2" htmlFor="modelo_calibracao">
                                    Modelo de Calibração
                                </label>
                                <select
                                    id="modelo_calibracao"
                                    name="modelo_calibracao"
                                    value={formData.modelo_calibracao}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 bg-white border-2 border-indigo-200 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
                                >
                                    {calibrationModels.map((model) => (
                                        <option key={model.value} value={model.value}>
                                            {model.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Linear Calibration Points */}
                            {formData.modelo_calibracao === 'linear' && (
                                <div className="bg-white p-4 rounded-lg border border-indigo-200">
                                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Pontos de Calibração Linear</h4>
                                    <div className="space-y-2">
                                        {calibrationPoints.map((point, index) => (
                                            <div key={index} className="flex gap-2">
                                                <input
                                                    type="number"
                                                    placeholder="Valor Bruto"
                                                    value={point.raw}
                                                    onChange={(e) => handleCalibrationPointChange(index, 'raw', e.target.value)}
                                                    className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200"
                                                />
                                                <input
                                                    type="number"
                                                    placeholder="Valor Calibrado"
                                                    value={point.calibrated}
                                                    onChange={(e) => handleCalibrationPointChange(index, 'calibrated', e.target.value)}
                                                    className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveCalibrationPoint(index)}
                                                    className="px-3 py-2 bg-red-100 text-red-600 hover:bg-red-200 rounded-lg transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleAddCalibrationPoint}
                                        className="mt-3 w-full px-4 py-2 bg-green-100 text-green-700 hover:bg-green-200 rounded-lg transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Adicionar Ponto
                                    </button>
                                </div>
                            )}

                            {/* Exponential Calibration */}
                            {formData.modelo_calibracao === 'exponencial' && (
                                <div className="bg-white p-4 rounded-lg border border-indigo-200">
                                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Parâmetros Exponenciais</h4>
                                    <p className="text-xs text-gray-500 mb-3">Fórmula: a * exp(b * contagem)</p>
                                    <div className="grid grid-cols-2 gap-3">
                                        <input
                                            type="number"
                                            placeholder="x0 (Ponto Médio)"
                                            value={logisticParams.x0}
                                            onChange={(e) => handleLogisticParamChange('x0', e.target.value)}
                                            className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* JSON Parameters - Hidden if linear calibration */}
                            {formData.modelo_calibracao !== 'linear' && formData.modelo_calibracao !== 'exponencial' && formData.modelo_calibracao !== 'logistico' && (
                                <div>
                                    <label className="block text-gray-700 text-sm font-semibold mb-2" htmlFor="parametros_calibracao">
                                        Parâmetros de Calibração (JSON)
                                    </label>
                                    <textarea
                                        id="parametros_calibracao"
                                        name="parametros_calibracao"
                                        value={formData.parametros_calibracao}
                                        onChange={handleJsonChange}
                                        rows="3"
                                        className="w-full px-4 py-3 bg-white border-2 border-indigo-200 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all font-mono text-sm"
                                        placeholder='{"key": "value"}'
                                    />
                                </div>
                            )}
                        </div>

                        {/* Modelo de Esquecimento */}
                        <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-5 rounded-xl border border-purple-200">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                <Clock className="w-5 h-5 text-purple-600" />
                                Esquecimento
                            </h3>
                            
                            <div className="mb-4">
                                <label className="block text-gray-700 text-sm font-semibold mb-2" htmlFor="modelo_esquecimento">
                                    Modelo de Esquecimento
                                </label>
                                <select
                                    id="modelo_esquecimento"
                                    name="modelo_esquecimento"
                                    value={formData.modelo_esquecimento}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 bg-white border-2 border-purple-200 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all"
                                >
                                    {forgettingModels.map((model) => (
                                        <option key={model.value} value={model.value}>
                                            {model.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-gray-700 text-sm font-semibold mb-2" htmlFor="parametros_esquecimento">
                                    Parâmetros de Esquecimento (JSON)
                                </label>
                                <textarea
                                    id="parametros_esquecimento"
                                    name="parametros_esquecimento"
                                    value={formData.parametros_esquecimento}
                                    onChange={handleJsonChange}
                                    rows="3"
                                    className="w-full px-4 py-3 bg-white border-2 border-purple-200 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all font-mono text-sm"
                                    placeholder='{"key": "value"}'
                                />
                            </div>
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
                                        Contador Ativo
                                    </span>
                                    <p className="text-gray-600 text-sm">
                                        Desmarque para desativar este contador
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
                            Salvar Contador
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
export default CounterForm;
