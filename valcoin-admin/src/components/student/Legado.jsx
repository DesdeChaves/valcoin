import React, { useState, useEffect } from 'react';
import { Award, User, Calendar, Trophy, Hand, Mountain, Target, Star, Ticket } from 'lucide-react';
import { getStudentLegadoHistory } from '../../services/api';

const getLegadoIcon = (ruleName) => {
    const lowerCaseRuleName = ruleName.toLowerCase();
    if (lowerCaseRuleName.includes('respeito')) {
        return <Hand className="w-6 h-6 text-blue-600" />;
    }
    if (lowerCaseRuleName.includes('resiliência')) {
        return <Mountain className="w-6 h-6 text-green-600" />;
    }
    if (lowerCaseRuleName.includes('aspiração')) {
        return <Target className="w-6 h-6 text-purple-600" />;
    }
    if (lowerCaseRuleName.includes('reconhecimento simples')) {
        return <Star className="w-6 h-6 text-yellow-500" />;
    }
    if (lowerCaseRuleName.includes('golden ticket')) {
        return <Ticket className="w-6 h-6 text-orange-500" />;
    }
    return null;
};

const Legado = () => {
    const [legadoHistory, setLegadoHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLegadoHistory = async () => {
            setLoading(true);
            try {
                const history = await getStudentLegadoHistory();
                setLegadoHistory(history);
            } catch (error) {
                console.error("Error fetching legado history:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchLegadoHistory();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-96">
                <div className="flex flex-col items-center space-y-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-200 border-t-purple-600"></div>
                    <p className="text-slate-600 text-sm font-medium">A carregar o seu histórico de legados...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Header Section */}
                <div className="mb-8">
                    <div className="flex items-center space-x-3 mb-2">
                        <div className="p-2 bg-purple-100 rounded-lg">
                            <Trophy className="w-6 h-6 text-purple-600" />
                        </div>
                        <h1 className="text-3xl font-bold text-slate-800">O Meu Legado</h1>
                    </div>
                    <p className="text-slate-600">Acompanhe o seu percurso de conquistas e reconhecimentos</p>
                </div>

                {legadoHistory.length > 0 ? (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        {/* Stats Cards */}
                        <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-6 border-b border-slate-200">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-6">
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-purple-600">{legadoHistory.length}</div>
                                        <div className="text-sm text-slate-600">Total de Legados</div>
                                    </div>
                                    <div className="w-px h-12 bg-slate-300"></div>
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-blue-600">
                                            {new Set(legadoHistory.map(item => item.atribuidor_nome)).size}
                                        </div>
                                        <div className="text-sm text-slate-600">Professores</div>
                                    </div>
                                </div>
                                <div className="hidden sm:flex items-center space-x-2 bg-white px-4 py-2 rounded-lg shadow-sm">
                                    <Award className="w-4 h-4 text-purple-600" />
                                    <span className="text-sm font-medium text-slate-700">Sistema de Reconhecimento</span>
                                </div>
                            </div>
                        </div>

                        {/* Table */}
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200">
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                            <div className="flex items-center space-x-2">
                                                <Award className="w-4 h-4" />
                                                <span>Conquista</span>
                                            </div>
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                            <div className="flex items-center space-x-2">
                                                <User className="w-4 h-4" />
                                                <span>Atribuído por</span>
                                            </div>
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                            <div className="flex items-center space-x-2">
                                                <Calendar className="w-4 h-4" />
                                                <span>Data</span>
                                            </div>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {legadoHistory.map((item, index) => {
                                        const customIcon = getLegadoIcon(item.regra_nome);
                                        return (
                                            <tr key={index} className="hover:bg-slate-50 transition-colors duration-150">
                                                <td className="px-6 py-5">
                                                    <div className="flex items-center space-x-4">
                                                        <div className="flex-shrink-0">
                                                            <div className="w-12 h-12 bg-gradient-to-r from-purple-100 to-blue-100 rounded-lg flex items-center justify-center border">
                                                                {customIcon ? customIcon : <div dangerouslySetInnerHTML={{ __html: item.regra_icon }} />}
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-semibold text-slate-900">{item.regra_nome}</div>
                                                            <div className="text-xs text-slate-500">Legado #{index + 1}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <div className="flex items-center space-x-3">
                                                        <div className="w-8 h-8 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full flex items-center justify-center">
                                                            <User className="w-4 h-4 text-slate-600" />
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-medium text-slate-900">{item.atribuidor_nome}</div>
                                                            <div className="text-xs text-slate-500">Professor</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <div className="flex items-center space-x-2">
                                                        <div className="text-sm text-slate-900 font-medium">
                                                            {new Date(item.data_atribuicao).toLocaleDateString('pt-PT', {
                                                                day: '2-digit',
                                                                month: 'short',
                                                                year: 'numeric'
                                                            })}
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12">
                        <div className="text-center">
                            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Trophy className="w-8 h-8 text-slate-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-slate-900 mb-2">Nenhum legado encontrado</h3>
                            <p className="text-slate-600 mb-4">Ainda não tem histórico de legados.</p>
                            <p className="text-sm text-slate-500">Continue o seu excelente trabalho para conquistar os seus primeiros reconhecimentos!</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Legado;
