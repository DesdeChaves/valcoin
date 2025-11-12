import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchStudentDisciplineGrades } from '../../utils/api';

const DisciplineDetailsPage = () => {
    const { disciplineId } = useParams();
    const navigate = useNavigate();
    const [gradeDetails, setGradeDetails] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [expandedCriteria, setExpandedCriteria] = useState([]);
    
    const studentId = JSON.parse(localStorage.getItem('user'))?.id;

    useEffect(() => {
        if (studentId && disciplineId) {
            const getGradeDetails = async () => {
                try {
                    setLoading(true);
                    const response = await fetchStudentDisciplineGrades(studentId, disciplineId);
                    setGradeDetails(response);
                    // Expand all criteria by default
                    setExpandedCriteria(response.criteria.map(c => c.id));
                    setError(null);
                } catch (err) {
                    setError('Error fetching grade details');
                    console.error('Error fetching grade details:', err);
                } finally {
                    setLoading(false);
                }
            };
            getGradeDetails();
        } else {
            setError('Student ID or Discipline ID not found.');
            setLoading(false);
        }
    }, [studentId, disciplineId]);

    const toggleCriterion = (criterionId) => {
        setExpandedCriteria(prev => 
            prev.includes(criterionId)
                ? prev.filter(id => id !== criterionId)
                : [...prev, criterionId]
        );
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
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
                        onClick={() => navigate(-1)}
                        className="mt-4 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                    >
                        Voltar
                    </button>
                </div>
            </div>
        );
    }

    if (!gradeDetails) {
        return (
            <div className="min-h-screen bg-gray-50 p-6">
                <div className="max-w-7xl mx-auto">
                    <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                        <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p className="text-lg text-gray-600">Nenhuma classificação encontrada.</p>
                    </div>
                </div>
            </div>
        );
    }

    const { disciplineName, dossierName, criteria } = gradeDetails;
    const total = criteria.reduce((acc, criterion) => {
        return acc + criterion.instrumentos.reduce((instAcc, inst) => instAcc + (inst.peso * inst.classificacao), 0);
    }, 0);

    // Calculate average
    const totalInstruments = criteria.reduce((acc, c) => acc + c.instrumentos.length, 0);
    const average = totalInstruments > 0 ? total / totalInstruments : 0;

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
                                <h1 className="text-2xl font-semibold text-gray-800">{disciplineName}</h1>
                                <p className="text-sm text-gray-500 mt-1">{dossierName}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-6">
                {/* Statistics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500 font-medium">Total</p>
                                <p className="text-2xl font-semibold text-gray-800 mt-1">{total.toFixed(2)}</p>
                            </div>
                            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500 font-medium">Média</p>
                                <p className="text-2xl font-semibold text-gray-800 mt-1">{average.toFixed(2)}</p>
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
                                <p className="text-sm text-gray-500 font-medium">Critérios</p>
                                <p className="text-2xl font-semibold text-gray-800 mt-1">{criteria.length}</p>
                            </div>
                            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Criteria Cards */}
                <div className="space-y-4">
                    {criteria.map((criterion) => {
                        const criterionTotal = criterion.instrumentos.reduce((acc, inst) => acc + (inst.peso * inst.classificacao), 0);
                        const isExpanded = expandedCriteria.includes(criterion.id);
                        
                        return (
                            <div key={criterion.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                                {/* Criterion Header */}
                                <button
                                    onClick={() => toggleCriterion(criterion.id)}
                                    className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 flex items-center justify-between hover:from-blue-600 hover:to-blue-700 transition-all"
                                >
                                    <div className="flex items-center space-x-4 text-left">
                                        <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-semibold">{criterion.nome}</h3>
                                            <p className="text-sm text-blue-100">Peso: {criterion.peso}% · Resultado: {criterionTotal.toFixed(2)}</p>
                                        </div>
                                    </div>
                                    <svg 
                                        className={`w-6 h-6 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                        fill="none" 
                                        stroke="currentColor" 
                                        viewBox="0 0 24 24"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>

                                {/* Instruments Table */}
                                {isExpanded && (
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Instrumento
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Peso
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Classificação
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Resultado
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {criterion.instrumentos.map((instrumento) => (
                                                    <tr key={instrumento.id} className="hover:bg-gray-50">
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="flex items-center">
                                                                <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                                                                <span className="text-sm font-medium text-gray-900">{instrumento.nome}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                                {instrumento.peso}%
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <span className="text-sm font-semibold text-gray-900">
                                                                {instrumento.classificacao}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <span className="text-sm font-bold text-blue-600">
                                                                {(instrumento.peso * instrumento.classificacao).toFixed(2)}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                            <tfoot className="bg-gray-50">
                                                <tr>
                                                    <td colSpan="3" className="px-6 py-3 text-right text-sm font-semibold text-gray-700">
                                                        Subtotal do Critério
                                                    </td>
                                                    <td className="px-6 py-3 text-sm font-bold text-blue-600">
                                                        {criterionTotal.toFixed(2)}
                                                    </td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Total Summary */}
                <div className="mt-6 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-6 text-white">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-sm text-blue-100 font-medium">Classificação Final</p>
                                <p className="text-lg text-blue-50">Soma ponderada de todos os critérios</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-5xl font-bold">{total.toFixed(2)}</p>
                            <p className="text-sm text-blue-100 mt-1">valores</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DisciplineDetailsPage;
