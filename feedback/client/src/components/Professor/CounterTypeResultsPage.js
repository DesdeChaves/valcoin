import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { calculateCalibratedScore } from '../../utils/calibration';
import { fetchCountersByType, fetchDossierCounters, fetchDossierInstruments, fetchInstrumentGrades, saveBatchGrades } from '../../utils/api';

const CounterTypeResultsPage = () => {
    const { dossieId, tipo } = useParams();
    const [counters, setCounters] = useState([]);
    const [studentsData, setStudentsData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [instrumentos, setInstrumentos] = useState([]);
    const [selectedInstrumentId, setSelectedInstrumentId] = useState('');
    const [instrumentGrades, setInstrumentGrades] = useState([]);

    const professorId = JSON.parse(localStorage.getItem('user'))?.id;

    useEffect(() => {
        const fetchCountersAndResults = async () => {
            try {
                // Fetch counters of this type for the dossier
                const countersResponse = await fetchCountersByType(dossieId, tipo);
                setCounters(countersResponse);

                // Fetch all students in the dossier
                const studentsAndCountersResponse = await fetchDossierCounters(dossieId);

                const allStudentsData = studentsAndCountersResponse;

                const aggregatedStudentsData = allStudentsData.map(student => {
                    let totalRawCount = 0;
                    let totalCalibratedScore = 0;

                    // Filter moments (counters) that match the current type
                    const relevantMoments = student.momentos.filter(momento => momento.tipo === tipo);

                    relevantMoments.forEach(momento => {
                        totalRawCount += momento.contagem;
                        totalCalibratedScore += calculateCalibratedScore(
                            momento.modelo_calibracao,
                            momento.parametros_calibracao,
                            momento.contagem
                        );
                    });

                    return {
                        id: student.id,
                        name: student.text,
                        numero: student.numero,
                        totalRawCount: totalRawCount,
                        totalCalibratedScore: totalCalibratedScore,
                    };
                });
                setStudentsData(aggregatedStudentsData);
                setLoading(false);

            } catch (err) {
                setError('Error fetching counter type results');
                setLoading(false);
                console.error('Error fetching counter type results:', err);
            }
        };

        if (professorId && dossieId && tipo) {
            fetchCountersAndResults();
        } else {
            setError('Professor ID, Dossie ID, or Type not found.');
            setLoading(false);
        }
    }, [professorId, dossieId, tipo]);

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
            }
            catch (err) {
                console.error('Error fetching instrument grades:', err);
            }
        };
        _fetchInstrumentGrades();
    }, [selectedInstrumentId]);

    const handleInstrumentChange = (e) => {
        setSelectedInstrumentId(e.target.value);
    };

    const handleTransferGrades = () => {
        // Logic to transfer calibrated scores to instrumentGrades
        const updatedGrades = instrumentGrades.map(instrumentGrade => {
            const student = studentsData.find(s => s.id === instrumentGrade.aluno.id);
            if (student) {
                return {
                    ...instrumentGrade,
                    nota: { ...instrumentGrade.nota, nota: student.totalCalibratedScore }
                };
            }
            return instrumentGrade;
        });
        setInstrumentGrades(updatedGrades);
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

    if (loading) {
        return <div>Loading...</div>;
    }

    if (error) {
        return <div>{error}</div>;
    }

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4">Resultados por Tipo de Contador: {tipo}</h1>

            <div className="mb-4">
                <label htmlFor="instrumentoSelect" className="block text-gray-700 text-sm font-bold mb-2">Selecionar Instrumento de Avaliação:</label>
                <select
                    id="instrumentoSelect"
                    value={selectedInstrumentId}
                    onChange={handleInstrumentChange}
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                >
                    <option value="">-- Selecione um instrumento --</option>
                    {instrumentos.map(inst => (
                        <option key={inst.id} value={inst.id}>{inst.nome} ({inst.criterio_nome})</option>
                    ))}
                </select>
            </div>

            {selectedInstrumentId && (
                <div className="mb-4 flex space-x-2">
                    <button
                        onClick={handleTransferGrades}
                        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                    >
                        Transferir Totais Calibrados
                    </button>
                    <button
                        onClick={handleSaveGrades}
                        className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
                    >
                        Guardar Notas no Instrumento
                    </button>
                </div>
            )}

            {studentsData.length === 0 ? (
                <p>Nenhum aluno encontrado ou nenhum contador deste tipo associado a este dossiê.</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full bg-white">
                        <thead className="bg-gray-800 text-white">
                            <tr>
                                <th className="py-3 px-4 uppercase font-semibold text-sm">Aluno</th>
                                <th className="py-3 px-4 uppercase font-semibold text-sm">Total Bruto</th>
                                <th className="py-3 px-4 uppercase font-semibold text-sm">Total Calibrado</th>
                                {selectedInstrumentId && <th className="py-3 px-4 uppercase font-semibold text-sm">Nota Atual no Instrumento</th>}
                            </tr>
                        </thead>
                        <tbody className="text-gray-700">
                            {studentsData.map((student) => {
                                const currentInstrumentGrade = instrumentGrades.find(ig => ig.aluno.id === student.id);
                                return (
                                    <tr key={student.id}>
                                        <td className="py-3 px-4">{student.name} ({student.numero})</td>
                                        <td className="py-3 px-4">{student.totalRawCount.toFixed(2)}</td>
                                        <td className="py-3 px-4">{student.totalCalibratedScore.toFixed(2)}</td>
                                        {selectedInstrumentId && (
                                            <td className="py-3 px-4">
                                                {currentInstrumentGrade ? currentInstrumentGrade.nota.nota.toFixed(2) : 'N/A'}
                                            </td>
                                        )}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default CounterTypeResultsPage;
