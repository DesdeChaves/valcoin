import React, { useState, useEffect } from 'react';
import { fetchDossierGrades, fetchMomentosAvaliacaoByDossie, saveBatchNotasFinais } from '../../utils/api';
import { useParams, useNavigate } from 'react-router-dom';
import Modal from '../Layout/Modal'; // Assuming a generic Modal component exists

const GradeCalculationModal = ({ student, criteria, dossie, onClose }) => {
    if (!student || !criteria || !dossie) return null;

    return (
        <div>
            <h2 className="text-2xl font-bold mb-4">Cálculo da Nota de {student.name}</h2>
            <div className="space-y-4">
                {criteria.map((criterion) => {
                    const sumOfInstrumentWeights = criterion.elementos.reduce((sum, inst) => sum + parseFloat(inst.ponderacao), 0);
                    
                    let criterionScore = 0;
                    let criterionTotalPonderacaoReal = 0;

                    criterion.elementos.forEach(instrument => {
                        const studentNote = instrument.notas.find(nota => nota.aluno_id === student.id);
                        if (studentNote && !studentNote.falta) {
                            const normalizedInstrumentPonderacao = (parseFloat(instrument.ponderacao) / sumOfInstrumentWeights) * 100;
                            const instrumentScore = (parseFloat(studentNote.nota) / parseFloat(instrument.cotacao_maxima)) * normalizedInstrumentPonderacao;
                            criterionScore += instrumentScore;
                            criterionTotalPonderacaoReal += normalizedInstrumentPonderacao;
                        }
                    });

                    const criterionWeightedScore = criterionTotalPonderacaoReal > 0 
                        ? (criterionScore / criterionTotalPonderacaoReal) * parseFloat(criterion.ponderacao)
                        : 0;

                    return (
                        <div key={criterion.id} className="bg-gray-100 p-4 rounded-lg">
                            <h3 className="text-lg font-semibold">{criterion.nome} (Ponderação: {criterion.ponderacao}%)</h3>
                            <table className="min-w-full divide-y divide-gray-200 mt-2">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Instrumento</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Nota</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Contribuição</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {criterion.elementos.map(instrument => {
                                        const studentNote = instrument.notas.find(nota => nota.aluno_id === student.id);
                                        const note = studentNote ? studentNote.nota : 'N/A';
                                        
                                        let contribution = 0;
                                        if (studentNote && !studentNote.falta) {
                                            const normalizedInstrumentPonderacao = (parseFloat(instrument.ponderacao) / sumOfInstrumentWeights) * 100;
                                            const instrumentScore = (parseFloat(studentNote.nota) / parseFloat(instrument.cotacao_maxima)) * normalizedInstrumentPonderacao;
                                            const weightedScore = (instrumentScore / criterionTotalPonderacaoReal) * parseFloat(criterion.ponderacao);
                                            contribution = (weightedScore / 100) * dossie.escala_avaliacao;
                                        }

                                        return (
                                            <tr key={instrument.id}>
                                                <td className="px-4 py-2">{instrument.nome}</td>
                                                <td className="px-4 py-2">{note} / {instrument.cotacao_maxima}</td>
                                                <td className="px-4 py-2">{contribution.toFixed(2)}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            <div className="text-right mt-2 font-semibold">
                                Contribuição do Critério: {( (criterionWeightedScore / 100) * dossie.escala_avaliacao ).toFixed(2)}
                            </div>
                        </div>
                    );
                })}
            </div>
            <div className="text-right mt-4 text-xl font-bold">
                Nota Calculada Final: {student.nota_calculada.toFixed(2)}
            </div>
            <button onClick={onClose} className="mt-4 bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded">
                Fechar
            </button>
        </div>
    );
};


const DossierGradesPage = () => {
    const { dossieId } = useParams();
    const navigate = useNavigate();
    const [studentsGrades, setStudentsGrades] = useState([]);
    const [dossie, setDossie] = useState(null);
    const [criteria, setCriteria] = useState([]);
    const [momentosAvaliacao, setMomentosAvaliacao] = useState([]);
    const [selectedMomentoId, setSelectedMomentoId] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });
    const [transferring, setTransferring] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState(null);

    const professorId = JSON.parse(localStorage.getItem('user'))?.id;

    useEffect(() => {
        const fetchGrades = async () => {
            try {
                const response = await fetchDossierGrades(dossieId);
                const { students, criteria, dossie } = response;
                setDossie(dossie);
                setCriteria(criteria);

                const calculatedGrades = students.map(student => {
                    let finalGrade = 0;

                    criteria.forEach(criterion => {
                        let criterionTotalPonderacaoReal = 0;
                        let criterionScore = 0;

                        const instrumentsInCriterion = criterion.elementos.filter(el => el.ativo);
                        const sumPonderacaoInstrumentos = instrumentsInCriterion.reduce((sum, el) => sum + parseFloat(el.ponderacao), 0);

                        instrumentsInCriterion.forEach(instrument => {
                            const studentNote = instrument.notas.find(nota => nota.aluno_id === student.id);

                            if (studentNote && !studentNote.falta) {
                                const normalizedInstrumentPonderacao = (parseFloat(instrument.ponderacao) / sumPonderacaoInstrumentos) * 100;
                                const instrumentScore = (parseFloat(studentNote.nota) / parseFloat(instrument.cotacao_maxima)) * normalizedInstrumentPonderacao;
                                criterionScore += instrumentScore;
                                criterionTotalPonderacaoReal += normalizedInstrumentPonderacao;
                            }
                        });

                        if (criterionTotalPonderacaoReal > 0) {
                            const criterionWeightedScore = (criterionScore / criterionTotalPonderacaoReal) * parseFloat(criterion.ponderacao);
                            finalGrade += criterionWeightedScore;
                        }
                    });

                    const normalizedFinalGrade = (finalGrade / 100) * dossie.escala_avaliacao;

                    return {
                        id: student.id,
                        name: student.nome,
                        numero: student.numero_mecanografico,
                        nota_calculada: normalizedFinalGrade,
                        nota_final: parseInt(normalizedFinalGrade), // Initialize with calculated grade as an integer
                        observacoes: '', // Initialize with empty string
                    };
                });

                setStudentsGrades(calculatedGrades);
                setLoading(false);
            } catch (err) {
                setError('Erro ao carregar classificações');
                setLoading(false);
                console.error('Error fetching grades:', err);
            }
        };

        const fetchMomentos = async () => {
            try {
                const response = await fetchMomentosAvaliacaoByDossie(dossieId);
                setMomentosAvaliacao(response);
            } catch (err) {
                console.error('Error fetching momentos de avaliação:', err);
            }
        };

        if (professorId && dossieId) {
            fetchGrades();
            fetchMomentos();
        } else {
            setError('Professor ID or Dossie ID not found.');
            setLoading(false);
        }
    }, [professorId, dossieId]);

    const handleGradeChange = (studentId, newGrade) => {
        setStudentsGrades(prevGrades =>
            prevGrades.map(student =>
                student.id === studentId ? { ...student, nota_final: parseInt(newGrade, 10) } : student
            )
        );
    };

    const handleObservationChange = (studentId, newObservation) => {
        setStudentsGrades(prevGrades =>
            prevGrades.map(student =>
                student.id === studentId ? { ...student, observacoes: newObservation } : student
            )
        );
    };

    const handleTransferGradesToMomento = async () => {
        if (!selectedMomentoId) {
            alert("Por favor, selecione um momento de avaliação.");
            return;
        }
        if (studentsGrades.length === 0) {
            alert("Não há notas para transferir.");
            return;
        }

        try {
            setTransferring(true);
            const notasToSave = studentsGrades.map(student => ({
                aluno_id: student.id,
                nota: student.nota_final,
                nota_calculada: student.nota_calculada,
                observacoes: student.observacoes,
            }));

            await saveBatchNotasFinais(selectedMomentoId, notasToSave);
            
            const notification = document.createElement('div');
            notification.className = 'fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in';
            notification.innerHTML = `...`; // Simplified for brevity
            document.body.appendChild(notification);
            setTimeout(() => notification.remove(), 3000);
            
            setSelectedMomentoId('');
        } catch (err) {
            setError(`Erro ao transferir notas: ${err.message}`);
            console.error('Error transferring grades:', err);
            alert('Erro ao transferir notas. Por favor, tente novamente.');
        } finally {
            setTransferring(false);
        }
    };
    
    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const getSortedAndFilteredGrades = () => {
        let filtered = studentsGrades.filter(student =>
            student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            student.numero.toString().includes(searchTerm)
        );

        filtered.sort((a, b) => {
            let aValue = a[sortConfig.key];
            let bValue = b[sortConfig.key];
    
            if (sortConfig.key === 'nota_final' || sortConfig.key === 'nota_calculada' || sortConfig.key === 'numero') {
                aValue = parseFloat(aValue);
                bValue = parseFloat(bValue);
            } else {
                aValue = String(aValue).toLowerCase();
                bValue = String(bValue).toLowerCase();
            }

            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });

        return filtered;
    };

    const filteredGrades = getSortedAndFilteredGrades();

    const stats = studentsGrades.length > 0 ? {
        average: (studentsGrades.reduce((sum, s) => sum + s.nota_final, 0) / studentsGrades.length).toFixed(2),
        max: Math.max(...studentsGrades.map(s => s.nota_final)).toFixed(2),
        min: Math.min(...studentsGrades.map(s => s.nota_final)).toFixed(2),
        passed: studentsGrades.filter(s => s.nota_final >= (dossie?.escala_avaliacao * 0.5 || 10)).length,
    } : null;

    const SortIndicator = ({ columnKey }) => {
        if (sortConfig.key !== columnKey) {
            return <span className="ml-1 text-gray-400">⇅</span>;
        }
        return <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>;
    };

    const openGradeDetailsModal = (student) => {
        setSelectedStudent(student);
        setIsModalOpen(true);
    };

    const closeGradeDetailsModal = () => {
        setIsModalOpen(false);
        setSelectedStudent(null);
    };

    if (loading) {
        return <div className="text-center">Loading...</div>;
    }

    if (error) {
        return <div className="text-center text-red-500">{error}</div>;
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {isModalOpen && (
                <Modal isOpen={isModalOpen} onClose={closeGradeDetailsModal}>
                    <GradeCalculationModal 
                        student={selectedStudent} 
                        criteria={criteria} 
                        dossie={dossie}
                        onClose={closeGradeDetailsModal}
                    />
                </Modal>
            )}
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-lg">
                                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                            </button>
                            <div>
                                <h1 className="text-2xl font-semibold text-gray-800">Classificações</h1>
                                <p className="text-sm text-gray-500">{dossie?.nome || 'Dossiê'} · Escala 0-{dossie?.escala_avaliacao || 20}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="max-w-7xl mx-auto px-6 py-6">
                {stats && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-white rounded-lg p-4 border border-gray-200">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-500 font-medium">Alunos</p>
                                    <p className="text-2xl font-semibold text-gray-800 mt-1">{studentsGrades.length}</p>
                                </div>
                                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white rounded-lg p-4 border border-gray-200">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-500 font-medium">Média</p>
                                    <p className="text-2xl font-semibold text-gray-800 mt-1">{stats.average}</p>
                                </div>
                                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white rounded-lg p-4 border border-gray-200">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-500 font-medium">Máxima</p>
                                    <p className="text-2xl font-semibold text-gray-800 mt-1">{stats.max}</p>
                                </div>
                                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white rounded-lg p-4 border border-gray-200">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-500 font-medium">Aprovados</p>
                                    <p className="text-2xl font-semibold text-gray-800 mt-1">{stats.passed}</p>
                                </div>
                                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                                    <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">Transferir Notas</h2>
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Momento de Avaliação</label>
                            <select
                                value={selectedMomentoId}
                                onChange={(e) => setSelectedMomentoId(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            >
                                <option value="">Selecione um momento...</option>
                                {momentosAvaliacao.map(momento => (
                                    <option key={momento.id} value={momento.id}>{momento.nome}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex items-end">
                            <button
                                onClick={handleTransferGradesToMomento}
                                disabled={!selectedMomentoId || studentsGrades.length === 0 || transferring}
                                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center"
                            >
                                {transferring ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                        A transferir...
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" /></svg>
                                        Transferir Notas
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
                    <div className="relative">
                        <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        <input
                            type="text"
                            placeholder="Pesquisar por nome ou número..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                    </div>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th onClick={() => handleSort('numero')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer">Nº <SortIndicator columnKey="numero" /></th>
                                <th onClick={() => handleSort('name')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer">Nome <SortIndicator columnKey="name" /></th>
                                <th onClick={() => handleSort('nota_calculada')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer">Nota Calculada <SortIndicator columnKey="nota_calculada" /></th>
                                <th onClick={() => handleSort('nota_final')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer">Nota Final <SortIndicator columnKey="nota_final" /></th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Observações</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredGrades.map((student) => (
                                <tr key={student.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4">{student.numero}</td>
                                    <td className="px-6 py-4">{student.name}</td>
                                    <td className="px-6 py-4">
                                        <span 
                                            className="text-lg font-semibold text-gray-600 cursor-pointer hover:text-blue-600"
                                            onClick={() => openGradeDetailsModal(student)}
                                        >
                                            {student.nota_calculada.toFixed(2)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <input
                                            type="number"
                                            step="1"
                                            value={student.nota_final}
                                            onChange={(e) => handleGradeChange(student.id, e.target.value)}
                                            className="w-24 px-2 py-1 border border-gray-300 rounded-md"
                                        />
                                    </td>
                                    <td className="px-6 py-4">
                                        <textarea
                                            rows="3"
                                            value={student.observacoes}
                                            onChange={(e) => handleObservationChange(student.id, e.target.value)}
                                            className="w-full px-2 py-1 border border-gray-300 rounded-md"
                                        />
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${student.nota_final >= (dossie?.escala_avaliacao * 0.5 || 10) ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                            {student.nota_final >= (dossie?.escala_avaliacao * 0.5 || 10) ? 'Aprovado' : 'Reprovado'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default DossierGradesPage;
