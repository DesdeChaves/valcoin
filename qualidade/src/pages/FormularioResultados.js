import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getFormById, getFormResponsesByFormId } from '../services/api';

const FormularioResultados = () => {
    const { formId } = useParams();
    const [form, setForm] = useState(null);
    const [responses, setResponses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [expandedResponse, setExpandedResponse] = useState(null); // To show individual response details

    useEffect(() => {
        const fetchData = async () => {
            try {
                const fetchedForm = await getFormById(formId, true); // Include questions for context
                if (fetchedForm) {
                    setForm(fetchedForm);
                    const fetchedResponses = await getFormResponsesByFormId(formId);
                    setResponses(fetchedResponses);
                } else {
                    setError('Formulário não encontrado.');
                }
            } catch (err) {
                setError(err.message);
                console.error('Error fetching form results:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [formId]);

    const getQuestionText = (questionId) => {
        return form?.questions.find(q => q.id === questionId)?.enunciado || 'Pergunta desconhecida';
    };

    const getOptionText = (optionId) => {
        for (const question of form?.questions || []) {
            const option = question.options?.find(opt => opt.id === optionId);
            if (option) return option.texto;
        }
        return 'Opção desconhecida';
    };

    const renderAnswer = (answer) => {
        const question = form?.questions.find(q => q.id === answer.question_id);
        if (!question) return <p className="text-red-500">Erro: Pergunta não encontrada.</p>;

        switch (question.tipo_pergunta) {
            case 'texto_curto':
            case 'texto_longo':
            case 'hora': // Stored as text
                return <p><strong>Resposta:</strong> {answer.texto_resposta}</p>;
            case 'escolha_multipla':
            case 'lista_suspensa':
                return <p><strong>Opção selecionada:</strong> {answer.opcoes_selecionadas?.map(getOptionText).join(', ')}</p>;
            case 'caixas_selecao':
                return <p><strong>Opções selecionadas:</strong> {answer.opcoes_selecionadas?.map(getOptionText).join(', ')}</p>;
            case 'escala_linear':
                return <p><strong>Valor:</strong> {answer.valor_numerico}</p>;
            case 'data':
                return <p><strong>Data:</strong> {new Date(answer.data_resposta).toLocaleDateString()}</p>;
            case 'upload_ficheiro':
                return (
                    <div>
                        <strong>Ficheiros:</strong>
                        {(answer.ficheiros_url || []).map((url, idx) => (
                            <p key={idx}><a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">{url.split('/').pop()}</a></p>
                        ))}
                    </div>
                );
            case 'grelha':
                return <p><strong>Resposta (Grelha):</strong> {answer.texto_resposta}</p>;
            default:
                return <p><strong>Resposta:</strong> {answer.texto_resposta || answer.valor_numerico || 'N/A'}</p>;
        }
    };

    if (loading) {
        return <div className="text-center p-4">Carregando resultados...</div>;
    }

    if (error) {
        return <div className="text-center p-4 text-red-500">Erro: {error}</div>;
    }

    if (!form) {
        return <div className="text-center p-4">Formulário não encontrado.</div>;
    }

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-2">Resultados do Formulário: {form.titulo}</h1>
            <p className="text-gray-600 mb-4">{form.descricao}</p>

            <Link to={`/qualidade/forms/${formId}/edit`} className="bg-yellow-500 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded text-sm mr-2">
                Editar Formulário
            </Link>
            <Link to="/qualidade" className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded text-sm">
                Voltar à Lista
            </Link>

            <h2 className="text-xl font-bold mt-6 mb-3">Respostas ({responses.length})</h2>

            {responses.length === 0 ? (
                <p>Nenhuma resposta submetida ainda.</p>
            ) : (
                <div className="space-y-4">
                    {responses.map((response) => (
                        <div key={response.id} className="border p-4 rounded-md shadow-sm bg-white">
                            <div className="flex justify-between items-center">
                                <h3 className="font-semibold text-lg">
                                    Resposta de {response.aluno ? response.aluno.nome : 'Anónimo'} (em {new Date(response.submetido_em).toLocaleString()})
                                </h3>
                                <button
                                    onClick={() => setExpandedResponse(expandedResponse === response.id ? null : response.id)}
                                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-3 rounded text-sm"
                                >
                                    {expandedResponse === response.id ? 'Esconder Detalhes' : 'Ver Detalhes'}
                                </button>
                            </div>
                            {expandedResponse === response.id && (
                                <div className="mt-4 border-t pt-4">
                                    {response.answers.sort((a,b) => {
                                        const qA = form.questions.find(q => q.id === a.question_id);
                                        const qB = form.questions.find(q => q.id === b.question_id);
                                        return (qA?.ordem || 0) - (qB?.ordem || 0);
                                    }).map((answer, ansIndex) => (
                                        <div key={answer.id} className="mb-3">
                                            <p className="font-medium text-gray-800">{ansIndex + 1}. {getQuestionText(answer.question_id)}</p>
                                            {renderAnswer(answer)}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default FormularioResultados;
