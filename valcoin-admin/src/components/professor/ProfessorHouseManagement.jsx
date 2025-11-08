
import React, { useState, useEffect, useCallback } from 'react';
import { getMyHouse, getUsers, updateHouse, manageHouseMembers, getAvailableStudentsForHouse } from '../../services/api';
import { toast } from 'react-toastify';
import { Shield, Users, Save, Loader2, Palette, FileText, Link, UserCheck, UserPlus, UserX, TrendingUp } from 'lucide-react';

// A smaller card to show key stats
const StatCard = ({ title, value, icon, color }) => (
  <div className={`bg-white p-4 rounded-lg shadow-sm border-l-4 ${color}`}>
    <div className="flex items-center">
      <div className="mr-4">{icon}</div>
      <div>
        <p className="text-sm text-gray-500">{title}</p>
        <p className="text-xl font-bold text-gray-800">{value}</p>
      </div>
    </div>
  </div>
);

const ProfessorHouseManagement = ({ currentUser }) => {
  const [house, setHouse] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [availableStudents, setAvailableStudents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingDetails, setIsSavingDetails] = useState(false);
  const [isSavingMembers, setIsSavingMembers] = useState(false);
  const [error, setError] = useState(null);

  // State for house details form
  const [detailsFormData, setDetailsFormData] = useState({ nome: '', descricao: '', cor: '#000000', valor_associado: '', logo_url: '', leader_id: '' });
  
  // State for member management
  const [currentMembers, setCurrentMembers] = useState([]);
  const [membersToAdd, setMembersToAdd] = useState([]);
  const [membersToRemove, setMembersToRemove] = useState([]);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [houseData, usersData, availableStudentsData] = await Promise.all([
        getMyHouse(), 
        getUsers(),
        getAvailableStudentsForHouse()
      ]);
      
      if (houseData && houseData.inHouse !== false) {
        setHouse(houseData);
        const leader = houseData.members?.find(m => m.role === 'lider');
        setDetailsFormData({
          nome: houseData.nome || '',
          descricao: houseData.descricao || '',
          cor: houseData.cor || '#000000',
          valor_associado: houseData.valor_associado || '',
          logo_url: houseData.logo_url || '',
          leader_id: leader ? leader.id : '',
        });
        setCurrentMembers(houseData.members || []);
      } else {
        setHouse(null);
      }
      setAllUsers(usersData || []);
      setAvailableStudents(availableStudentsData || []);
    } catch (err) {
      setError('Falha ao carregar dados. Por favor, tente novamente.');
      console.error('Error fetching data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDetailsChange = (e) => {
    const { name, value } = e.target;
    setDetailsFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveDetails = async () => {
    if (!house) return;
    setIsSavingDetails(true);
    try {
      await updateHouse(house.house_id, detailsFormData);
      toast.success('Detalhes da casa atualizados com sucesso!');
      fetchData(); // Refresh all data
    } catch (err) {
      toast.error(`Erro ao atualizar detalhes: ${err.message}`);
    } finally {
      setIsSavingDetails(false);
    }
  };

  const handleSaveMembers = async () => {
    if (!house) return;
    setIsSavingMembers(true);
    try {
      await manageHouseMembers(house.house_id, {
        members_to_add: membersToAdd,
        members_to_remove: membersToRemove,
      });
      toast.success('Membros da casa atualizados com sucesso!');
      setMembersToAdd([]);
      setMembersToRemove([]);
      fetchData(); // Refresh all data
    } catch (err) {
      toast.error(`Erro ao gerir membros: ${err.message}`);
    } finally {
      setIsSavingMembers(false);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center p-8"><Loader2 className="animate-spin h-8 w-8 text-blue-600" /></div>;
  }

  if (error) {
    return <div className="text-red-500 text-center p-8">{error}</div>;
  }

  if (!house) {
    return (
      <div className="text-center p-8 bg-white rounded-lg shadow">
        <Shield size={40} className="mx-auto text-gray-400" />
        <h3 className="mt-4 text-lg font-semibold">Não é chefe de nenhuma casa</h3>
        <p className="mt-1 text-gray-500">Não está atualmente designado como professor de uma casa.</p>
      </div>
    );
  }

  const houseStudents = currentMembers.filter(m => m.tipo_utilizador === 'ALUNO');

  return (
    <div className="space-y-8">
        <div>
            <h2 className="text-3xl font-bold text-gray-900">Gerir a Casa: {house.nome}</h2>
            <p className="text-gray-500 mt-1">Edite as propriedades, estatísticas e membros da sua casa.</p>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Saldo Total" value={`${house.total_balance.toLocaleString()} VC`} icon={<TrendingUp className="text-green-500" />} color="border-green-500" />
            <StatCard title="Membros (Alunos)" value={house.member_count} icon={<Users className="text-blue-500" />} color="border-blue-500" />
            <StatCard title="Taxa de Poupança" value={`${house.savings_percentage.toFixed(1)}%`} icon={<UserPlus className="text-yellow-500" />} color="border-yellow-500" />
            <StatCard title="Dívida Total" value={`${house.total_debt.toLocaleString()} VC`} icon={<UserX className="text-red-500" />} color="border-red-500" />
        </div>

        {/* Edit Details Form */}
        <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center"><FileText size={20} className="mr-2"/> Informação da Casa</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label htmlFor="nome" className="block text-sm font-medium text-gray-700">Nome da Casa</label>
                    <input type="text" name="nome" id="nome" value={detailsFormData.nome} onChange={handleDetailsChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
                </div>
                <div>
                    <label htmlFor="valor_associado" className="block text-sm font-medium text-gray-700">Valor Associado</label>
                    <input type="text" name="valor_associado" id="valor_associado" value={detailsFormData.valor_associado} onChange={handleDetailsChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" placeholder="ex: Coragem, Lealdade"/>
                </div>
                <div className="md:col-span-2">
                    <label htmlFor="descricao" className="block text-sm font-medium text-gray-700">Descrição</label>
                    <textarea name="descricao" id="descricao" value={detailsFormData.descricao} onChange={handleDetailsChange} rows="3" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"></textarea>
                </div>
                <div>
                    <label htmlFor="cor" className="block text-sm font-medium text-gray-700 flex items-center"><Palette size={16} className="mr-2"/> Cor</label>
                    <input type="color" name="cor" id="cor" value={detailsFormData.cor} onChange={handleDetailsChange} className="mt-1 block w-full h-10 rounded-md border-gray-300" />
                </div>
                <div>
                    <label htmlFor="logo_url" className="block text-sm font-medium text-gray-700 flex items-center"><Link size={16} className="mr-2"/> URL do Logótipo</label>
                    <input type="url" name="logo_url" id="logo_url" value={detailsFormData.logo_url} onChange={handleDetailsChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" placeholder="https://..."/>
                </div>
                 <div>
                    <label htmlFor="leader_id" className="block text-sm font-medium text-gray-700 flex items-center"><UserCheck size={16} className="mr-2"/> Líder da Casa</label>
                    <select name="leader_id" id="leader_id" value={detailsFormData.leader_id} onChange={handleDetailsChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm">
                        <option value="">-- Nenhum Líder --</option>
                        {houseStudents.map(student => (
                            <option key={student.id} value={student.id}>{student.nome}</option>
                        ))}
                    </select>
                </div>
            </div>
            <div className="flex justify-end mt-6">
                <button onClick={handleSaveDetails} disabled={isSavingDetails} className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400">
                    {isSavingDetails ? <Loader2 className="animate-spin h-5 w-5 mr-2" /> : <Save className="h-5 w-5 mr-2" />}
                    Salvar Detalhes
                </button>
            </div>
        </div>

        {/* Member Management */}
        <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center"><Users size={20} className="mr-2"/> Gerir Membros</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                    <h4 className="font-semibold mb-2">Adicionar Alunos</h4>
                    <p className="text-sm text-gray-500 mb-2">Selecione alunos disponíveis para adicionar.</p>
                    <select multiple value={membersToAdd} onChange={e => setMembersToAdd(Array.from(e.target.selectedOptions, option => option.value))} className="h-48 mt-1 block w-full rounded-md border-gray-300 shadow-sm">
                        {availableStudents.map(student => (
                            <option key={student.id} value={student.id}>{student.nome}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <h4 className="font-semibold mb-2">Remover Alunos</h4>
                    <p className="text-sm text-gray-500 mb-2">Selecione membros atuais para remover.</p>
                    <select multiple value={membersToRemove} onChange={e => setMembersToRemove(Array.from(e.target.selectedOptions, option => option.value))} className="h-48 mt-1 block w-full rounded-md border-gray-300 shadow-sm">
                        {houseStudents.map(student => (
                            <option key={student.id} value={student.id}>{student.nome}</option>
                        ))}
                    </select>
                </div>
            </div>
             <div className="flex justify-end mt-6">
                <button onClick={handleSaveMembers} disabled={isSavingMembers || (membersToAdd.length === 0 && membersToRemove.length === 0)} className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-400">
                    {isSavingMembers ? <Loader2 className="animate-spin h-5 w-5 mr-2" /> : <Save className="h-5 w-5 mr-2" />}
                    Salvar Alterações de Membros
                </button>
            </div>
        </div>
    </div>
  );
};

export default ProfessorHouseManagement;
