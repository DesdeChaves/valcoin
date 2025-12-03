import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getFormById, submitFormResponse } from '../services/api';
import QuestionRenderer from '../components/QuestionRenderer';
import useAuth from '../hooks/useAuth'; // Assuming useAuth hook is available for user info

const FormularioResponder = () => {
    const { formId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth(); // To get aluno_id if authenticated

    const [form, setForm] = useState(null);
    const [answers, setAnswers] = useState({});
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [submissionSuccess, setSubmissionSuccess] = useState(false);

    useEffect(() => {
        const fetchForm = async () => {
            try {
                const fetchedForm = await getFormById(formId, true);
                if (fetchedForm) {
                    setForm(fetchedForm);
                    // Initialize answers state
                    const initialAnswers = {};
                    fetchedForm.questions.forEach(q => {
                        // Special handling for checkboxes which expect an array
                        if (q.tipo_pergunta === 'caixas_selecao') {
                            initialAnswers[q.id] = [];
                        } else {
                            initialAnswers[q.id] = '';
                        }
                    });
                    setAnswers(initialAnswers);
                } else {
                    setError('Formulário não encontrado.');
                }
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchForm();
    }, [formId]);

    const handleAnswerChange = (questionId, value) => {
        setAnswers(prev => ({ ...prev, [questionId]: value }));
    };

    const validateForm = () => {
        if (!form) return false;

        for (const question of form.questions) {
            if (question.obrigatoria) {
                const answerValue = answers[question.id];
                if (question.tipo_pergunta === 'caixas_selecao') {
                    if (!answerValue || answerValue.length === 0) {
                        setError(`A pergunta "${question.enunciado}" é obrigatória.`);
                        return false;
                    }
                } else if (!answerValue || (typeof answerValue === 'string' && answerValue.trim() === '')) {
                    setError(`A pergunta "${question.enunciado}" é obrigatória.`);
                    return false;
                }
            }
        }
        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSubmissionSuccess(false);

        if (!validateForm()) {
            return;
        }

        setSubmitting(true);
        try {
            const alunoId = (form.requer_autenticacao && user) ? user.id : null;

            // Transform answers into the API-expected format
            const answersData = form.questions.map(q => ({
                question_id: q.id,
                tipo_pergunta: q.tipo_pergunta,
                valor: answers[q.id]
            }));

            await submitFormResponse(formId, {
                aluno_id: alunoId,
                answersData: answersData
            });

            setSubmissionSuccess(true);
            alert('Resposta enviada com sucesso!');
            navigate('/qualidade'); // Redirect to a success page or forms list
        } catch (err) {
            console.error('Erro ao submeter resposta:', err);
            setError(err.message || 'Ocorreu um erro ao submeter a sua resposta.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return <div className="text-center p-4">Carregando formulário...</div>;
    }

    if (error && !form) { // Display error if form failed to load
        return <div className="text-center p-4 text-red-500">Erro: {error}</div>;
    }

    if (submissionSuccess) {
        return (
            <div className="container mx-auto p-4 text-center">
                <h1 className="text-2xl font-bold mb-4 text-green-600">Obrigado pela sua resposta!</h1>
                <p>A sua resposta foi submetida com sucesso.</p>
                <button
                    onClick={() => navigate('/qualidade')}
                    className="mt-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                >
                    Voltar à lista de formulários
                </button>
            </div>
        );
    }

    if (!form) {
        return <div className="text-center p-4">Formulário não encontrado ou disponível.</div>;
    }

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-2">{form.titulo}</h1>
            <p className="text-gray-600 mb-6">{form.descricao}</p>

            {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">{error}</div>}

            <form onSubmit={handleSubmit} className="bg-white shadow-md rounded-lg p-6">
                {form.questions.map(question => (
                    <QuestionRenderer
                        key={question.id}
                        question={question}
                        answer={answers[question.id]}
                        onAnswerChange={handleAnswerChange}
                    />
                ))}
                <div className="flex justify-end mt-6">
                    <button
                        type="submit"
                        className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
                        disabled={submitting}
                    >
                        {submitting ? 'A Submeter...' : 'Submeter Resposta'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default FormularioResponder;
