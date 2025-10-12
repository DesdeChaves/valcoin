import React, { useState, useEffect } from 'react';
import { X, Shield, Users, UserCheck, Palette, FileText, Link, UserPlus, UserX } from 'lucide-react';
import { getHouse, getAvailableStudentsForHouse } from '../services/api';

const HouseModal = ({ isOpen, onClose, onSuccess, onManageMembers, houseData, users = [], currentUser }) => {
    const [formData, setFormData] = useState({
        nome: '',
        cor: '#4B5563',
        valor_associado: '',
        descricao: '',
        logo_url: '',
        professor_id: '',
        leader_id: '',
        members: [],
    });
    const [professors, setProfessors] = useState([]);
    const [students, setStudents] = useState([]);
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Member management state
    const [currentMembers, setCurrentMembers] = useState([]);
    const [availableStudents, setAvailableStudents] = useState([]);
    const [studentToAdd, setStudentToAdd] = useState('');
    const [membersToAdd, setMembersToAdd] = useState([]);
    const [membersToRemove, setMembersToRemove] = useState([]);
    const [isLoadingDetails, setIsLoadingDetails] = useState(false);

    useEffect(() => {
        if (users && users.length > 0) {
            const professorList = users.filter(u => u.tipo_utilizador === 'PROFESSOR' && u.ativo);
            setProfessors(professorList);
        }
    }, [users]);

    useEffect(() => {
        const fetchAvailableStudents = async () => {
            try {
                const data = await getAvailableStudentsForHouse();
                setAvailableStudents(data);
            } catch (err) {
                console.error("Falha ao carregar os alunos disponíveis", err);
            }
        };

        if (isOpen) {
            fetchAvailableStudents();
        }
    }, [isOpen]);

    useEffect(() => {
        const resetForm = () => {
            setFormData({
                nome: '', cor: '#4B5563', valor_associado: '', descricao: '',
                logo_url: '', professor_id: '', leader_id: '', members: [],
            });
            setCurrentMembers([]);
            setMembersToAdd([]);
            setMembersToRemove([]);
            setError('');
        };

        if (isOpen && houseData && houseData.house_id) {
            setIsLoadingDetails(true);
            getHouse(houseData.house_id)
                .then(fullHouse => {
                    setFormData({
                        nome: fullHouse.nome || '',
                        cor: fullHouse.cor || '#4B5563',
                        valor_associado: fullHouse.valor_associado || '',
                        descricao: fullHouse.descricao || '',
                        logo_url: fullHouse.logo_url || '',
                        professor_id: fullHouse.members?.find(m => m.role === 'professor')?.id || '',
                        leader_id: fullHouse.members?.find(m => m.role === 'lider')?.id || '',
                        members: fullHouse.members?.filter(m => m.role === 'aluno').map(m => m.id) || [],
                    });
                    setCurrentMembers(fullHouse.members || []);
                    // Also add current house students to the list of available students for leader change
                    const houseStudents = fullHouse.members?.filter(m => m.tipo_utilizador === 'ALUNO');
                    setStudents(houseStudents);

                })
                .catch(err => {
                    console.error("Falha ao carregar os detalhes da casa:", err);
                    setError("Falha ao carregar os detalhes completos da casa. A gestão de membros pode estar incompleta.");
                    setFormData({
                        nome: houseData.nome || '', cor: houseData.cor || '#4B5563', valor_associado: houseData.valor_associado || '',
                        descricao: houseData.descricao || '', logo_url: houseData.logo_url || '',
                    });
                    setCurrentMembers(houseData.members || []);
                })
                .finally(() => setIsLoadingDetails(false));
        } else if (isOpen) {
            resetForm();
            const studentList = users.filter(u => u.tipo_utilizador === 'ALUNO' && u.ativo);
            setStudents(studentList);
        }
    }, [houseData, isOpen, users]);


    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleMemberSelect = (e) => {
        const selectedIds = Array.from(e.target.selectedOptions, option => option.value);
        setFormData(prev => ({ ...prev, members: selectedIds }));
    };

    const handleAddMember = () => {
        if (!studentToAdd) return;
        const student = availableStudents.find(u => u.id === studentToAdd);
        if (student && !currentMembers.some(m => m.id === student.id)) {
            setCurrentMembers(prev => [...prev, { ...student, role: 'aluno'}]);
            setMembersToAdd(prev => [...prev, student.id]);
            setStudentToAdd('');
        }
    };

    const handleRemoveMember = (memberId) => {
        const member = currentMembers.find(m => m.id === memberId);
        if (member) {
            setCurrentMembers(prev => prev.filter(m => m.id !== memberId));
            setMembersToRemove(prev => [...prev, memberId]);
        }
    };

    const handleSaveMemberChanges = async () => {
        setIsSubmitting(true);
        try {
            await onManageMembers(houseData.house_id, { members_to_add: membersToAdd, members_to_remove: membersToRemove });
            setMembersToAdd([]);
            setMembersToRemove([]);
        } catch (err) {
            setError(err.message || 'Falha ao guardar as alterações dos membros.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (!formData.nome.trim()) {
            setError('O nome da casa é obrigatório');
            return;
        }
        setIsSubmitting(true);
        try {
            await onSuccess(formData);
        } catch (err) {
            setError(err.message || 'Ocorreu um erro.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col">
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <div className="flex items-center space-x-3">
                        <div className="p-2 bg-blue-100 rounded-lg"><Shield className="w-6 h-6 text-blue-600" /></div>
                        <h2 className="text-xl font-semibold text-gray-900">{houseData ? 'Editar Casa' : 'Criar Nova Casa'}</h2>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"><X size={20} /></button>
                </div>

                <div className="flex-grow overflow-y-auto">
                    <form onSubmit={handleSubmit} className="p-6 space-y-6">
                        {/* Basic Information */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2"><FileText size={18} /> Informação Básica</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="nome" className="block text-sm font-medium text-gray-700 mb-1">Nome da Casa *</label>
                                    <input type="text" name="nome" id="nome" value={formData.nome} onChange={handleChange} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="ex: Gryffindor" />
                                </div>
                                <div>
                                    <label htmlFor="valor_associado" className="block text-sm font-medium text-gray-700 mb-1">Valor Associado</label>
                                    <input type="text" name="valor_associado" id="valor_associado" value={formData.valor_associado} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="ex: Coragem, Sabedoria" />
                                </div>
                            </div>
                            <div>
                                <label htmlFor="descricao" className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                                <textarea name="descricao" id="descricao" value={formData.descricao} onChange={handleChange} rows="3" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Descreva as características da casa..."></textarea>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="cor" className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2"><Palette size={16} /> Cor da Casa</label>
                                    <div className="flex items-center space-x-3">
                                        <input type="color" name="cor" id="cor" value={formData.cor} onChange={handleChange} className="w-16 h-10 border border-gray-300 rounded-lg cursor-pointer" />
                                        <input type="text" value={formData.cor} onChange={(e) => handleChange({ target: { name: 'cor', value: e.target.value } })} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="#4B5563" />
                                    </div>
                                </div>
                                <div>
                                    <label htmlFor="logo_url" className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2"><Link size={16} /> URL do Logótipo</label>
                                    <input type="url" name="logo_url" id="logo_url" value={formData.logo_url} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="https://exemplo.com/logo.png" />
                                </div>
                            </div>
                        </div>

                        {/* Role Assignments (shown for create, or for edit if admin) */}
                        {( !houseData || (houseData && currentUser.tipo_utilizador === 'ADMIN') ) && (
                            <div className="space-y-4">
                                <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2"><Users size={18} /> Atribuição de Papéis</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="professor_id" className="block text-sm font-medium text-gray-700 mb-1">Professor da Casa</label>
                                        <select name="professor_id" id="professor_id" value={formData.professor_id} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100" disabled={houseData && currentUser && currentUser.tipo_utilizador !== 'ADMIN'}>
                                            <option value="">Selecione um professor</option>
                                            {professors.map(p => (<option key={p.id} value={p.id}>{p.nome}</option>))}
                                        </select>
                                    </div>
                                    <div>
                                        <label htmlFor="leader_id" className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2"><UserCheck size={16} /> Líder da Casa (Aluno)</label>
                                        <select name="leader_id" id="leader_id" value={formData.leader_id} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" disabled={houseData && currentUser.tipo_utilizador !== 'ADMIN'}>
                                            <option value="">Selecione um líder</option>
                                            {students.map(s => (<option key={s.id} value={s.id}>{s.nome}</option>))}
                                        </select>
                                    </div>
                                </div>
                                { !houseData && (
                                <div>
                                    <label htmlFor="members" className="block text-sm font-medium text-gray-700 mb-1">Membros da Casa (Alunos)</label>
                                    <select name="members" id="members" multiple value={formData.members} onChange={handleMemberSelect} className="w-full h-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                                        {availableStudents.map(s => (<option key={s.id} value={s.id}>{s.nome}</option>))}
                                    </select>
                                    <p className="text-xs text-gray-500 mt-1">Pressione Ctrl (Cmd em Mac) para selecionar vários alunos</p>
                                </div>
                                )}
                            </div>
                        )}
                        
                        {error && (<div className="p-3 bg-red-50 border border-red-200 rounded-lg"><p className="text-sm text-red-600">{error}</p></div>)}

                        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                            <button type="button" onClick={onClose} disabled={isSubmitting} className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50">Cancelar</button>
                            <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2">
                                {isSubmitting ? 'A guardar...' : (houseData ? 'Atualizar Detalhes da Casa' : 'Criar Casa')}
                            </button>
                        </div>
                    </form>

                    {houseData && !isLoadingDetails && (
                        <div className="p-6 border-t border-gray-200">
                            <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2 mb-4"><Users size={18} /> Gerir Membros</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <h4 className="font-semibold mb-2">Membros Atuais ({currentMembers.length})</h4>
                                    <div className="space-y-2 max-h-60 overflow-y-auto border rounded-lg p-2 bg-gray-50">
                                        {currentMembers.map(member => (
                                            <div key={member.id} className="flex items-center justify-between bg-white p-2 rounded shadow-sm">
                                                <div>
                                                    <p className="font-medium">{member.nome}</p>
                                                    <p className="text-xs text-gray-500 capitalize">{member.role || 'aluno'}</p>
                                                </div>
                                                <button onClick={() => handleRemoveMember(member.id)} className="p-1 text-red-500 hover:bg-red-100 rounded"><UserX size={16} /></button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <h4 className="font-semibold mb-2">Adicionar Aluno</h4>
                                    <div className="flex items-center gap-2">
                                        <select value={studentToAdd} onChange={(e) => setStudentToAdd(e.target.value)} className="flex-grow px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                                            <option value="">Selecione um aluno...</option>
                                            {availableStudents.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                                        </select>
                                        <button onClick={handleAddMember} className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600"><UserPlus size={20} /></button>
                                    </div>
                                </div>
                            </div>
                            {(membersToAdd.length > 0 || membersToRemove.length > 0) && (
                                <div className="mt-6 flex justify-end">
                                    <button onClick={handleSaveMemberChanges} disabled={isSubmitting} className="px-4 py-2 bg-green-600 text-white hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2">
                                        {isSubmitting ? 'A guardar...' : `Guardar ${membersToAdd.length} Adições & ${membersToRemove.length} Remoções`}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                     {isLoadingDetails && <div className="p-6 text-center">A carregar detalhes dos membros...</div>}
                </div>
            </div>
        </div>
    );
};

export default HouseModal;
