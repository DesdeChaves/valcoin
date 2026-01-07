import React, { useState, useEffect, useMemo } from 'react';
import * as medidasService from '../../services/medidasEducativasService';
import Modal from '../Layout/Modal';

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
        <div className="space-y-6">
            <div>
                <label htmlFor="tipo_medida" className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de Medida
                </label>
                <select
                    id="tipo_medida"
                    name="tipo_medida"
                    value={formData.tipo_medida}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    required
                >
                    <option value="universal">Universal</option>
                    <option value="seletiva">Seletiva</option>
                    <option value="adicional">Adicional</option>
                </select>
            </div>

            <div>
                <label htmlFor="disciplina_id" className="block text-sm font-medium text-gray-700 mb-2">
                    Disciplina (Opcional)
                </label>
                <select
                    id="disciplina_id"
                    name="disciplina_id"
                    value={formData.disciplina_id || ''}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                    <option value="">Todas as disciplinas</option>
                    {subjects.map(s => (
                        <option key={s.id} value={s.id}>{s.nome}</option>
                    ))}
                </select>
            </div>

            <div>
                <label htmlFor="descricao" className="block text-sm font-medium text-gray-700 mb-2">
                    Descrição
                </label>
                <textarea
                    id="descricao"
                    name="descricao"
                    value={formData.descricao}
                    onChange={handleChange}
                    rows="4"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    required
                ></textarea>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="data_inicio" className="block text-sm font-medium text-gray-700 mb-2">
                        Data de Início
                    </label>
                    <input
                        type="date"
                        id="data_inicio"
                        name="data_inicio"
                        value={formData.data_inicio}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        required
                    />
                </div>

                <div>
                    <label htmlFor="data_fim" className="block text-sm font-medium text-gray-700 mb-2">
                        Data de Fim (Opcional)
                    </label>
                    <input
                        type="date"
                        id="data_fim"
                        name="data_fim"
                        value={formData.data_fim || ''}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                </div>
            </div>

            <div>
                <label htmlFor="documento_referencia" className="block text-sm font-medium text-gray-700 mb-2">
                    Documento de Referência (Opcional)
                </label>
                <input
                    type="text"
                    id="documento_referencia"
                    name="documento_referencia"
                    value={formData.documento_referencia}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Ex: RTP 2024/25"
                />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
                <button 
                    type="button" 
                    onClick={onCancel} 
                    className="px-6 py-2 bg-gray-500 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors"
                >
                    Cancelar
                </button>
                <button 
                    type="button"
                    onClick={handleSubmit} 
                    className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors"
                >
                    Guardar
                </button>
            </div>
        </div>
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

            if (response && response.message) {
                const notification = document.createElement('div');
                notification.className = 'fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50';
                notification.textContent = response.message;
                document.body.appendChild(notification);
                setTimeout(() => notification.remove(), 3000);
            }
            
            fetchDataForStudent(formData.aluno_id || selectedStudent);
            handleCloseModal();
        } catch (err) {
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
                
                const notification = document.createElement('div');
                notification.className = 'fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50';
                notification.textContent = 'Medida educativa apagada com sucesso!';
                document.body.appendChild(notification);
                setTimeout(() => notification.remove(), 3000);
            } catch (err) {
                setError('Falha ao apagar a medida educativa.');
                console.error(err);
            }
        }
    };

    const getTipoMedidaBadgeClass = (tipo) => {
        switch (tipo) {
            case 'universal':
                return 'bg-blue-100 text-blue-800';
            case 'seletiva':
                return 'bg-yellow-100 text-yellow-800';
            case 'adicional':
                return 'bg-purple-100 text-purple-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const selectedStudentName = useMemo(() => {
        for (const group of groupedStudents) {
            const student = group.students.find(s => s.id === parseInt(selectedStudent));
            if (student) return student.nome;
        }
        return '';
    }, [selectedStudent, groupedStudents]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <svg className="animate-spin h-12 w-12 text-indigo-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="text-gray-600">A carregar...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-6 py-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-semibold text-gray-800">Medidas Educativas</h1>
                            <p className="text-sm text-gray-500 mt-1">Gestão de medidas educativas por aluno</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-6">
                {error && (
                    <div className="mb-6 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-start">
                        <svg className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                        <span>{error}</span>
                    </div>
                )}

                <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">Seleção de Aluno</h2>
                    
                    <div className="mb-4">
                        <label htmlFor="student-search" className="block text-sm font-medium text-gray-700 mb-2">
                            Pesquisar Aluno
                        </label>
                        <div className="relative">
                            <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <input
                                type="text"
                                id="student-search"
                                placeholder="Nome do aluno..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            />
                        </div>
                    </div>

                    <div>
                        <label htmlFor="student-select" className="block text-sm font-medium text-gray-700 mb-2">
                            Selecione um Aluno
                        </label>
                        <select
                            id="student-select"
                            value={selectedStudent}
                            onChange={(e) => setSelectedStudent(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
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
                </div>

                {selectedStudent && (
                    <div>
                        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-xl font-semibold text-gray-800">{selectedStudentName}</h2>
                                    <p className="text-sm text-gray-500 mt-1">
                                        {medidas.length} {medidas.length === 1 ? 'medida educativa' : 'medidas educativas'}
                                    </p>
                                </div>
                                <button
                                    onClick={() => handleOpenModal()}
                                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors shadow-lg"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    Adicionar Medida
                                </button>
                            </div>
                        </div>

                        {loadingMedidas ? (
                            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                                <svg className="animate-spin h-10 w-10 text-indigo-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <p className="text-gray-600">A carregar medidas...</p>
                            </div>
                        ) : (
                            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                                {medidas.length > 0 ? (
                                    <div className="divide-y divide-gray-200">
                                        {medidas.map(medida => (
                                            <div key={medida.id} className="p-6 hover:bg-gray-50 transition-colors">
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-3 mb-3">
                                                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getTipoMedidaBadgeClass(medida.tipo_medida)}`}>
                                                                {medida.tipo_medida.charAt(0).toUpperCase() + medida.tipo_medida.slice(1)}
                                                            </span>
                                                            <span className="text-sm text-gray-500">
                                                                {medida.disciplina_nome || 'Todas as disciplinas'}
                                                            </span>
                                                        </div>
                                                        
                                                        <p className="text-gray-900 mb-3 leading-relaxed">{medida.descricao}</p>
                                                        
                                                        <div className="flex items-center gap-4 text-sm text-gray-500">
                                                            <div className="flex items-center gap-1">
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                                </svg>
                                                                <span>Início: {new Date(medida.data_inicio).toLocaleDateString('pt-PT')}</span>
                                                            </div>
                                                            {medida.data_fim && (
                                                                <div className="flex items-center gap-1">
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                                    </svg>
                                                                    <span>Fim: {new Date(medida.data_fim).toLocaleDateString('pt-PT')}</span>
                                                                </div>
                                                            )}
                                                            {medida.documento_referencia && (
                                                                <div className="flex items-center gap-1">
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                                    </svg>
                                                                    <span>{medida.documento_referencia}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="flex items-center gap-2 ml-4">
                                                        <button 
                                                            onClick={() => handleOpenModal(medida)} 
                                                            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                            title="Editar"
                                                        >
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                            </svg>
                                                        </button>
                                                        <button 
                                                            onClick={() => handleDelete(medida.id)} 
                                                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                            title="Apagar"
                                                        >
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-12 text-center">
                                        <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        <p className="text-gray-500 text-lg">Nenhuma medida educativa encontrada</p>
                                        <p className="text-gray-400 text-sm mt-2">Adicione a primeira medida educativa para este aluno</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {isModalOpen && (
                <Modal 
                    isOpen={isModalOpen} 
                    onClose={handleCloseModal} 
                    title={editingMedida ? 'Editar Medida Educativa' : 'Adicionar Nova Medida'}
                >
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
