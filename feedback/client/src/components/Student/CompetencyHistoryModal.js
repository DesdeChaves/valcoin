import React, { useState, useEffect } from 'react';
import { fetchCompetencyHistory } from '../../utils/api_competencias';

const proficiencyLevelMap = {
    'fraco': 'Fraco',
    'nao_satisfaz': 'Não Satisfaz',
    'satisfaz': 'Satisfaz',
    'satisfaz_bastante': 'Satisfaz Bastante',
    'excelente': 'Excelente',
};

const CompetencyHistoryModal = ({ isOpen, onClose, competency, studentId, disciplinaTurmaId }) => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const loadHistory = async () => {
            if (studentId && competency?.competencia_id && disciplinaTurmaId) {
                try {
                    setLoading(true);
                    const data = await fetchCompetencyHistory(studentId, disciplinaTurmaId, competency.competencia_id);
                    setHistory(data);
                } catch (err) {
                    setError('Erro ao carregar o histórico da competência.');
                } finally {
                    setLoading(false);
                }
            }
        };
        loadHistory();
    }, [studentId, competency, disciplinaTurmaId]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full">
            <div className="relative top-10 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
                <div className="mt-3">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 text-center">
                        Histórico de Proficiência: {competency.competencia_nome} ({competency.disciplina_nome})
                    </h3>
                    <div className="mt-4">
                        {loading && <p>A carregar histórico...</p>}
                        {error && <p className="text-red-500">{error}</p>}

                        {!loading && !error && history.length === 0 && (
                            <p className="text-center text-gray-600">Nenhum histórico de avaliação encontrado para esta competência.</p>
                        )}

                        {!loading && !error && history.length > 0 && (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Momento</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nível</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Professor</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Observações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {history.map((item, index) => (
                                            <tr key={index}>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.momento_avaliacao}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{proficiencyLevelMap[item.nivel]}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(item.data_avaliacao).toLocaleDateString()}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.professor_nome}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.observacoes || 'N/A'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
                <div className="items-center px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                    <button type="button" onClick={onClose} className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm">
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CompetencyHistoryModal;
