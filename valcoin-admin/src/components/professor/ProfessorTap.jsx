import React, { useState, useEffect, useMemo } from 'react';
import { Users, Target, Tag, Zap, CheckCircle, AlertCircle, Clock, Book, Sparkles, TrendingUp } from 'lucide-react';
import { getApplicableRules, applyTransactionRule, checkProfessorRuleApplicability as checkRuleApplicability } from '../../services/api';
import { toast } from 'react-toastify';

const ValCoinIcon = ({ className, size = 20 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 16" width={size} height={size} fill="currentColor" className={className}>
    <path d="M2 2 L8 14 L14 2" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M26 4 C22 4 20 6 20 8 C20 10 22 12 26 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

const ProfessorTap = ({
  users,
  transactionRules,
  onTransactionCreated,
  subjects,
  enrollments,
  professorAssignments, // Changed from disciplinaTurma
  setUsers,
  professor
}) => {
  const [selectedCategoria, setSelectedCategoria] = useState('');
  const [selectedDisciplina, setSelectedDisciplina] = useState('');
  const [selectedDestino, setSelectedDestino] = useState('');

  const [availableRules, setAvailableRules] = useState([]);
  const [ruleStatuses, setRuleStatuses] = useState({});
  const [isLoadingRules, setIsLoadingRules] = useState(false);
  const [recentTransactions, setRecentTransactions] = useState([]);

  const [filteredDestinoUsers, setFilteredDestinoUsers] = useState([]);
  const [disciplinaOptions, setDisciplinaOptions] = useState([]);

  const categorias = useMemo(() => 
    [...new Set((transactionRules || []).filter(rule => rule.ativo && rule.origem_permitida === 'PROFESSOR').map(rule => rule.categoria))]
  , [transactionRules]);

  useEffect(() => {
    const stored = localStorage.getItem('recentTransactions');
    if (stored) {
      const parsed = JSON.parse(stored);
      const now = new Date().getTime();
      const oneDayMs = 24 * 60 * 60 * 1000;
      const validTransactions = parsed.filter(t => (now - new Date(t.data_transacao).getTime()) <= oneDayMs);
      setRecentTransactions(validTransactions);
    }
  }, []);

  useEffect(() => {
    if (recentTransactions.length > 0) {
      localStorage.setItem('recentTransactions', JSON.stringify(recentTransactions));
    }
  }, [recentTransactions]);

  // Step 1: When Categoria changes, populate disciplina options and reset subsequent fields
  useEffect(() => {
    setSelectedDisciplina('');
    setSelectedDestino('');
    setFilteredDestinoUsers([]);
    setAvailableRules([]);
    setRuleStatuses({});

    if (selectedCategoria && professor) {
      const professorDisciplinas = (professorAssignments || [])
        .filter(dt => dt.professor_id === professor.id && dt.ativo)
        .map(dt => dt.disciplina_id);
      
      const options = (subjects || []).filter(s => professorDisciplinas.includes(s.id) && s.ativo);
      
      setDisciplinaOptions(options);
    } else {
      setDisciplinaOptions([]);
    }
  }, [selectedCategoria, professor, professorAssignments, subjects]);

  // Step 2: When Disciplina changes, filter destination users (students)
  useEffect(() => {
    setSelectedDestino('');
    setFilteredDestinoUsers([]);
    setAvailableRules([]);
    setRuleStatuses({});

    if (selectedDisciplina) {
      loadDestinoUsers();
    }
  }, [selectedDisciplina]);

  // Step 3: When Destino changes, load applicable rules
  useEffect(() => {
    if (selectedCategoria && professor && selectedDestino && selectedDisciplina) {
      loadAvailableRules();
    }
  }, [selectedDestino]);

  const loadDestinoUsers = () => {
    if (!selectedCategoria || !professor || !selectedDisciplina) return;

    const relevantRules = (transactionRules || []).filter(
      rule => rule.categoria === selectedCategoria && rule.origem_permitida === 'PROFESSOR' && rule.ativo
    );
    const allowedDestinoTypes = [...new Set(relevantRules.map(rule => rule.destino_permitido))];

    let destinos = (users || []).filter(
      user => user.id !== professor.id && allowedDestinoTypes.includes(user.tipo_utilizador) && user.ativo
    );

    const relevantDisciplinaTurma = (professorAssignments || []).filter(
      dt => dt.disciplina_id === selectedDisciplina && dt.ativo && dt.professor_id === professor.id
    );
    const disciplinaTurmaIds = relevantDisciplinaTurma.map(dt => dt.id);
    const enrolledStudentIds = (enrollments || [])
      .filter(e => disciplinaTurmaIds.includes(e.disciplina_turma_id) && e.ativo)
      .map(e => e.aluno_id);
    
    destinos = destinos.filter(user => enrolledStudentIds.includes(user.id));
    
    setFilteredDestinoUsers(destinos);
  };

  const loadAvailableRules = async () => {
    if (!selectedCategoria || !professor || !selectedDestino || !selectedDisciplina) {
      setAvailableRules([]);
      setRuleStatuses({});
      return;
    }

    setIsLoadingRules(true);
    try {
      const params = {
        categoria: selectedCategoria,
        origem_id: professor.id,
        origem_tipo: 'PROFESSOR',
        destino_id: selectedDestino,
        destino_tipo: (users || []).find(u => u.id === selectedDestino)?.tipo_utilizador,
        disciplina_id: selectedDisciplina,
      };

      const rules = await getApplicableRules(params);
      
      const statusPromises = rules.map(async (rule) => {
        try {
          const payload = {
            rule_id: rule.id,
            utilizador_origem_id: professor.id,
            utilizador_destino_id: selectedDestino,
            disciplina_id: rule.limite_por_disciplina ? selectedDisciplina : null,
          };
          const result = await checkRuleApplicability(payload);
          return { ruleId: rule.id, status: result };
        } catch (error) {
          const errorMessage = error.response?.data?.error || 'Erro na verificação';
          return { ruleId: rule.id, status: { can_apply: false, errors: [errorMessage] } };
        }
      });

      const statuses = await Promise.all(statusPromises);
      const statusMap = statuses.reduce((acc, { ruleId, status }) => ({ ...acc, [ruleId]: status }), {});
      
      setAvailableRules(rules);
      setRuleStatuses(statusMap);
    } catch (error) {
      toast.error('Erro ao carregar regras: ' + error.message);
    } finally {
      setIsLoadingRules(false);
    }
  };

  const handleApplyRule = async (rule) => {
    if (!professor || !selectedDestino) {
      toast.error('Selecione um destinatário.');
      return;
    }
    if (rule.limite_por_disciplina && !selectedDisciplina) {
      toast.error('Selecione uma disciplina válida.');
      return;
    }

    try {
      const payload = {
        rule_id: rule.id,
        utilizador_origem_id: professor.id,
        utilizador_destino_id: selectedDestino,
        disciplina_id: rule.limite_por_disciplina ? selectedDisciplina : undefined,
        descricao: `TAP: ${rule.nome} - ${rule.categoria}`,
        taxa_iva_ref: rule.taxa_iva_ref,
      };
      
      const newTransaction = await applyTransactionRule(payload);

      setUsers(prevUsers => {
        const updatedUsers = [...prevUsers];
        const origemIndex = updatedUsers.findIndex(u => u.id === professor.id);
        const destinoIndex = updatedUsers.findIndex(u => u.id === selectedDestino);
        if (origemIndex !== -1) updatedUsers[origemIndex].saldo -= newTransaction.montante;
        if (destinoIndex !== -1) updatedUsers[destinoIndex].saldo += newTransaction.montante;
        return updatedUsers;
      });

      setRecentTransactions(prev => [newTransaction, ...prev.slice(0, 4)]);
      toast.success('Transação criada com sucesso!');
      if (onTransactionCreated) onTransactionCreated();
      await loadAvailableRules();
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Erro ao criar transação';
      toast.error(errorMessage);
    }
  };

  const handleQuickTap = async () => {
    const firstRule = availableRules.find(rule => ruleStatuses[rule.id]?.can_apply);
    if (!firstRule) {
      toast.error('Nenhuma regra aplicável disponível');
      return;
    }
    await handleApplyRule(firstRule);
  };

  const formatCurrency = (amount) => (
    <span className="inline-flex items-center gap-1">{`${parseFloat(amount || 0).toFixed(2)}`}<ValCoinIcon className="w-4 h-4" /></span>
  );

  const formatDate = (dateString) => new Date(dateString).toLocaleString('pt-PT', {
    hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric',
  });

  const getRuleStatusIcon = (ruleId) => {
    const status = ruleStatuses[ruleId];
    if (isLoadingRules || !status) return <Clock className="w-5 h-5 text-gray-400" />;
    return status.can_apply ? <CheckCircle className="w-5 h-5 text-emerald-500" /> : <AlertCircle className="w-5 h-5 text-red-500" />;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 rounded-3xl p-8 text-white shadow-2xl">
          {/* Header content ... */}
          <div className="relative z-10">
            <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm"><Zap className="w-8 h-8" /></div>
                    <div>
                      <h1 className="text-3xl font-bold">Pagamentos Automáticos</h1>
                      <p className="text-blue-100 text-lg">Baseados em regras pré-definidas</p>
                    </div>
                  </div>
                </div>
                <button onClick={handleQuickTap} disabled={!availableRules.some(rule => ruleStatuses[rule.id]?.can_apply)} className="bg-white/20 hover:bg-white/30 disabled:bg-gray-500/20 backdrop-blur-sm border border-white/30 text-white font-bold py-3 px-6 rounded-2xl transition-all duration-300 hover:scale-105 disabled:cursor-not-allowed">
                  <div className="flex items-center gap-2"><Sparkles className="w-5 h-5" /><span>Pagar</span></div>
                </button>
            </div>
          </div>
        </div>

        <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 p-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 1. Categoria */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm font-bold text-gray-700"><Tag className="w-4 h-4 text-purple-600" />Categoria</label>
              <select
                className="w-full px-4 py-3 bg-white/80 backdrop-blur-sm border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 transition-all appearance-none cursor-pointer font-medium"
                value={selectedCategoria}
                onChange={(e) => setSelectedCategoria(e.target.value)}
                disabled={!professor}
              >
                <option value="">✨ Escolher categoria...</option>
                {categorias.map(cat => <option key={cat} value={cat}>📚 {cat}</option>)}
              </select>
            </div>

            {/* 2. Disciplina */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm font-bold text-gray-700"><Book className="w-4 h-4 text-emerald-600" />Disciplina</label>
              <select
                className="w-full px-4 py-3 bg-white/80 backdrop-blur-sm border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all appearance-none cursor-pointer font-medium"
                value={selectedDisciplina}
                onChange={(e) => setSelectedDisciplina(e.target.value)}
                disabled={!selectedCategoria || disciplinaOptions.length === 0}
              >
                <option value="">{disciplinaOptions.length === 0 ? '📋 Nenhuma disciplina' : '📚 Escolher disciplina...'}</option>
                {disciplinaOptions.map(d => <option key={d.id} value={d.id}>📖 {d.nome}</option>)}
              </select>
            </div>

            {/* 3. Utilizador de Destino */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm font-bold text-gray-700"><Target className="w-4 h-4 text-blue-600" />Aluno de Destino</label>
              <select
                className="w-full px-4 py-3 bg-white/80 backdrop-blur-sm border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none cursor-pointer font-medium"
                value={selectedDestino}
                onChange={(e) => setSelectedDestino(e.target.value)}
                disabled={!selectedDisciplina || filteredDestinoUsers.length === 0}
              >
                <option value="">👥 Escolher aluno...</option>
                {filteredDestinoUsers.map(user => <option key={user.id} value={user.id}>🎓 {user.nome}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Regras e Transações Recentes ... */}
        {selectedCategoria && selectedDestino && selectedDisciplina && (
           <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 p-8">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl"><Sparkles className="w-6 h-6 text-white" /></div>
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Regras Disponíveis</h2>
                <p className="text-gray-600">{availableRules.length} regras encontradas para {(users || []).find(u=>u.id === selectedDestino)?.nome}</p>
              </div>
            </div>
            
            {isLoadingRules ? (
              <div className="text-center py-16"><div className="relative mx-auto w-16 h-16 mb-4"><div className="absolute inset-0 border-4 border-blue-200 rounded-full"></div><div className="absolute inset-0 border-4 border-blue-600 rounded-full animate-spin border-t-transparent"></div></div><p>A carregar...</p></div>
            ) : availableRules.length === 0 ? (
              <div className="text-center py-16"><div className="p-6 bg-gray-100 rounded-full w-24 h-24 mx-auto mb-6"><AlertCircle className="w-12 h-12 text-gray-400" /></div><h3>Nenhuma regra encontrada</h3><p>Não existem regras para esta combinação.</p></div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {availableRules.map(rule => {
                  const status = ruleStatuses[rule.id];
                  const canApply = status?.can_apply || false;
                  return (
                    <div key={rule.id} className={`group relative overflow-hidden rounded-2xl transition-all duration-300 transform hover:scale-105 ${canApply ? 'bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-emerald-200 shadow-lg' : 'bg-gradient-to-br from-red-50 to-pink-50 border-2 border-red-200 text-red-800 opacity-75'}`}>
                      <div className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1"><h3 className="font-bold text-lg mb-1 text-gray-800">{rule.nome}</h3><p className="text-sm text-gray-600">{rule.categoria}</p></div>
                          <div className={`p-2 rounded-xl ${canApply ? 'bg-emerald-100' : 'bg-red-100'}`}>{getRuleStatusIcon(rule.id)}</div>
                        </div>
                        <div className="space-y-3 mb-6">
                          <div className="flex items-center justify-between"><span className="text-sm font-medium text-gray-600">Montante:</span><div className="font-bold text-xl text-emerald-600">{formatCurrency(rule.montante)}</div></div>
                          <div className="flex items-center justify-between"><span className="text-sm font-medium text-gray-600">Tipo:</span><span className={`px-3 py-1 rounded-full text-xs font-bold ${rule.tipo_transacao === 'CREDITO' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'}`}>{rule.tipo_transacao}</span></div>
                          {rule.limite_por_disciplina && <div className="flex items-center justify-between"><span className="text-sm font-medium text-gray-600">Disciplina:</span><span className="text-xs font-medium text-gray-700">{(subjects || []).find(s => s.id === selectedDisciplina)?.nome || 'N/A'}</span></div>}
                        </div>
                        {status?.limites && <div className="text-xs mb-4 p-3 rounded-xl bg-gray-100"><div className="flex items-center justify-between"><span>Limite:</span><span className="font-bold">{status.limites.limite_total - status.limites.restante}/{status.limites.limite_total} ({status.limites.periodo})</span></div><div className="w-full bg-gray-200 rounded-full h-1.5 mt-2"><div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${((status.limites.limite_total - status.limites.restante) / status.limites.limite_total) * 100}%` }}></div></div></div>}
                        {status?.errors && <div className="text-xs mb-4 p-3 bg-red-100 rounded-xl">{status.errors.map((e, i) => <div key={i} className="flex items-center gap-1 text-red-700"><AlertCircle className="w-3 h-3" />{e}</div>)}</div>}
                        <button onClick={(e) => { e.stopPropagation(); handleApplyRule(rule); }} disabled={!canApply} className={`w-full py-3 px-4 rounded-xl font-bold transition-all duration-300 ${canApply ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}>
                          {canApply ? <span className="flex items-center justify-center gap-2"><Zap className="w-4 h-4" />Aplicar</span> : 'Indisponível'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {recentTransactions.length > 0 && (
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 p-8">
             <div className="flex items-center gap-3 mb-8"><div className="p-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl"><TrendingUp className="w-6 h-6 text-white" /></div><div><h2 className="text-2xl font-bold text-gray-800">Transações Recentes</h2><p className="text-gray-600">Últimas transações desta sessão</p></div></div>
            <div className="grid gap-4">
              {recentTransactions.map(t => t && t.id && (
                <div key={t.id} className="group bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl p-6 hover:shadow-lg transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4"><div className="p-3 bg-green-100 rounded-xl"><CheckCircle className="w-6 h-6 text-green-600" /></div><div className="space-y-1"><h3 className="font-bold text-gray-800 text-lg">{t.descricao}</h3><div className="flex items-center gap-3 text-sm text-gray-600"><span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full font-medium">{t.categoria}</span><span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatDate(t.data_transacao)}</span></div></div></div>
                    <div className="text-right"><div className="text-2xl font-bold text-green-600 mb-1">+{formatCurrency(t.montante)}</div><span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${t.tipo === 'CREDITO' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'}`}>{t.tipo}</span></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfessorTap;
