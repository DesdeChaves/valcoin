import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { calculateCalibratedScore } from '../../utils/calibration';
import { fetchCounterDetails, fetchDossierCounters, fetchDossierInstruments, fetchInstrumentGrades, saveBatchGrades } from '../../utils/api';
import { ArrowLeft, BarChart3, Users, TrendingUp, Download, Save, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';

const CounterResultsPage = () => {
    const { counterId } = useParams();
    const navigate = useNavigate();
    const [counter, setCounter] = useState(null);
    const [studentsData, setStudentsData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [dossieId, setDossieId] = useState(null);
    const [instrumentos, setInstrumentos] = useState([]);
    const [selectedInstrumentId, setSelectedInstrumentId] = useState('');
    const [instrumentGrades, setInstrumentGrades] = useState([]);
    const [transferSuccess, setTransferSuccess] = useState(false);

    const professorId = JSON.parse(localStorage.getItem('user'))?.id;

    useEffect(() => {
        const fetchCounterAndResults = async () => {
            try {
                // Fetch counter details
                const counterResponse = await fetchCounterDetails(counterId);
                setCounter(counterResponse);
                const fetchedDossieId = counterResponse.dossie_id;
                setDossieId(fetchedDossieId);

                // Fetch students and their calibrated scores
                const studentsAndCountersResponse = await fetchDossierCounters(fetchedDossieId);

                const filteredStudentsData = studentsAndCountersResponse.map(student => {
                    const targetMomento = student.momentos.find(momento => momento.id === counterId);
                    return {
                        id: student.id,
                        name: student.text,
                        numero: student.numero,
                        rawCount: targetMomento ? targetMomento.contagem : 0,
                        calibratedScore: targetMomento ? calculateCalibratedScore(
                            counterResponse.modelo_calibracao,
                            counterResponse.parametros_calibracao,
                            targetMomento.contagem
                        ) : 0,
                    };
                });
                setStudentsData(filteredStudentsData);
                setLoading(false);

            } catch (err) {
                setError('Error fetching counter results');
                setLoading(false);
                console.error('Error fetching counter results:', err);
            }
        };

        if (professorId && counterId) {
            fetchCounterAndResults();
        } else {
            setError('Professor ID or Counter ID not found.');
            setLoading(false);
        }
    }, [professorId, counterId]);

    // New useEffect to fetch instruments when dossieId is available
    useEffect(() => {
        const fetchInstrumentos = async () => {
            if (!dossieId) return;
            try {
                const response = await fetchDossierInstruments(dossieId);
                setInstrumentos(response);
            } catch (err) {
                console.error('Error fetching instrumentos:', err);
            }
        };
        fetchInstrumentos();
    }, [dossieId]);

    // New useEffect to fetch grades when selectedInstrumentId changes
    useEffect(() => {
        const _fetchInstrumentGrades = async () => {
            if (!selectedInstrumentId) return;
            try {
                const response = await fetchInstrumentGrades(selectedInstrumentId);
                setInstrumentGrades(response);
            } catch (err) {
                console.error('Error fetching instrument grades:', err);
            }
        };
        _fetchInstrumentGrades();
    }, [selectedInstrumentId]);

    const handleInstrumentChange = (e) => {
        setSelectedInstrumentId(e.target.value);
        setTransferSuccess(false);
    };

    const handleTransferGrades = () => {
        if (!counter || !selectedInstrumentId) {
            alert("Selecione um instrumento e certifique-se de que o contador está carregado.");
            return;
        }

        const selectedInstrument = instrumentos.find(inst => inst.id === selectedInstrumentId);
        if (!selectedInstrument) {
            alert("Instrumento selecionado não encontrado.");
            return;
        }

        const counterScale = counter.escala || 100; // Default to 100 if not set
        const instrumentMaxScore = selectedInstrument.cotacao_maxima;

        const updatedGrades = instrumentGrades.map(instrumentGrade => {
            const student = studentsData.find(s => s.id === instrumentGrade.aluno.id);
            if (student) {
                // Perform scale conversion
                const convertedScore = (student.calibratedScore / counterScale) * instrumentMaxScore;
                return {
                    ...instrumentGrade,
                    nota: { ...instrumentGrade.nota, nota: convertedScore }
                };
            }
            return instrumentGrade;
        });
        setInstrumentGrades(updatedGrades);
        setTransferSuccess(true);
    };

    const handleSaveGrades = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            const notasToUpdate = instrumentGrades.map(item => ({
                notaId: item.nota.id,
                nota: item.nota.nota,
                falta: item.nota.falta,
                observacoes: item.nota.observacoes,
            }));

            await saveBatchGrades(selectedInstrumentId, notasToUpdate);
            alert('Notas guardadas com sucesso!');
        } catch (err) {
            console.error('Error saving grades:', err);
            alert('Erro ao guardar notas.');
        }
    };

    // Calculate statistics
    const calculateStats = () => {
        if (studentsData.length === 0) return { avg: 0, max: 0, min: 0 };
        const scores = studentsData.map(s => s.calibratedScore);
        return {
            avg: (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2),
            max: Math.max(...scores).toFixed(2),
            min: Math.min(...scores).toFixed(2)
        };
    };

    const stats = calculateStats();

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Carregando resultados...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 p-6">
                <div className="max-w-7xl mx-auto">
                    <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
                        <div className="flex">
                            <AlertCircle className="w-5 h-5 text-red-500 mr-3" />
                            <div>
                                <p className="font-semibold text-red-800">Erro</p>
                                <p className="text-red-700">{error}</p>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Tentar Novamente
                    </button>
                </div>
            </div>
        );
    }

    if (!counter) {
        return (
            <div className="min-h-screen bg-gray-50 p-6">
                <div className="max-w-7xl mx-auto">
                    <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-r-lg">
                        <div className="flex">
                            <AlertCircle className="w-5 h-5 text-yellow-500 mr-3" />
                            <p className="text-yellow-700">Contador não encontrado.</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <button
                                onClick={() => navigate(-1)}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <ArrowLeft className="w-5 h-5 text-gray-600" />
                            </button>
                            <div>
                                <h1 className="text-2xl font-semibold text-gray-800">
                                    Resultados: {counter.shortname}
                                </h1>
                                <p className="text-sm text-gray-500">
                                    Calibração e transferência de notas
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-6">
                {/* Calibration Info Card */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg p-6 mb-6 text-white">
                    <div className="flex items-start justify-between">
                        <div>
                            <h2 className="text-lg font-semibold mb-2">Configuração de Calibração</h2>
                            <div className="space-y-1">
                                <p className="text-blue-100">
                                    <span className="font-medium">Modelo:</span> {counter.modelo_calibracao}
                                </p>
                                <p className="text-blue-100">
                                    <span className="font-medium">Parâmetros:</span> {JSON.stringify(counter.parametros_calibracao)}
                                </p>
                            </div>
                        </div>
                        <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl">
                            <BarChart3 className="w-8 h-8" />
                        </div>
                    </div>
                </div>

                {/* Statistics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500 font-medium">Total de Alunos</p>
                                <p className="text-2xl font-semibold text-gray-800 mt-1">{studentsData.length}</p>
                            </div>
                            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                <Users className="w-6 h-6 text-blue-600" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500 font-medium">Média Calibrada</p>
                                <p className="text-2xl font-semibold text-gray-800 mt-1">{stats.avg}</p>
                            </div>
                            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                                <TrendingUp className="w-6 h-6 text-green-600" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500 font-medium">Máximo</p>
                                <p className="text-2xl font-semibold text-gray-800 mt-1">{stats.max}</p>
                            </div>
                            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                                <BarChart3 className="w-6 h-6 text-indigo-600" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500 font-medium">Mínimo</p>
                                <p className="text-2xl font-semibold text-gray-800 mt-1">{stats.min}</p>
                            </div>
                            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                                <BarChart3 className="w-6 h-6 text-purple-600" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Instrument Selection & Transfer */}
                <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">
                        Transferir Notas para Instrumento
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label htmlFor="instrumentoSelect" className="block text-sm font-medium text-gray-700 mb-2">
                                Selecionar Instrumento de Avaliação
                            </label>
                            <select
                                id="instrumentoSelect"
                                value={selectedInstrumentId}
                                onChange={handleInstrumentChange}
                                className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:bg-white transition-all"
                            >
                                <option value="">-- Selecione um instrumento --</option>
                                {instrumentos.map(inst => (
                                    <option key={inst.id} value={inst.id}>
                                        {inst.nome} ({inst.criterio_nome})
                                    </option>
                                ))}
                            </select>
                        </div>

                        {selectedInstrumentId && (
                            <div className="flex items-end gap-2">
                                <button
                                    onClick={handleTransferGrades}
                                    className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 flex items-center justify-center gap-2"
                                >
                                    <Download className="w-4 h-4" />
                                    Transferir Notas
                                </button>
                                <button
                                    onClick={handleSaveGrades}
                                    className="flex-1 px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg shadow-green-500/30 hover:shadow-xl hover:shadow-green-500/40 flex items-center justify-center gap-2"
                                >
                                    <Save className="w-4 h-4" />
                                    Guardar Notas
                                </button>
                            </div>
                        )}
                    </div>

                    {transferSuccess && (
                        <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-lg">
                            <div className="flex items-center">
                                <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                                <p className="text-green-700 font-medium">
                                    Notas transferidas com sucesso! Clique em "Guardar Notas" para salvar.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Results Table */}
                {studentsData.length === 0 ? (
                    <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                        <Users className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                        <p className="text-lg text-gray-600 mb-2">Nenhum aluno encontrado</p>
                        <p className="text-sm text-gray-500">
                            Não há dados de alunos para este contador.
                        </p>
                    </div>
                ) : (
                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gradient-to-r from-blue-600 to-indigo-600">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">
                                            Aluno
                                        </th>
                                        <th className="px-6 py-4 text-center text-xs font-semibold text-white uppercase tracking-wider">
                                            Contagem Bruta
                                        </th>
                                        <th className="px-6 py-4 text-center text-xs font-semibold text-white uppercase tracking-wider">
                                            Pontuação Calibrada
                                        </th>
                                        {selectedInstrumentId && (
                                            <th className="px-6 py-4 text-center text-xs font-semibold text-white uppercase tracking-wider">
                                                Nota Atual no Instrumento
                                            </th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {studentsData.map((student) => {
                                        const currentInstrumentGrade = instrumentGrades.find(ig => ig.aluno.id === student.id);
                                        return (
                                            <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <div className="w-2 h-2 bg-blue-600 rounded-full mr-3"></div>
                                                        <div>
                                                            <div className="text-sm font-medium text-gray-900">
                                                                {student.name}
                                                            </div>
                                                            <div className="text-sm text-gray-500">
                                                                Nº {student.numero}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                                                        {student.rawCount.toFixed(2)}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                                                        {student.calibratedScore.toFixed(2)}
                                                    </span>
                                                </td>
                                                {selectedInstrumentId && (
                                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                                        {currentInstrumentGrade ? (
                                                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                                                                {currentInstrumentGrade.nota.nota.toFixed(2)}
                                                            </span>
                                                        ) : (
                                                            <span className="text-gray-400 text-sm">N/A</span>
                                                        )}
                                                    </td>
                                                )}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CounterResultsPage;
