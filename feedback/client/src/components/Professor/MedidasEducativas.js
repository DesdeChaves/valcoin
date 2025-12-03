import React, { useState, useEffect, useMemo } from 'react';
import * as medidasService from '../../services/medidasEducativasService';
import Modal from '../Layout/Modal'; // Assuming a generic Modal component exists

// Form component for creating/editing a measure
const MedidaForm = ({ medida, onSave, onCancel, studentId, subjects }) => {
    const [formData, setFormData] = useState({
        aluno_id: medida?.aluno_id || studentId || '',
        tipo_medida: medida?.tipo_medida || 'universal',
        disciplina_id: medida?.disciplina_id || null,
        descricao: medida?.descricao || '',
        data_inicio: medida?.data_inicio ? new Date(medida.data_inicio).toISOString().split('T')[0] : '',
        data_fim: medida?.data_fim ? new Date(medida.data_fim).toISOString().split('T')[0] : null,
        documento_referencia: medida?.documento_referencia || '',
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value === '' ? null : value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {/* Aluno is pre-selected, so no need for a dropdown here */}
            <div>
                <label htmlFor="tipo_medida" className="block text-sm font-medium text-gray-700">Tipo de Medida</label>
                <select
                    id="tipo_medida"
                    name="tipo_medida"
                    value={formData.tipo_medida}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    required
                >
                    <option value="universal">Universal</option>
                    <option value="seletiva">Seletiva</option>
                    <option value="adicional">Adicional</option>
                </select>
            </div>
            <div>
                <label htmlFor="disciplina_id" className="block text-sm font-medium text-gray-700">Disciplina (Opcional)</label>
                <select
                    id="disciplina_id"
                    name="disciplina_id"
                    value={formData.disciplina_id || ''}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                    <option value="">Todas as disciplinas</option>
                    {subjects.map(s => (
                        <option key={s.id} value={s.id}>{s.nome}</option>
                    ))}
                </select>
            </div>
            <div>
                <label htmlFor="descricao" className="block text-sm font-medium text-gray-700">Descrição</label>
                <textarea
                    id="descricao"
                    name="descricao"
                    value={formData.descricao}
                    onChange={handleChange}
                    rows="3"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    required
                ></textarea>
            </div>
            <div>
                <label htmlFor="data_inicio" className="block text-sm font-medium text-gray-700">Data de Início</label>
                <input
                    type="date"
                    id="data_inicio"
                    name="data_inicio"
                    value={formData.data_inicio}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    required
                />
            </div>
            <div>
                <label htmlFor="data_fim" className="block text-sm font-medium text-gray-700">Data de Fim (Opcional)</label>
                <input
                    type="date"
                    id="data_fim"
                    name="data_fim"
                    value={formData.data_fim || ''}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
            </div>
            <div>
                <label htmlFor="documento_referencia" className="block text-sm font-medium text-gray-700">Documento de Referência (Opcional)</label>
                <input
                    type="text"
                    id="documento_referencia"
                    name="documento_referencia"
                    value={formData.documento_referencia}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
            </div>
            <div className="flex justify-end space-x-4">
                <button type="button" onClick={onCancel} className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded">
                    Cancelar
                </button>
                <button type="submit" className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
                    Guardar
                </button>
            </div>
        </form>
    );
};


const MedidasEducativas = () => {
    const [groupedStudents, setGroupedStudents] = useState([]);
    const [studentSubjects, setStudentSubjects] = useState([]);
    const [selectedStudent, setSelectedStudent] = useState('');
    const [medidas, setMedidas] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadingMedidas, setLoadingMedidas] = useState(false);
    const [error, setError] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingMedida, setEditingMedida] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchStudents = async () => {
            setLoading(true);
            try {
                const data = await medidasService.getProfessorStudents();
                setGroupedStudents(data);
            } catch (err) {
                setError('Falha ao carregar os seus alunos.');
                console.error(err);
            }
            setLoading(false);
        };
        fetchStudents();
    }, []);

    useEffect(() => {
        if (selectedStudent) {
            fetchDataForStudent(selectedStudent);
        } else {
            setMedidas([]);
            setStudentSubjects([]);
        }
    }, [selectedStudent]);

    const filteredGroups = useMemo(() => {
        if (!searchTerm) {
            return groupedStudents;
        }
        return groupedStudents
            .map(group => {
                const filteredStudents = group.students.filter(student =>
                    student.nome.toLowerCase().includes(searchTerm.toLowerCase())
                );
                return { ...group, students: filteredStudents };
            })
            .filter(group => group.students.length > 0);
    }, [searchTerm, groupedStudents]);

    const fetchDataForStudent = async (alunoId) => {
        setLoadingMedidas(true);
        setError('');
        try {
            const [medidasData, subjectsData] = await Promise.all([
                medidasService.getMedidasByAluno(alunoId),
                medidasService.getStudentSubjects(alunoId)
            ]);
            setMedidas(medidasData);
            setStudentSubjects(subjectsData);
        } catch (err) {
            setError('Falha ao carregar os dados do aluno.');
            console.error(err);
        }
        setLoadingMedidas(false);
    };

    const handleOpenModal = (medida = null) => {
        setEditingMedida(medida);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setEditingMedida(null);
        setIsModalOpen(false);
    };

    const handleSave = async (formData) => {
        try {
            let response;
            if (editingMedida) {
                response = await medidasService.updateMedida(editingMedida.id, formData);
            } else {
                response = await medidasService.createMedida(formData);
            }

            // Handle bulk-create response
            if (response && response.message) {
                alert(response.message);
            }
            
            fetchDataForStudent(formData.aluno_id || selectedStudent);
            handleCloseModal();
        } catch (err) {
            // Extract error message from Axios response if available
            const errorMessage = err.response?.data?.error || err.message;
            setError(`Falha ao guardar a medida educativa: ${errorMessage}`);
            console.error(err);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Tem a certeza que quer apagar esta medida educativa?')) {
            try {
                await medidasService.deleteMedida(id);
                fetchDataForStudent(selectedStudent);
            } catch (err) {
                setError('Falha ao apagar a medida educativa.');
                console.error(err);
            }
        }
    };

    return (
        <div className="container mx-auto p-4">
            <h2 className="text-2xl font-bold mb-4">Gestão de Medidas Educativas</h2>

            {error && <p className="text-red-500 bg-red-100 p-3 rounded mb-4">{error}</p>}

            {loading && <p>A carregar alunos...</p>}

            <div className="mb-6">
                <label htmlFor="student-search" className="block text-sm font-medium text-gray-700">Pesquisar Aluno</label>
                <input
                    type="text"
                    id="student-search"
                    placeholder="Nome do aluno..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="mt-1 block w-full md:w-1/2 rounded-md border-gray-300 shadow-sm"
                />
                <label htmlFor="student-select" className="block text-sm font-medium text-gray-700 mt-2">Selecione um Aluno</label>
                <select
                    id="student-select"
                    value={selectedStudent}
                    onChange={(e) => setSelectedStudent(e.target.value)}
                    className="mt-1 block w-full md:w-1/2 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    disabled={loading}
                >
                    <option value="">-- Escolha um aluno --</option>
                    {filteredGroups.map(group => (
                        <optgroup key={group.turma_id} label={group.turma_nome}>
                            {group.students.map(student => (
                                <option key={student.id} value={student.id}>{student.nome}</option>
                            ))}
                        </optgroup>
                    ))}
                </select>
            </div>

            {selectedStudent && (
                <div>
                    <button
                        onClick={() => handleOpenModal()}
                        className="mb-6 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                    >
                        Adicionar Nova Medida
                    </button>

                    {loadingMedidas && <p>A carregar medidas...</p>}

                    <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                        <ul className="divide-y divide-gray-200">
                            {medidas.length > 0 ? medidas.map(medida => (
                                <li key={medida.id} className="p-4 hover:bg-gray-50">
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-indigo-600 truncate">{medida.tipo_medida.charAt(0).toUpperCase() + medida.tipo_medida.slice(1)}</p>
                                            <p className="text-sm text-gray-900">{medida.descricao}</p>
                                            <p className="text-sm text-gray-500">
                                                {medida.disciplina_nome || 'Todas as disciplinas'} | Início: {new Date(medida.data_inicio).toLocaleDateString()} {medida.data_fim ? ` | Fim: ${new Date(medida.data_fim).toLocaleDateString()}` : ''}
                                            </p>
                                        </div>
                                        <div className="ml-4 flex-shrink-0">
                                            <button onClick={() => handleOpenModal(medida)} className="font-medium text-indigo-600 hover:text-indigo-900 mr-4">Editar</button>
                                            <button onClick={() => handleDelete(medida.id)} className="font-medium text-red-600 hover:text-red-900">Apagar</button>
                                        </div>
                                    </div>
                                </li>
                            )) : (
                                !loadingMedidas && <li className="p-4 text-center text-gray-500">Nenhuma medida educativa encontrada para este aluno.</li>
                            )}
                        </ul>
                    </div>
                </div>
            )}

            {isModalOpen && (
                <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingMedida ? 'Editar Medida Educativa' : 'Adicionar Nova Medida'}>
                    <MedidaForm
                        medida={editingMedida}
                        onSave={handleSave}
                        onCancel={handleCloseModal}
                        studentId={selectedStudent}
                        subjects={studentSubjects}
                    />
                </Modal>
            )}
        </div>
    );
};

export default MedidasEducativas;
