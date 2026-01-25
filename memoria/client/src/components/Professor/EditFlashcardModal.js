// src/components/Professor/EditFlashcardModal.js

import React, { useState, useEffect } from 'react';
import api from '../../api';

const EditFlashcardModal = ({ flashcard, onClose, onSave }) => {
    const [formData, setFormData] = useState({ ...flashcard });
    const [assuntosList, setAssuntosList] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!flashcard) return;
        console.log("EditFlashcardModal - Initial flashcard prop:", flashcard);
        setFormData({ ...flashcard });

        const fetchAssuntos = async () => {
            try {
                console.log("EditFlashcardModal - Fetching assuntos for discipline_id:", flashcard.discipline_id);
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
        console.log("EditFlashcardModal - Submitting formData:", formData);
        await onSave(formData);
        setLoading(false);
    };

    if (!flashcard) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
                {/* Header fixo */}
                <div className="p-8 pb-6 border-b border-gray-200">
                    <h2 className="text-3xl font-bold text-indigo-900 text-center">Editar Flashcard</h2>
                </div>

                {/* Conteúdo com scroll */}
                <div className="flex-1 overflow-y-auto px-8 py-6">
                    <form id="edit-flashcard-form" onSubmit={handleSubmit} className="space-y-6">
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

                        <div>
                            <label className="block font-semibold text-gray-700 mb-3">Idioma</label>
                            <select
                                name="idioma"
                                value={formData.idioma || 'pt'}
                                onChange={handleChange}
                                className="w-full p-4 border-2 border-gray-300 rounded-xl focus:border-indigo-500 text-lg"
                            >
                                <option value="pt">Português</option>
                                <option value="en">Inglês</option>
                                <option value="es">Espanhol</option>
                                <option value="fr">Francês</option>
                            </select>
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
                        {formData.type === 'spelling' && (
                            <>
                                <div>
                                    <label className="block font-semibold text-gray-700 mb-3">Palavra a soletrar</label>
                                    <input type="text" name="audio_text" value={formData.audio_text} onChange={handleChange} className="w-full p-4 border-2 border-gray-300 rounded-xl" />
                                </div>
                                <div>
                                    <label className="block font-semibold text-gray-700 mb-3">Resposta esperada</label>
                                    <input type="text" name="expected_answer" value={formData.expected_answer} onChange={handleChange} className="w-full p-4 border-2 border-gray-300 rounded-xl" />
                                </div>
                            </>
                        )}
                        {formData.type === 'cloze' && (
                            <div>
                                <label className="block font-semibold text-gray-700 mb-3">Texto Cloze</label>
                                <textarea name="cloze_text" value={formData.cloze_text} onChange={handleChange} rows="6" className="w-full p-4 border-2 border-gray-300 rounded-xl" />
                            </div>
                        )}
                        {formData.type === 'image_text' && (
                            <>
                                <div>
                                    <label className="block font-semibold text-gray-700 mb-3">Frente</label>
                                    <textarea name="front" value={formData.front} onChange={handleChange} rows="4" className="w-full p-4 border-2 border-gray-300 rounded-xl" />
                                </div>
                                <div>
                                    <label className="block font-semibold text-gray-700 mb-3">URL da Imagem da Frente</label>
                                    <input type="text" name="image_url" value={formData.image_url || ''} onChange={handleChange} className="w-full p-4 border-2 border-gray-300 rounded-xl" />
                                </div>
                                <div>
                                    <label className="block font-semibold text-gray-700 mb-3">Verso</label>
                                    <textarea name="back" value={formData.back} onChange={handleChange} rows="4" className="w-full p-4 border-2 border-gray-300 rounded-xl" />
                                </div>
                                <div>
                                    <label className="block font-semibold text-gray-700 mb-3">URL da Imagem do Verso</label>
                                    <input type="text" name="back_image_url" value={formData.back_image_url || ''} onChange={handleChange} className="w-full p-4 border-2 border-gray-300 rounded-xl" />
                                </div>
                            </>
                        )}

                        <div>
                            <label className="block font-semibold text-gray-700 mb-3">Dicas</label>
                            <textarea name="hints" value={Array.isArray(formData.hints) ? formData.hints.join('\n') : ''} onChange={e => setFormData({...formData, hints: e.target.value.split('\n')})} rows="3" className="w-full p-4 border-2 border-gray-300 rounded-xl" />
                        </div>
                    </form>
                </div>

                {/* Footer fixo */}
                <div className="p-8 pt-6 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
                    <div className="flex justify-end gap-6">
                        <button type="button" onClick={onClose} className="px-8 py-4 bg-gray-200 text-gray-800 font-semibold rounded-xl hover:bg-gray-300 transition">
                            Cancelar
                        </button>
                        <button 
                            type="submit" 
                            form="edit-flashcard-form"
                            disabled={loading} 
                            className="px-10 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl disabled:opacity-50 hover:shadow-lg transition"
                        >
                            {loading ? 'A guardar...' : 'Guardar Alterações'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EditFlashcardModal;
