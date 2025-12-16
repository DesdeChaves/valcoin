// src/components/Professor/EditFlashcardModal.js

import React, { useState, useEffect } from 'react';
import api from '../../api';

const EditFlashcardModal = ({ flashcard, onClose, onSave }) => {
    const [formData, setFormData] = useState({ ...flashcard });
    const [assuntosList, setAssuntosList] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!flashcard) return;
        console.log("EditFlashcardModal - Initial flashcard prop:", flashcard); // Added log
        setFormData({ ...flashcard });

        const fetchAssuntos = async () => {
            try {
                // Check discipline_id here again
                console.log("EditFlashcardModal - Fetching assuntos for discipline_id:", flashcard.discipline_id); // Added log
                if (!flashcard.discipline_id) {
                    console.error("EditFlashcardModal: flashcard.discipline_id is missing when fetching assuntos.");
                    return;
                }
                const response = await api.get(`/assuntos/disciplina/${flashcard.discipline_id}`);
                setAssuntosList(response.data.data);
            } catch (err) {
                console.error('Erro ao carregar assuntos:', err);
            }
        };

        fetchAssuntos();
    }, [flashcard]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        console.log("EditFlashcardModal - Submitting formData:", formData); // Added log
        await onSave(formData);
        setLoading(false);
    };

    if (!flashcard) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-2xl p-10 max-w-3xl w-full">
                <h2 className="text-3xl font-bold text-indigo-900 mb-8 text-center">Editar Flashcard</h2>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Common Fields */}
                    <div>
                        <label className="block font-semibold text-gray-700 mb-3">Assunto</label>
                        <input
                            type="text"
                            name="assunto_name"
                            list="assuntos-list"
                            value={formData.assunto_name || ''}
                            onChange={handleChange}
                            className="w-full p-4 border-2 border-gray-300 rounded-xl focus:border-indigo-500 text-lg"
                        />
                        <datalist id="assuntos-list">
                            {assuntosList.map(assunto => (
                                <option key={assunto.id} value={assunto.name} />
                            ))}
                        </datalist>
                    </div>

                    {/* Type-specific fields */}
                    {formData.type === 'basic' && (
                        <>
                            <div>
                                <label className="block font-semibold text-gray-700 mb-3">Frente</label>
                                <textarea name="front" value={formData.front} onChange={handleChange} rows="4" className="w-full p-4 border-2 border-gray-300 rounded-xl" />
                            </div>
                            <div>
                                <label className="block font-semibold text-gray-700 mb-3">Verso</label>
                                <textarea name="back" value={formData.back} onChange={handleChange} rows="4" className="w-full p-4 border-2 border-gray-300 rounded-xl" />
                            </div>
                        </>
                    )}
                    {formData.type === 'cloze' && (
                        <div>
                            <label className="block font-semibold text-gray-700 mb-3">Texto Cloze</label>
                            <textarea name="cloze_text" value={formData.cloze_text} onChange={handleChange} rows="6" className="w-full p-4 border-2 border-gray-300 rounded-xl" />
                        </div>
                    )}
                    {/* TODO: Add image_occlusion editor if needed */}

                    <div>
                        <label className="block font-semibold text-gray-700 mb-3">Dicas</label>
                        <textarea name="hints" value={Array.isArray(formData.hints) ? formData.hints.join('\n') : ''} onChange={e => setFormData({...formData, hints: e.target.value.split('\n')})} rows="3" className="w-full p-4 border-2 border-gray-300 rounded-xl" />
                    </div>

                    <div className="flex justify-end gap-6 pt-6">
                        <button type="button" onClick={onClose} className="px-8 py-4 bg-gray-200 text-gray-800 font-semibold rounded-xl hover:bg-gray-300">
                            Cancelar
                        </button>
                        <button type="submit" disabled={loading} className="px-10 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl disabled:opacity-50">
                            {loading ? 'A guardar...' : 'Guardar Alterações'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditFlashcardModal;
