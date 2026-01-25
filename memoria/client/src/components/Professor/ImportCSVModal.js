import React, { useState, useCallback } from 'react';
import * as api from '../../services/memoria.api';
import { Upload, File, X, Loader2 } from 'lucide-react';

const ImportCSVModal = ({ disciplineId, assuntoName, onClose, onImportSuccess }) => {
    const [file, setFile] = useState(null);
    const [importing, setImporting] = useState(false);
    const [error, setError] = useState('');
    const [isDragging, setIsDragging] = useState(false);

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            setFile(selectedFile);
            setError('');
        }
    };

    const handleDragOver = useCallback((e) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        setIsDragging(false);
        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile && droppedFile.type === 'text/csv') {
            setFile(droppedFile);
            setError('');
        } else {
            setError('Por favor, solte um ficheiro CSV válido.');
        }
    }, []);

    const handleImport = async () => {
        if (!file) {
            setError('Por favor, selecione um ficheiro CSV.');
            return;
        }

        setImporting(true);
        setError('');

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('discipline_id', disciplineId);
            if (assuntoName) {
                formData.append('assunto_name', assuntoName);
            }

            await api.importFlashcardsCSV(formData);

            onImportSuccess();
            onClose();
        } catch (err) {
            console.error('Erro ao importar CSV:', err);
            setError(err.response?.data?.message || 'Erro ao importar o ficheiro CSV.');
        } finally {
            setImporting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl p-8 max-w-lg w-full transform transition-all">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-800">Importar Flashcards de CSV</h2>
                    <button onClick={onClose} className="p-2 text-gray-500 hover:text-gray-800">
                        <X size={24} />
                    </button>
                </div>

                <div className="space-y-4">
                    <p className="text-gray-600">
                        Selecione um ficheiro CSV para importar. O ficheiro deve ter o seguinte formato:
                    </p>
                    <ul className="text-sm text-gray-500 list-disc list-inside bg-gray-50 p-3 rounded">
                        <li>Utilize a vírgula (<code>,</code>) como separador de colunas.</li>
                        <li>Cada linha pode ser um flashcard ou uma definição de data/assunto.</li>
                        <li>
                            **Para definir data de agendamento e assunto (opcional):** Use o formato <code>dd-mm-yyyy, Nome do Assunto</code>.
                            Por exemplo: <code>"01-10-2025", "Átomos e Misturas"</code>. Se o assunto for omitido, a data será aplicada aos flashcards seguintes.
                        </li>
                        <li>
                            **Para flashcards:** Use o formato <code>Frente do Flashcard, Verso do Flashcard</code>.
                            Por exemplo: <code>"Qual é a capital de Portugal?", "Lisboa"</code>.
                        </li>
                        <li>Novas datas/assuntos podem ser adicionadas em qualquer linha para alterar o agendamento dos flashcards seguintes.</li>
                        <li>Flashcards sem uma data explícita serão agendados para a data da importação.</li>
                    </ul>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Ficheiro CSV</label>
                        <div className="flex items-center justify-center w-full">
                            <label
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                className={`flex flex-col w-full h-32 border-4 border-dashed hover:bg-gray-100 hover:border-gray-300 ${isDragging ? 'border-indigo-600 bg-indigo-50' : ''}`}
                            >
                                <div className="flex flex-col items-center justify-center pt-7">
                                    <Upload className="w-8 h-8 text-gray-400" />
                                    <p className="pt-1 text-sm tracking-wider text-gray-400 group-hover:text-gray-600">
                                        {file ? file.name : 'Arraste e solte ou clique para selecionar'}
                                    </p>
                                </div>
                                <input type="file" className="opacity-0" accept=".csv" onChange={handleFileChange} />
                            </label>
                        </div>
                    </div>

                    {error && <p className="text-red-500 text-sm">{error}</p>}

                    <div className="flex justify-end gap-4 pt-4">
                        <button
                            onClick={onClose}
                            className="px-6 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleImport}
                            disabled={importing}
                            className="px-6 py-2 text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:bg-indigo-300 flex items-center"
                        >
                            {importing ? (
                                <>
                                    <Loader2 className="animate-spin h-5 w-5 mr-2" />
                                    A Importar...
                                </>
                            ) : (
                                'Importar'
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ImportCSVModal;

