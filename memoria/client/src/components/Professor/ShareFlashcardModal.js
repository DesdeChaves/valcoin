// src/components/Professor/ShareFlashcardModal.js

import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import * as api from '../../services/memoria.api';


const ShareFlashcardModal = ({ flashcard, onClose }) => {
    const [professorDisciplines, setProfessorDisciplines] = useState([]);
    const [sharedWith, setSharedWith] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchInitialData = useCallback(async () => {
        if (!flashcard) return;

        console.log('[ShareFlashcardModal] fetchInitialData: Starting...');
        try {
            setLoading(true);
            setError('');

            const [disciplinesRes, sharedRes] = await Promise.all([
                api.getProfessorDisciplines(),
                api.getSharedDisciplines(flashcard.id)
            ]);

            console.log('[ShareFlashcardModal] Disciplines response:', disciplinesRes);
            console.log('[ShareFlashcardModal] Shared response:', sharedRes);

            setProfessorDisciplines(disciplinesRes.data || []); 
            setSharedWith(sharedRes.data || []); // Corrected

        } catch (err) {
            console.error('[ShareFlashcardModal] Erro ao carregar dados da partilha:', err);
            setError('Não foi possível carregar as disciplinas. Tente novamente.');
            toast.error('Não foi possível carregar as disciplinas.');
        } finally {
            setLoading(false);
            console.log('[ShareFlashcardModal] fetchInitialData: Finished. Loading set to false.');
        }
    }, [flashcard]);

    useEffect(() => {
        fetchInitialData();
    }, [fetchInitialData]);

    const handleCheckboxChange = (disciplineId) => {
        setSharedWith(prev =>
            prev.includes(disciplineId)
                ? prev.filter(id => id !== disciplineId)
                : [...prev, disciplineId]
        );
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        console.log('[ShareFlashcardModal] handleSubmit: Submitting share for flashcard_id:', flashcard.id, 'with disciplines:', sharedWith);

        try {
            const response = await api.shareFlashcard(flashcard.id, sharedWith);
            console.log('[ShareFlashcardModal] Share API response:', response);
            if (response.success) {
                toast.success('Flashcard partilhado com sucesso!');
                onClose();
            } else {
                setError(response.message || 'Ocorreu um erro ao partilhar.');
                toast.error(response.message || 'Ocorreu um erro ao partilhar.');
            }
        } catch (err) {
            console.error('[ShareFlashcardModal] Erro ao guardar partilhas:', err);
            setError('Ocorreu um erro ao partilhar o flashcard.');
            toast.error('Ocorreu um erro ao partilhar.');
        } finally {
            setLoading(false);
            console.log('[ShareFlashcardModal] handleSubmit: Finished. Loading set to false.');
        }
    };

    if (!flashcard) return null;

    const otherDisciplines = professorDisciplines.filter(d => d.id !== flashcard.discipline_id);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div className="p-8 pb-6 border-b border-gray-200">
                    <h2 className="text-3xl font-bold text-indigo-900 text-center">Partilhar Flashcard</h2>
                    <p className="text-center text-gray-500 mt-2">
                        Originalmente em: <span className="font-semibold text-indigo-700">{flashcard.discipline_name}</span>
                    </p>
                </div>

                <div className="flex-1 overflow-y-auto px-8 py-6">
                    {loading && <p>A carregar disciplinas...</p>}
                    {error && <p className="text-red-500">{error}</p>}
                    
                    {!loading && !error && (
                         <form id="share-flashcard-form" onSubmit={handleSubmit} className="space-y-6">
                            <h3 className="font-semibold text-gray-800 text-xl mb-4">Partilhar também com:</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {otherDisciplines.length > 0 ? otherDisciplines.map(discipline => (
                                    <div key={discipline.id} className="flex items-center p-4 border rounded-lg hover:bg-gray-50 transition">
                                        <input
                                            type="checkbox"
                                            id={`discipline-${discipline.id}`}
                                            checked={sharedWith.includes(discipline.id)}
                                            onChange={() => handleCheckboxChange(discipline.id)}
                                            className="h-6 w-6 rounded text-indigo-600 focus:ring-indigo-500 border-gray-300"
                                        />
                                        <label htmlFor={`discipline-${discipline.id}`} className="ml-3 text-lg text-gray-700 cursor-pointer">
                                            {discipline.nome}
                                        </label>
                                    </div>
                                )) : <p className="text-gray-500 col-span-2">Não leciona outras disciplinas para partilhar.</p>}
                            </div>
                        </form>
                    )}
                </div>

                <div className="p-8 pt-6 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
                    <div className="flex justify-end gap-6">
                        <button type="button" onClick={onClose} disabled={loading} className="px-8 py-4 bg-gray-200 text-gray-800 font-semibold rounded-xl hover:bg-gray-300 transition disabled:opacity-50">
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            form="share-flashcard-form"
                            disabled={loading || otherDisciplines.length === 0}
                            className="px-10 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl disabled:opacity-50 hover:shadow-lg transition"
                        >
                            {loading ? 'A guardar...' : 'Guardar Partilhas'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ShareFlashcardModal;
