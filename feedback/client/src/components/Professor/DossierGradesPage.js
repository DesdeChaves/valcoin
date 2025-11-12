import React, { useState, useEffect } from 'react';
import { fetchDossierGrades, fetchMomentosAvaliacaoByDossie, saveBatchNotasFinais } from '../../utils/api';
import { useParams, useNavigate } from 'react-router-dom';

const DossierGradesPage = () => {
    const { dossieId } = useParams();
    const navigate = useNavigate();
    const [studentsGrades, setStudentsGrades] = useState([]);
    const [dossie, setDossie] = useState(null);
    const [momentosAvaliacao, setMomentosAvaliacao] = useState([]);
    const [selectedMomentoId, setSelectedMomentoId] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });
    const [transferring, setTransferring] = useState(false);

    const professorId = JSON.parse(localStorage.getItem('user'))?.id;

    useEffect(() => {
        const fetchGrades = async () => {
            try {
                const response = await fetchDossierGrades(dossieId);
                const { students, criteria, dossie } = response;
                setDossie(dossie);

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
                        finalGrade: normalizedFinalGrade,
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
                nota: student.finalGrade,
            }));

            await saveBatchNotasFinais(selectedMomentoId, notasToSave);
            
            // Success notification
            const notification = document.createElement('div');
            notification.className = 'fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in';
            notification.innerHTML = `
                <div class="flex items-center">
                    <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    Notas transferidas com sucesso!
                </div>
            `;
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

    // Sorting function
    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    // Get sorted and filtered data
    const getSortedAndFilteredGrades = () => {
        let filtered = studentsGrades.filter(student =>
            student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            student.numero.toString().includes(searchTerm)
        );

        filtered.sort((a, b) => {
            let aValue = sortConfig.key === 'finalGrade' ? a.finalGrade : sortConfig.key === 'numero' ? a.numero : a.name;
            let bValue = sortConfig.key === 'finalGrade' ? b.finalGrade : sortConfig.key === 'numero' ? b.numero : b.name;

            if (typeof aValue === 'string') {
                aValue = aValue.toLowerCase();
                bValue = bValue.toLowerCase();
            }

            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });

        return filtered;
    };

    const filteredGrades = getSortedAndFilteredGrades();

    // Calculate statistics
    const stats = studentsGrades.length > 0 ? {
        average: (studentsGrades.reduce((sum, s) => sum + s.finalGrade, 0) / studentsGrades.length).toFixed(2),
        max: Math.max(...studentsGrades.map(s => s.finalGrade)).toFixed(2),
        min: Math.min(...studentsGrades.map(s => s.finalGrade)).toFixed(2),
        passed: studentsGrades.filter(s => s.finalGrade >= (dossie?.escala_avaliacao * 0.5 || 10)).length,
    } : null;

    // Sort indicator
    const SortIndicator = ({ columnKey }) => {
        if (sortConfig.key !== columnKey) {
            return <span className="ml-1 text-gray-400">⇅</span>;
        }
        return <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>;
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Carregando classificações...</p>
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
                            <svg className="w-5 h-5 text-red-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <div>
                                <p className="font-semibold text-red-800">Erro</p>
                                <p className="text-red-700">{error}</p>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                        Tentar Novamente
                    </button>
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
                                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                </svg>
                            </button>
                            <div>
                                <h1 className="text-2xl font-semibold text-gray-800">Classificações</h1>
                                <p className="text-sm text-gray-500">
                                    {dossie?.nome || 'Dossiê'} · Escala 0-{dossie?.escala_avaliacao || 20}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-6">
                {/* Statistics Cards */}
                {stats && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-white rounded-lg p-4 border border-gray-200">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-500 font-medium">Alunos</p>
                                    <p className="text-2xl font-semibold text-gray-800 mt-1">{studentsGrades.length}</p>
                                </div>
                                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                    </svg>
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
                                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                    </svg>
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
                                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                    </svg>
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
                                    <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Transfer Section */}
                <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">Transferir Notas</h2>
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Momento de Avaliação
                            </label>
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
                                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        A transferir...
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                                        </svg>
                                        Transferir Notas
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
                    <div className="relative">
                        <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            type="text"
                            placeholder="Pesquisar por nome ou número..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                    </div>
                </div>

                {/* Table */}
                {filteredGrades.length === 0 ? (
                    <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                        <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p className="text-lg text-gray-600 mb-2">
                            {searchTerm ? 'Nenhum resultado encontrado' : 'Nenhuma classificação disponível'}
                        </p>
                        <p className="text-sm text-gray-500">
                            {searchTerm ? 'Tente ajustar os critérios de pesquisa' : 'Verifique se existem critérios, instrumentos e notas configurados'}
                        </p>
                    </div>
                ) : (
                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th 
                                        onClick={() => handleSort('numero')}
                                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                                    >
                                        Nº <SortIndicator columnKey="numero" />
                                    </th>
                                    <th 
                                        onClick={() => handleSort('name')}
                                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                                    >
                                        Nome <SortIndicator columnKey="name" />
                                    </th>
                                    <th 
                                        onClick={() => handleSort('finalGrade')}
                                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                                    >
                                        Nota Final <SortIndicator columnKey="finalGrade" />
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Estado
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredGrades.map((student, index) => {
                                    const isPassed = student.finalGrade >= (dossie?.escala_avaliacao * 0.5 || 10);
                                    return (
                                        <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                {student.numero}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                                {student.name}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`text-lg font-semibold ${isPassed ? 'text-green-600' : 'text-red-600'}`}>
                                                    {student.finalGrade.toFixed(2)}
                                                </span>
                                                <span className="text-sm text-gray-500 ml-1">/ {dossie?.escala_avaliacao}</span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                    isPassed 
                                                        ? 'bg-green-100 text-green-800' 
                                                        : 'bg-red-100 text-red-800'
                                                }`}>
                                                    {isPassed ? 'Aprovado' : 'Reprovado'}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DossierGradesPage;
