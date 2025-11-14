import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import Sidebar from './Sidebar';
import Header from './Header';
import {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  getTransactions,
  createTransaction,
  approveTransaction,
  getSubjects,
  createSubject,
  updateSubject,
  softDeleteSubject, // Replaced deleteSubject
  getClasses,
  createClass,
  updateClass,
  deleteClass,
  getEnrollments,
  createAlunoTurma,
  updateAlunoTurma,
  getTransactionRules,
  createTransactionRule,
  updateTransactionRule,
  getAllCiclos,
  getAlunoTurma,
  getDisciplinaTurma,
  createDisciplinaTurma,
  getSettings,
  getSchoolRevenues,
  createSchoolRevenue,
  updateSchoolRevenue,
  deleteSchoolRevenue,
  getDashboardMetrics,
  getHouses,
  createHouse,
  updateHouse,
  manageHouseMembers,
} from '../services';
import {
  Users,
  Classes,
  Transactions,
  Subjects,
  TransactionRules,
  Dashboard,
  Settings,
  Enrollments,
  TapTransactions,
  SchoolRevenues,
  SavingsProducts,
  CreditProducts,
  StudentLoans,
  Houses,
} from './';
import ProfessorHouse from './ProfessorHouse';
import {
  UserModal,
  ClassModal,
  TransactionModal,
  SubjectModal,
  TransactionRuleModal,
  EnrollmentModal,
  StudentEnrollmentModal,
  SchoolRevenueModal,
  HouseModal,
} from './';
import { TrendingUp, Users as UsersIcon, Coins, BookOpen, GraduationCap, UserPlus, Zap, Settings as SettingsIcon, DollarSign, PiggyBank, Shield } from 'lucide-react';
import ChangePasswordModal from './ChangePasswordModal';

// Debounce utility to prevent rapid clicks
const debounce = (func, wait) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: TrendingUp, roles: ['ADMIN'] },
    { id: 'users', label: 'Utilizadores', icon: UsersIcon, roles: ['ADMIN'] },
    { id: 'transactions', label: 'Transações', icon: Coins, roles: ['ADMIN', 'PROFESSOR'] },
    { id: 'subjects', label: 'Disciplinas', icon: BookOpen, roles: ['ADMIN'] },
    { id: 'classes', label: 'Turmas', icon: GraduationCap, roles: ['ADMIN'] },
    { id: 'enrollments', label: 'Matrículas', icon: UserPlus, roles: ['ADMIN'] },
    { id: 'tapTransactions', label: 'TAP Rápido', icon: Zap, roles: ['ADMIN', 'PROFESSOR'] },
    { id: 'transaction-rules', label: 'Regras de Transação', icon: SettingsIcon, roles: ['ADMIN'] },
    { id: 'savings-products', label: 'Produtos de Poupança', icon: PiggyBank, roles: ['ADMIN'] },
    { id: 'credit-products', label: 'Produtos de Crédito', icon: PiggyBank, roles: ['ADMIN'] },
    { id: 'student-loans', label: 'Empréstimos', icon: PiggyBank, roles: ['ADMIN'] },
    { id: 'school-revenues', label: 'Receitas Próprias', icon: DollarSign, roles: ['ADMIN'] },
    { id: 'houses', label: 'Houses', icon: Shield, roles: ['ADMIN'] },
    { id: 'my-house', label: 'A minha Casa', icon: Shield, roles: ['PROFESSOR'] },
    { id: 'settings', label: 'Definições', icon: SettingsIcon, roles: ['ADMIN'] },
];

const ValCoinAdmin = ({ onLogout, currentUser }) => {
  const [alunoTurma, setAlunoTurma] = useState([]);
  const [activeTab, setActiveTab] = useState(currentUser.tipo_utilizador === 'ADMIN' ? 'dashboard' : 'my-house');
  const [users, setUsers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [transactionRules, setTransactionRules] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [ciclos, setCiclos] = useState([]);
  const [alunoDisciplina, setAlunoDisciplina] = useState([]);
  const [disciplinaTurma, setDisciplinaTurma] = useState([]);
  const [schoolRevenues, setSchoolRevenues] = useState([]);
  const [houses, setHouses] = useState([]); // Add houses state
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('create');
  const [selectedItem, setSelectedItem] = useState(null);
  const [customModal, setCustomModal] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('PENDENTE');
  const [timeFilter, setTimeFilter] = useState('all');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [error, setError] = useState(null);
  const [tapOrigem, setTapOrigem] = useState('');
  const [tapDestino, setTapDestino] = useState('');
  const [tapCategoria, setTapCategoria] = useState('');
  const [settings, setSettings] = useState(null);
  const [dashboardMetrics, setDashboardMetrics] = useState(null);
  const [isReloading, setIsReloading] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);

  const visibleTabs = tabs.filter(tab => tab.roles.includes(currentUser.tipo_utilizador));

  // Add fetchHouses function
  const fetchHouses = useCallback(async () => {
    try {
      console.log('🔄 ValCoinAdmin: Fetching houses...');
      const housesData = await getHouses(); // Using api.js
      setHouses(housesData || []);
      console.log('✅ ValCoinAdmin: Houses state updated:', housesData?.length || 0);
    } catch (err) {
      console.error('❌ ValCoinAdmin: Error fetching houses:', err);
      setHouses([]);
    }
  }, []);

  const fetchUsers = useCallback(async (force = false) => {
    setIsLoadingUsers(true);
    try {
      console.log('🔄 ValCoinAdmin: Fetching users...', { force });
      const usersData = await getUsers(force ? `?_=${Date.now()}` : '');
      console.log('📡 ValCoinAdmin: getUsers response:', usersData);
      setUsers([...(usersData || [])]);
      console.log('✅ ValCoinAdmin: Users state updated:', usersData?.length || 0);
    } catch (err) {
      console.error('❌ ValCoinAdmin: Error fetching users:', err);
      toast.error('Erro ao atualizar utilizadores.');
    } finally {
      setIsLoadingUsers(false);
    }
  }, []);

  const fetchTransactions = useCallback(async (newTimeFilter, startDate, endDate) => {
    const filter = newTimeFilter || timeFilter;
    setIsLoading(true);
    try {
      console.log(`🔄 ValCoinAdmin: Fetching transactions with time filter: ${filter}...`);
      const transactionsData = await getTransactions(filter, startDate, endDate);
      setTransactions(transactionsData || []);
      console.log('✅ ValCoinAdmin: Transactions state updated.');
      toast.success('Lista de transações atualizada!');
    } catch (err) {
      console.error('❌ ValCoinAdmin: Error fetching transactions:', err);
      toast.error('Erro ao atualizar transações.');
    } finally {
      setIsLoading(false);
    }
  }, [timeFilter]);

  const fetchDashboardMetrics = useCallback(
    async (retryCount = 3, delay = 1000) => {
      console.log('🔄 ValCoinAdmin: Starting fetchDashboardMetrics...');
      setIsReloading(true);
      setIsLoading(true);
      setError(null);

      let attempts = 0;
      while (attempts < retryCount) {
        try {
          console.log(`🔄 ValCoinAdmin: Fetching dashboard metrics (attempt ${attempts + 1}/${retryCount})...`);
          const data = await getDashboardMetrics();
          console.log('📡 ValCoinAdmin: Dashboard metrics response:', {
            rawData: data,
            valCoinDynamicEuroRate: data?.valCoinDynamicEuroRate,
            totalSchoolRevenues: data?.totalSchoolRevenues,
            totalVC: data?.totalVC,
          });

          if (
            !data ||
            typeof data.valCoinDynamicEuroRate !== 'number' ||
            typeof data.totalSchoolRevenues !== 'number' ||
            typeof data.totalVC !== 'number'
          ) {
            throw new Error(
              `Invalid dashboard data: valCoinDynamicEuroRate=${data?.valCoinDynamicEuroRate}, totalSchoolRevenues=${data?.totalSchoolRevenues}, totalVC=${data?.totalVC}`
            );
          }

          if (data.valCoinDynamicEuroRate === 0 || data.totalSchoolRevenues === 0) {
            console.warn('⚠️ ValCoinAdmin: Critical fields have zero values:', {
              valCoinDynamicEuroRate: data.valCoinDynamicEuroRate,
              totalSchoolRevenues: data.totalSchoolRevenues,
            });
          }

          setDashboardMetrics(data);
          console.log('✅ ValCoinAdmin: Dashboard metrics updated successfully');
          break;
        } catch (err) {
          attempts++;
          console.error(`❌ ValCoinAdmin: Error fetching dashboard metrics (attempt ${attempts}/${retryCount}):`, err.message);
          if (attempts === retryCount) {
            setError(`Falha ao carregar métricas do dashboard: ${err.message}`);
            toast.error('Erro ao carregar métricas do dashboard. Verifique o servidor.');
            setDashboardMetrics(null);
          } else {
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }

      setIsLoading(false);
      setIsReloading(false);
    },
    []
  );

  const debouncedFetchDashboardMetrics = useCallback(
    debounce(() => {
      if (!isReloading) {
        fetchDashboardMetrics();
      }
    }, 500),
    [fetchDashboardMetrics, isReloading]
  );

  useEffect(() => {
    console.log('🔄 ValCoinAdmin: isReloading state changed:', isReloading);
  }, [isReloading]);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        console.log('🔄 ValCoinAdmin: Fetching all data...');
        const [
          usersData,
          subjectsData,
          classesData,
          enrollmentsData,
          transactionRulesData,
          ciclosData,
          alunoTurmaData,
          disciplinaTurmaData,
          settingsData,
          schoolRevenuesData,
          dashboardData,
        ] = await Promise.all([
          getUsers().catch((e) => {
            console.error('❌ getUsers failed:', e);
            return [];
          }),
          getSubjects().catch((e) => {
            console.error('❌ getSubjects failed:', e);
            return [];
          }),
          getClasses().catch((e) => {
            console.error('❌ getClasses failed:', e);
            return [];
          }),
          getEnrollments().catch((e) => {
            console.error('❌ getEnrollments failed:', e);
            return [];
          }),
          getTransactionRules().catch((e) => {
            console.error('❌ getTransactionRules failed:', e);
            return [];
          }),
          getAllCiclos().catch((e) => {
            console.error('❌ getAllCiclos failed:', e);
            return [];
          }),
          getAlunoTurma().catch((e) => {
            console.error('❌ getAlunoTurma failed:', e);
            return [];
          }),
          getDisciplinaTurma().catch((e) => {
            console.error('❌ getDisciplinaTurma failed:', e);
            return [];
          }),
          getSettings().catch((e) => {
            console.error('❌ getSettings failed:', e);
            return null;
          }),
          getSchoolRevenues().catch((e) => {
            console.error('❌ getSchoolRevenues failed:', e);
            return [];
          }),
          getDashboardMetrics().catch((e) => {
            console.error('❌ getDashboardMetrics failed:', e);
            return null;
          }),
        ]);

        console.log('Ciclos data from API:', ciclosData);
        console.log('📊 ValCoinAdmin: Data lengths:', {
          users: usersData?.length || 0,
          subjects: subjectsData?.length || 0,
          classes: classesData?.length || 0,
          enrollments: enrollmentsData?.length || 0,
          transactionRules: transactionRulesData?.length || 0,
          ciclos: ciclosData?.length || 0,
          alunoTurma: alunoTurmaData?.length || 0,
          disciplinaTurma: disciplinaTurmaData?.length || 0,
          settings: settingsData ? 'Loaded' : 'Not Loaded',
          schoolRevenues: schoolRevenuesData?.length || 0,
          dashboardMetrics: dashboardData ? 'Loaded' : 'Not Loaded',
        });

        setUsers([...(usersData || [])]);
        setSubjects(subjectsData || []);
        setClasses(classesData || []);
        setEnrollments(enrollmentsData || []);
        setTransactionRules(transactionRulesData || []);
        setCiclos(ciclosData || []);
        setAlunoTurma(alunoTurmaData || []);
        setAlunoDisciplina(enrollmentsData || []);
        setDisciplinaTurma(disciplinaTurmaData || []);
        setSettings(settingsData);
        setSchoolRevenues(schoolRevenuesData || []);
        setDashboardMetrics(dashboardData);

        // Fetch houses
        await fetchHouses();

        if (transactionRulesData?.length && usersData?.length && !tapOrigem && !tapCategoria) {
          const firstRule = transactionRulesData.find((rule) => rule.ativo);
          if (firstRule) {
            setTapCategoria(firstRule.categoria);
            const origemUser = usersData.find(
              (user) => user.tipo_utilizador === firstRule.origem_permitida && user.ativo
            );
            if (origemUser) {
              setTapOrigem(origemUser.id);
              const destinoUser = usersData.find(
                (user) =>
                  user.tipo_utilizador === firstRule.destino_permitido &&
                  user.ativo &&
                  user.id !== origemUser.id
              );
              if (destinoUser) {
                setTapDestino(destinoUser.id);
              }
            }
          }
        }

        console.log('✅ ValCoinAdmin: State updated with data');
      } catch (err) {
        setError('Failed to load data');
        console.error('❌ ValCoinAdmin: Fetch error:', err);
        toast.error('Failed to load data');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [timeFilter, fetchHouses]);

  useEffect(() => {
    console.log('🔄 ValCoinAdmin: activeTab changed:', activeTab);
    if (activeTab === 'users') {
      console.log('🔄 ValCoinAdmin: Triggering fetchUsers for Users tab');
      fetchUsers(true);
    }
    if (activeTab === 'dashboard') {
      console.log('🔄 ValCoinAdmin: Triggering fetchDashboardMetrics for Dashboard tab');
      fetchDashboardMetrics();
    }
    if (activeTab === 'houses') {
      console.log('🔄 ValCoinAdmin: Triggering fetchHouses for Houses tab');
      fetchHouses();
    }
  }, [activeTab, fetchUsers, fetchDashboardMetrics, fetchHouses]);

  const handleSaveUser = async (formData) => {
    try {
      let updatedUsers;
      if (modalType === 'create') {
        const newUser = await createUser(formData);
        updatedUsers = [...users, newUser];
        toast.success('Utilizador criado com sucesso!');
      } else if (modalType === 'edit') {
        const updatedUser = await updateUser(selectedItem.id, formData);
        updatedUsers = users.map((user) =>
          user.id === selectedItem.id ? updatedUser : user
        );
        toast.success('Utilizador atualizado com sucesso!');
      }
      setUsers([...updatedUsers]);
      closeModal();
      if (activeTab === 'dashboard') {
        debouncedFetchDashboardMetrics();
      }
    } catch (error) {
      console.error('Error saving user:', error);
      toast.error('Erro ao salvar utilizador.');
    }
  };

  const handleDeleteUser = async () => {
    try {
      await deleteUser(selectedItem.id);
      setUsers(users.filter((user) => user.id !== selectedItem.id));
      toast.success('Utilizador excluído com sucesso!');
      closeModal();
      if (activeTab === 'dashboard') {
        debouncedFetchDashboardMetrics();
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Erro ao excluir utilizador.');
    }
  };

  const handleSaveClass = async (formData) => {
    try {
      let updatedClasses;
      if (modalType === 'create') {
        const newClass = await createClass(formData);
        updatedClasses = [...classes, newClass];
        toast.success('Turma criada com sucesso!');
      } else if (modalType === 'edit') {
        const updatedClass = await updateClass(selectedItem.id, formData);
        updatedClasses = classes.map((cls) =>
          cls.id === selectedItem.id ? updatedClass : cls
        );
        toast.success('Turma atualizada com sucesso!');
      }
      setClasses([...updatedClasses]);
      closeModal();
      if (activeTab === 'dashboard') {
        debouncedFetchDashboardMetrics();
      }
    } catch (error) {
      console.error('Error saving class:', error);
      toast.error('Erro ao salvar turma.');
    }
  };

  const handleDeleteClass = async () => {
    try {
      await deleteClass(selectedItem.id);
      setClasses(classes.filter((cls) => cls.id !== selectedItem.id));
      toast.success('Turma excluída com sucesso!');
      closeModal();
      if (activeTab === 'dashboard') {
        debouncedFetchDashboardMetrics();
      }
    } catch (error) {
      console.error('Error deleting class:', error);
      toast.error('Erro ao excluir turma.');
    }
  };

  const handleSaveTransaction = async (formData) => {
    try {
      console.log('🔄 ValCoinAdmin: Saving transaction:', formData);
      const newTransaction = await createTransaction(formData);
      setTransactions((prev) => [...prev, newTransaction]);
      console.log('✅ ValCoinAdmin: Transaction created:', newTransaction);
      await fetchUsers(true);
      toast.success('Transação criada com sucesso!');
      closeModal();
      if (activeTab === 'dashboard') {
        debouncedFetchDashboardMetrics();
      }
    } catch (error) {
      console.error('❌ ValCoinAdmin: Error saving transaction:', error);
      toast.error('Erro ao salvar transação.');
    }
  };

  const handleApproveTransaction = async (transactionId) => {
    try {
      console.log('🔄 ValCoinAdmin: Approving transaction:', transactionId);
      await approveTransaction(transactionId);
      const [updatedTransactions, updatedUsers] = await Promise.all([
        getTransactions(),
        getUsers(`?_=${Date.now()}`),
      ]);
      setTransactions(updatedTransactions);
      setUsers([...updatedUsers]);
      console.log('✅ ValCoinAdmin: Transaction approved, users updated:', updatedUsers?.length || 0);
      toast.success('Transação aprovada com sucesso!');
      if (activeTab === 'dashboard') {
        debouncedFetchDashboardMetrics();
      }
    } catch (error) {
      console.error('❌ ValCoinAdmin: Error approving transaction:', error);
      toast.error('Erro ao aprovar transação.');
    }
  };

  const handleSaveSubject = async (formData) => {
    try {
      let updatedSubjects;
      if (modalType === 'create') {
        const newSubject = await createSubject(formData);
        updatedSubjects = [...subjects, newSubject];
        toast.success('Disciplina criada com sucesso!');
      } else if (modalType === 'edit') {
        const updatedSubject = await updateSubject(selectedItem.id, formData);
        updatedSubjects = subjects.map((subject) =>
          subject.id === selectedItem.id ? updatedSubject : subject
        );
        toast.success('Disciplina atualizada com sucesso!');
      }
      setSubjects([...updatedSubjects]);
      closeModal();
      if (activeTab === 'dashboard') {
        debouncedFetchDashboardMetrics();
      }
    } catch (error) {
      console.error('Error saving subject:', error);
      toast.error('Erro ao salvar disciplina.');
    }
  };

  const handleDeleteSubject = async () => {
    try {
      await softDeleteSubject(selectedItem.id);
      setSubjects(subjects.filter((subject) => subject.id !== selectedItem.id));
      toast.success('Disciplina desativada com sucesso!');
      closeModal();
      if (activeTab === 'dashboard') {
        debouncedFetchDashboardMetrics();
      }
    } catch (error) {
      console.error('Error deleting subject:', error);
      toast.error('Erro ao desativar disciplina.');
    }
  };

  const handleSaveTransactionRule = async (formData) => {
    try {
      let updatedRules;
      if (formData.id) {
        const updatedRule = await updateTransactionRule(formData.id, formData);
        updatedRules = transactionRules.map((rule) =>
          rule.id === formData.id ? updatedRule : rule
        );
        toast.success('Regra de transação atualizada com sucesso!');
      } else {
        const newRule = await createTransactionRule(formData);
        updatedRules = [...transactionRules, newRule];
        toast.success('Regra de transação criada com sucesso!');
      }
      setTransactionRules([...updatedRules]);
      closeModal();
      if (activeTab === 'dashboard') {
        debouncedFetchDashboardMetrics();
      }
    } catch (error) {
      console.error('Error saving transaction rule:', error);
      toast.error(error.response?.data?.error || 'Erro ao salvar regra de transação.');
    }
  };

  const handleSaveSchoolRevenue = async (formData) => {
    try {
      let updatedRevenues;
      if (formData.id) {
        const updatedRevenue = await updateSchoolRevenue(formData.id, formData);
        updatedRevenues = schoolRevenues.map((revenue) =>
          revenue.id === formData.id ? updatedRevenue : revenue
        );
        toast.success('Receita atualizada com sucesso!');
      } else {
        const newRevenue = await createSchoolRevenue(formData);
        updatedRevenues = [...schoolRevenues, newRevenue];
        toast.success('Receita criada com sucesso!');
      }
      setSchoolRevenues(updatedRevenues);
      closeModal();
      if (activeTab === 'dashboard') {
        debouncedFetchDashboardMetrics();
      }
    } catch (error) {
      console.error('Error saving school revenue:', error);
      toast.error(error.response?.data?.error || 'Erro ao salvar receita.');
    }
  };

  // Add handleSaveHouse function
  const handleSaveHouse = async (formData) => {
    try {
      if (modalType === 'createHouse') {
        await createHouse(formData);
        toast.success('House criada com sucesso!');
      } else if (modalType === 'editHouse') {
        await updateHouse(selectedItem.house_id, formData);
        toast.success('House atualizada com sucesso!');
      }

      // Refresh houses data
      await fetchHouses();
      
      closeModal();
      
      if (activeTab === 'dashboard') {
        debouncedFetchDashboardMetrics();
      }
    } catch (error) {
      console.error('Error saving house:', error);
      toast.error(error.message || 'Erro ao salvar house.');
    }
  };

  const handleManageHouseMembers = async (houseId, memberData) => {
    try {
      await manageHouseMembers(houseId, memberData);
      toast.success('Membros da house atualizados com sucesso!');
      await fetchHouses(); // Refresh the list
      closeModal();
    } catch (error) {
      console.error('Error managing house members:', error);
      toast.error(error.message || 'Erro ao atualizar os membros da house.');
    }
  };

  const handleSaveEnrollment = async (formData) => {
    try {
      let updatedEnrollments;
      if (modalType === 'createAlunoTurma') {
        const newEnrollment = await createAlunoTurma(formData);
        updatedEnrollments = [...alunoTurma, newEnrollment];
        toast.success('Matrícula criada com sucesso!');
      } else if (modalType === 'editAlunoTurma') {
        const updatedEnrollment = await updateAlunoTurma(selectedItem.id, formData);
        updatedEnrollments = alunoTurma.map((enrollment) =>
          enrollment.id === selectedItem.id ? updatedEnrollment : enrollment
        );
        toast.success('Matrícula atualizada com sucesso!');
      }
      setAlunoTurma(updatedEnrollments);
      closeModal();
      if (activeTab === 'dashboard') {
        debouncedFetchDashboardMetrics();
      }
    } catch (error) {
      console.error('Error saving enrollment:', error);
      toast.error('Erro ao salvar matrícula.');
    }
  };

  const openModal = (type, item = null) => {
    console.log('Opening modal:', { type, item });
    setModalType(type);
    setSelectedItem(item);
    setCustomModal(null);
    setShowModal(true);
  };

  const openStudentEnrollmentModal = (subject) => {
    setSelectedItem(subject);
    setCustomModal('studentEnrollment');
    setShowModal(true);
  };

  const closeModal = () => {
    console.log('Closing modal');
    setShowModal(false);
    setSelectedItem(null);
    setModalType('create');
    setCustomModal(null);
  };

  const openChangePasswordModal = () => setShowChangePasswordModal(true);
  const closeChangePasswordModal = () => setShowChangePasswordModal(false);

  const renderContent = () => {
    console.log('🔄 ValCoinAdmin: renderContent called', {
      activeTab,
      dashboardMetrics: !!dashboardMetrics,
      dashboardMetricsType: typeof dashboardMetrics,
      isDashboardLoading: isLoading,
      dashboardError: error,
      isReloading,
    });

    switch (activeTab) {
      case 'dashboard':
        return (
          <div>
            <button
              onClick={() => {
                console.log('🔄 Botão recarregar clicado, isReloading:', isReloading);
                fetchDashboardMetrics();
              }}
              className="mb-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              disabled={isReloading}
            >
              {isReloading ? 'Recarregando...' : 'Recarregar Dashboard'}
            </button>
            <Dashboard
              metrics={dashboardMetrics}
              isLoading={isLoading}
              error={error}
            />
          </div>
        );
      case 'users':
        return (
          <Users
            key={`users-${users.length}-${Date.now()}`}
            users={users}
            openModal={openModal}
            isLoading={isLoadingUsers}
            refreshUsers={fetchUsers}
          />
        );
      case 'transactions':
        return (
          <Transactions
            transactions={transactions}
            setTransactions={setTransactions}
            users={users}
            openModal={openModal}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            filterStatus={filterStatus}
            setFilterStatus={setFilterStatus}
            timeFilter={timeFilter}
            setTimeFilter={setTimeFilter}
            startDate={startDate}
            setStartDate={setStartDate}
            endDate={endDate}
            setEndDate={setEndDate}
            settings={settings}
            onApprove={handleApproveTransaction}
            refreshTransactions={fetchTransactions}
          />
        );
// In ValCoinAdmin.jsx, update the 'tapTransactions' case in renderContent
case 'tapTransactions':
  console.log('🔄 ValCoinAdmin: Rendering TapTransactions with props:', {
    users: users?.length || 0,
    subjects: subjects?.length || 0,
    enrollments: enrollments?.length || 0,
    disciplinaTurma: disciplinaTurma?.length || 0,
    transactionRules: transactionRules?.length || 0,
    tapOrigem,
    tapDestino,
    tapCategoria,
  });
  return (
    <TapTransactions
      users={users}
      setUsers={setUsers}
      transactionRules={transactionRules}
      setTransactions={setTransactions}
      transactions={transactions}
      defaultOrigem={tapOrigem}
      defaultDestino={tapDestino}
      defaultCategoria={tapCategoria}
      setTapOrigem={setTapOrigem}
      setTapDestino={setTapDestino}
      setTapCategoria={setTapCategoria}
      subjects={subjects}
      enrollments={enrollments}
      disciplinaTurma={disciplinaTurma}
    />
  );
      case 'subjects':
        return (
          <Subjects
            subjects={subjects}
            setSubjects={setSubjects}
            openModal={openModal}
            openStudentEnrollmentModal={openStudentEnrollmentModal}
          />
        );
      case 'classes':
        return (
          <Classes
            classes={classes}
            setClasses={setClasses}
            users={users}
            openModal={openModal}
            ciclos={ciclos}
            isLoading={isLoading}
            error={error}
          />
        );
      case 'enrollments':
        console.log('Rendering enrollments with:', {
          alunoTurmaLength: alunoTurma?.length,
          usersLength: users?.length,
          classesLength: classes?.length,
          openModalType: typeof openModal,
        });
        return (
          <Enrollments
            alunoTurma={alunoTurma}
            setAlunoTurma={setAlunoTurma}
            users={users}
            classes={classes}
            openModal={openModal}
          />
        );
      case 'transaction-rules':
        return (
          <TransactionRules
            transactionRules={transactionRules}
            setTransactionRules={setTransactionRules}
            openModal={openModal}
            settings={settings}
          />
        );
      case 'savings-products':
        return <SavingsProducts />;
      case 'credit-products':
        return <CreditProducts />;
      case 'student-loans':
        return <StudentLoans />;
      case 'houses':
        return (
          <Houses 
            openModal={openModal}
            users={users}
            houses={houses}
            refreshHouses={fetchHouses}
          />
        );
      case 'my-house':
        return (
          <ProfessorHouse
            openModal={openModal}
            currentUser={currentUser}
          />
        );
      case 'school-revenues':
        return (
          <SchoolRevenues
            schoolRevenues={schoolRevenues}
            setSchoolRevenues={setSchoolRevenues}
            openModal={openModal}
          />
        );
      case 'settings':
        return <Settings />;
      default:
        return (
          <div>
            <button
              onClick={() => {
                console.log('🔄 Botão recarregar clicado (default), isReloading:', isReloading);
                fetchDashboardMetrics();
              }}
              className="mb-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              disabled={isReloading}
            >
              {isReloading ? 'Recarregando...' : 'Recarregar Dashboard'}
            </button>
            <Dashboard
              metrics={dashboardMetrics}
              isLoading={isLoading}
              error={error}
            />
          </div>
        );
    }
  };

  const renderModal = () => {
    if (!showModal) return null;

    if (customModal === 'studentEnrollment') {
      return (
        <StudentEnrollmentModal
          showModal={showModal}
          closeModal={closeModal}
          subject={selectedItem}
          users={users}
          classes={classes}
          setEnrollments={setEnrollments}
          alunoDisciplina={alunoDisciplina}
          setAlunoDisciplina={setAlunoDisciplina}
          disciplinaTurma={disciplinaTurma}
          setDisciplinaTurma={setDisciplinaTurma}
        />
      );
    }

    if (modalType === 'createAlunoTurma' || modalType === 'editAlunoTurma') {
      return (
        <EnrollmentModal
          showModal={showModal}
          closeModal={closeModal}
          modalType={modalType}
          selectedItem={selectedItem}
          users={users}
          classes={classes}
          setAlunoTurma={setAlunoTurma}
          onSave={handleSaveEnrollment}
        />
      );
    }

    switch (activeTab) {
      case 'users':
        return (
          <UserModal
            showModal={showModal}
            closeModal={closeModal}
            modalType={modalType}
            selectedItem={selectedItem}
            onSave={handleSaveUser}
            onDelete={handleDeleteUser}
          />
        );
      case 'transactions':
        return (
          <TransactionModal
            showModal={showModal}
            closeModal={closeModal}
            modalType={modalType}
            selectedItem={selectedItem}
            users={users}
            setTransactions={setTransactions}
            onSave={handleSaveTransaction}
            onApprove={handleApproveTransaction}
            settings={settings}
          />
        );
      case 'subjects':
        return (
          <SubjectModal
            showModal={showModal}
            closeModal={closeModal}
            modalType={modalType}
            selectedItem={selectedItem}
            setSubjects={setSubjects}
            users={users}
            classes={classes}
            setAlunoDisciplina={setAlunoDisciplina}
            setDisciplinaTurma={setDisciplinaTurma}
            alunoDisciplina={alunoDisciplina}
            disciplinaTurma={disciplinaTurma}
            alunoTurma={alunoTurma}
          />
        );
      case 'classes':
        return (
          <ClassModal
            showModal={showModal}
            closeModal={closeModal}
            modalType={modalType}
            selectedItem={selectedItem}
            onSave={handleSaveClass}
            onDelete={handleDeleteClass}
            ciclos={ciclos}
            users={users}
          />
        );
      case 'transaction-rules':
        return (
          <TransactionRuleModal
            showModal={showModal}
            onClose={closeModal}
            modalType={modalType}
            rule={selectedItem}
            onSave={handleSaveTransactionRule}
          />
        );
      case 'school-revenues':
        return (
          <SchoolRevenueModal
            showModal={showModal}
            onClose={closeModal}
            revenue={selectedItem}
            onSave={handleSaveSchoolRevenue}
          />
        );
      case 'houses':
      case 'my-house':
        // Handle different house modal types
        if (modalType === 'createHouse' || modalType === 'editHouse' || modalType === 'viewHouse') {
          return (
            <HouseModal
              isOpen={showModal}
              onClose={closeModal}
              onSuccess={handleSaveHouse} // For house details
              onManageMembers={handleManageHouseMembers} // For members
              houseData={modalType === 'createHouse' ? null : selectedItem}
              users={users}
              currentUser={currentUser}
            />
          );
        }
        return null;
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar tabs={visibleTabs} activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header currentUser={currentUser} openChangePasswordModal={openChangePasswordModal} onLogout={onLogout} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-6">
          {isLoading && <p>Loading...</p>}
          {error && <p className="text-red-500">{error}</p>}
          {renderContent()}
          {renderModal()}
          <ChangePasswordModal showModal={showChangePasswordModal} closeModal={closeChangePasswordModal} />
        </main>
      </div>
    </div>
  );
};

export default ValCoinAdmin;
