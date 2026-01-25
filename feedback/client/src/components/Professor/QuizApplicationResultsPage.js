import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getQuizApplicationResults, fetchProfessorDossiers, fetchDossierInstruments, fetchInstrumentGrades, saveBatchGrades } from '../../utils/api';
import useAuth from '../../hooks/useAuth';
import { ArrowLeft, BarChart3, Users, Download, Save, AlertCircle, CheckCircle } from 'lucide-react';

const QuizApplicationResultsPage = () => {
    const { applicationId } = useParams();
    const navigate = useNavigate();
    const { user: currentUser } = useAuth();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    const [application, setApplication] = useState(null);
    const [students, setStudents] = useState([]);
    
    const [dossieId, setDossieId] = useState(null);
    const [instruments, setInstruments] = useState([]);
    const [selectedInstrumentId, setSelectedInstrumentId] = useState('');
    const [instrumentGrades, setInstrumentGrades] = useState([]);
    const [transferSuccess, setTransferSuccess] = useState(false);

    // 1. Fetch main quiz application results and find dossie_id
    useEffect(() => {
        const fetchResults = async () => {
            if (!applicationId) return;
            try {
                setLoading(true);
                const response = await getQuizApplicationResults(applicationId);
                const appData = response.data.application;
                setApplication(appData);
                setStudents(response.data.results);

                if (appData.dossie_id) {
                    setDossieId(appData.dossie_id);
                } else {
                    setError('Não foi encontrado um Dossiê de Avaliação. Verifique se a sua associação a esta disciplina e turma está configurada corretamente no sistema.');
                }

            } catch (err) {
                setError('Erro ao carregar os resultados do quiz.');
                console.error('Error fetching quiz results:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchResults();
    }, [applicationId]);

    // 2. Fetch instruments when dossieId is found
    useEffect(() => {
        const fetchInstruments = async () => {
            if (!dossieId) return;
            try {
                const response = await fetchDossierInstruments(dossieId);
                setInstruments(response);
            } catch (err) {
                console.error('Error fetching instruments:', err);
            }
        };
        fetchInstruments();
    }, [dossieId]);

    // 4. Fetch grades when an instrument is selected
    useEffect(() => {
        const getInstrumentGrades = async () => {
            if (!selectedInstrumentId) return;
            try {
                const response = await fetchInstrumentGrades(selectedInstrumentId);
                setInstrumentGrades(response);
            } catch (err) {
                console.error('Error fetching instrument grades:', err);
            }
        };
        getInstrumentGrades();
    }, [selectedInstrumentId]);

    const handleInstrumentChange = (e) => {
        setSelectedInstrumentId(e.target.value);
        setTransferSuccess(false);
    };

    const handleTransferGrades = () => {
        if (!selectedInstrumentId) {
            alert("Por favor, selecione um instrumento de avaliação.");
            return;
        }
        const selectedInstrument = instruments.find(inst => inst.id === selectedInstrumentId);
        if (!selectedInstrument) {
            alert("Instrumento selecionado não encontrado.");
            return;
        }

        const instrumentMaxScore = selectedInstrument.cotacao_maxima;
        const sourceScale = 100; // Quiz scores are always 0-100

        const updatedGrades = instrumentGrades.map(instrumentGrade => {
            const studentResult = students.find(s => s.student_id === instrumentGrade.aluno.id);
            if (studentResult) {
                const convertedScore = (parseFloat(studentResult.score) / sourceScale) * instrumentMaxScore;
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
        if (!selectedInstrumentId) {
            alert("Nenhum instrumento selecionado.");
            return;
        }
        try {
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
            alert('Erro ao guardar as notas.');
        }
    };

    if (loading) return <div className="p-6">A carregar...</div>;
    if (error) return <div className="p-6 text-red-500">{error}</div>;

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex items-center space-x-4 mb-6">
                <button onClick={() => navigate('/quizzes')} className="p-2 hover:bg-gray-100 rounded-full">
                    <ArrowLeft className="w-6 h-6 text-gray-700" />
                </button>
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">{application?.quiz_title || 'Resultados do Quiz'}</h1>
                    <p className="text-gray-500">Transfira as notas do quiz para um instrumento de avaliação.</p>
                </div>
            </div>

            {/* Instrument Selection & Transfer */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Transferir Notas</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label htmlFor="instrumentoSelect" className="block text-sm font-medium text-gray-700 mb-2">
                            Selecione o Instrumento de Destino
                        </label>
                        <select
                            id="instrumentoSelect"
                            value={selectedInstrumentId}
                            onChange={handleInstrumentChange}
                            disabled={!dossieId || instruments.length === 0}
                            className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:border-indigo-500"
                        >
                            <option value="">
                                {dossieId ? (instruments.length > 0 ? '-- Selecione um instrumento --' : 'Nenhum instrumento encontrado') : 'Aguardando dossiê...'}
                            </option>
                            {instruments.map(inst => (
                                <option key={inst.id} value={inst.id}>
                                    {inst.nome} ({inst.criterio_nome}) - Escala: 0-{inst.cotacao_maxima}
                                </option>
                            ))}
                        </select>
                    </div>
                    {selectedInstrumentId && (
                        <div className="flex items-end gap-2">
                            <button onClick={handleTransferGrades} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2">
                                <Download className="w-4 h-4" /> Transferir
                            </button>
                            <button onClick={handleSaveGrades} className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2">
                                <Save className="w-4 h-4" /> Guardar
                            </button>
                        </div>
                    )}
                </div>
                {transferSuccess && (
                    <div className="bg-green-50 border-l-4 border-green-500 p-3 rounded-r-lg flex items-center">
                        <CheckCircle className="w-5 h-5 text-green-600 mr-3" />
                        <p className="text-green-800 font-medium">Notas transferidas. Clique em "Guardar" para confirmar.</p>
                    </div>
                )}
            </div>

            {/* Results Table */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aluno</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Score do Quiz (0-100)</th>
                            {selectedInstrumentId && (
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Nota no Instrumento</th>
                            )}
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {students.map((student) => {
                            const instrumentGrade = selectedInstrumentId ? instrumentGrades.find(ig => ig.aluno.id === student.student_id) : null;
                            return (
                                <tr key={student.student_id}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="font-medium text-gray-900">{student.student_name}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <span className="px-3 py-1 text-sm font-semibold rounded-full bg-blue-100 text-blue-800">
                                            {parseFloat(student.score).toFixed(2)}
                                        </span>
                                    </td>
                                    {selectedInstrumentId && (
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            {instrumentGrade ? (
                                                <span className={`px-3 py-1 text-sm font-semibold rounded-full ${transferSuccess ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}`}>
                                                    {parseFloat(instrumentGrade.nota.nota).toFixed(2)}
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
    );
};

export default QuizApplicationResultsPage;
