import React, { useState, useEffect, useMemo } from 'react';
import { Users, Target, Tag, Zap, CheckCircle, AlertCircle, Clock, Book } from 'lucide-react';
import { toast } from 'react-toastify';
import { getApplicableRules, applyTransactionRule, checkRuleApplicability } from '../services/api';
import ValCoinIcon from './icons/ValCoinIcon';

const TapTransactions = ({
  users,
  transactionRules,
  setTransactions,
  transactions,
  defaultOrigem,
  defaultDestino,
  defaultCategoria,
  setTapOrigem,
  setTapDestino,
  setTapCategoria,
  subjects,
  enrollments,
  disciplinaTurma,
  setUsers,
}) => {
  const [selectedCategoria, setSelectedCategoria] = useState(defaultCategoria || '');
  const [selectedOrigem, setSelectedOrigem] = useState(defaultOrigem || '');
  const [selectedDisciplina, setSelectedDisciplina] = useState('');
  const [selectedDestino, setSelectedDestino] = useState(defaultDestino || '');

  const [availableRules, setAvailableRules] = useState([]);
  const [ruleStatuses, setRuleStatuses] = useState({});
  const [isLoadingRules, setIsLoadingRules] = useState(false);
  const [recentTransactions, setRecentTransactions] = useState([]);

  const [filteredOrigemUsers, setFilteredOrigemUsers] = useState([]);
  const [filteredDestinoUsers, setFilteredDestinoUsers] = useState([]);
  const [disciplinaOptions, setDisciplinaOptions] = useState([]);
  const [needsDisciplina, setNeedsDisciplina] = useState(false);

  const categorias = useMemo(() => [...new Set((transactionRules || []).filter(rule => rule.ativo).map(rule => rule.categoria))], [transactionRules]);

  // Load recent transactions from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('recentTransactions');
    if (stored) {
      const parsed = JSON.parse(stored);
      const now = new Date().getTime();
      const oneDayMs = 24 * 60 * 60 * 1000;
      const validTransactions = parsed.filter(t => {
        const transactionTime = new Date(t.data_transacao).getTime();
        return t && t.id && t.descricao && (now - transactionTime) <= oneDayMs;
      });
      setRecentTransactions(validTransactions);
    }
  }, []);

  // Save recent transactions to localStorage
  useEffect(() => {
    if (recentTransactions.length > 0) {
      localStorage.setItem('recentTransactions', JSON.stringify(recentTransactions));
    }
  }, [recentTransactions]);

  // Step 1: When Categoria changes, filter origin users and reset subsequent fields
  useEffect(() => {
    setSelectedOrigem('');
    setSelectedDisciplina('');
    setSelectedDestino('');
    setFilteredOrigemUsers([]);
    setFilteredDestinoUsers([]);
    setDisciplinaOptions([]);
    setNeedsDisciplina(false);
    setAvailableRules([]);
    setRuleStatuses({});

    if (selectedCategoria) {
      const relevantRules = (transactionRules || []).filter(rule => rule.categoria === selectedCategoria && rule.ativo);
      const allowedOrigemTypes = [...new Set(relevantRules.map(rule => rule.origem_permitida))];
      const origins = (users || []).filter(user => allowedOrigemTypes.includes(user.tipo_utilizador) && user.ativo);
      setFilteredOrigemUsers(origins);
    }
  }, [selectedCategoria, transactionRules, users]);

  // Step 2: When Origem changes, determine if disciplina is needed and reset subsequent fields
  useEffect(() => {
    setSelectedDisciplina('');
    setSelectedDestino('');
    setFilteredDestinoUsers([]);
    setDisciplinaOptions([]);
    setNeedsDisciplina(false);
    setAvailableRules([]);
    setRuleStatuses({});

    if (selectedOrigem) {
      const origemUser = (users || []).find(u => u.id === selectedOrigem);
      if (origemUser?.tipo_utilizador === 'PROFESSOR') {
        const professorDisciplinas = (disciplinaTurma || [])
          .filter(dt => dt.professor_id === selectedOrigem && dt.ativo)
          .map(dt => dt.disciplina_id);
        
        const options = (subjects || []).filter(s => professorDisciplinas.includes(s.id) && s.ativo);
        setDisciplinaOptions(options);

        const rulesForProfessor = (transactionRules || []).filter(
          rule => rule.categoria === selectedCategoria && rule.origem_permitida === 'PROFESSOR' && rule.ativo
        );
        
        if (rulesForProfessor.some(rule => rule.limite_por_disciplina)) {
          setNeedsDisciplina(true);
        } else {
          loadDestinoUsers();
        }
      } else {
        loadDestinoUsers();
      }
    }
  }, [selectedOrigem, selectedCategoria, users, disciplinaTurma, subjects, transactionRules]);

  // Step 3: When Disciplina changes, filter destination users (students)
  useEffect(() => {
    setSelectedDestino('');
    setFilteredDestinoUsers([]);
    setAvailableRules([]);
    setRuleStatuses({});

    if (selectedDisciplina) {
      loadDestinoUsers();
    }
  }, [selectedDisciplina]);

  // Step 4: When Destino changes, load applicable rules
  useEffect(() => {
    if (selectedOrigem && selectedCategoria) {
      const isReadyForRules = selectedDestino || (!needsDisciplina && selectedOrigem);
      if (isReadyForRules) {
        loadAvailableRules();
      }
    }
  }, [selectedDestino, needsDisciplina, selectedOrigem]);


  const loadDestinoUsers = () => {
    if (!selectedOrigem || !selectedCategoria) return;

    const origemUser = (users || []).find(u => u.id === selectedOrigem);
    if (!origemUser) return;

    const relevantRules = (transactionRules || []).filter(
      rule => rule.categoria === selectedCategoria && rule.origem_permitida === origemUser.tipo_utilizador && rule.ativo
    );
    const allowedDestinoTypes = [...new Set(relevantRules.map(rule => rule.destino_permitido))];

    let destinos = (users || []).filter(
      user => user.id !== selectedOrigem && allowedDestinoTypes.includes(user.tipo_utilizador) && user.ativo
    );

    if (needsDisciplina && selectedDisciplina) {
      const relevantDisciplinaTurma = (disciplinaTurma || []).filter(
        dt => dt.disciplina_id === selectedDisciplina && dt.ativo
      );
      const disciplinaTurmaIds = relevantDisciplinaTurma.map(dt => dt.id);
      const enrolledStudentIds = (enrollments || [])
        .filter(e => disciplinaTurmaIds.includes(e.disciplina_turma_id) && e.ativo)
        .map(e => e.aluno_id);
      
      destinos = destinos.filter(user => enrolledStudentIds.includes(user.id));
    }
    
    setFilteredDestinoUsers(destinos);
  };

  const loadAvailableRules = async () => {
    if (!selectedOrigem || !selectedCategoria || (needsDisciplina && !selectedDisciplina)) {
      setAvailableRules([]);
      setRuleStatuses({});
      return;
    }

    setIsLoadingRules(true);
    try {
      const origemUser = (users || []).find(u => u.id === selectedOrigem);
      const destinoUser = (users || []).find(u => u.id === selectedDestino);

      const params = {
        categoria: selectedCategoria,
        origem_id: selectedOrigem,
        origem_tipo: origemUser.tipo_utilizador,
        destino_id: selectedDestino || undefined,
        destino_tipo: destinoUser?.tipo_utilizador,
        disciplina_id: needsDisciplina ? selectedDisciplina : undefined,
      };

      const rules = await getApplicableRules(params);
      
      const statusPromises = rules.map(async (rule) => {
        try {
          const payload = {
            rule_id: rule.id,
            utilizador_origem_id: selectedOrigem,
            utilizador_destino_id: selectedDestino || null,
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
      setAvailableRules([]);
      setRuleStatuses({});
    } finally {
      setIsLoadingRules(false);
    }
  };

  const handleApplyRule = async (rule) => {
    if (!selectedOrigem || !selectedDestino) {
      toast.error('Selecione um utilizador de origem e destino.');
      return;
    }
    if (rule.limite_por_disciplina && !selectedDisciplina) {
      toast.error('Selecione uma disciplina válida.');
      return;
    }

    try {
      const payload = {
        rule_id: rule.id,
        utilizador_origem_id: selectedOrigem,
        utilizador_destino_id: selectedDestino,
        disciplina_id: rule.limite_por_disciplina ? selectedDisciplina : undefined,
        descricao: `TAP: ${rule.nome} - ${rule.categoria}`,
        taxa_iva_ref: rule.taxa_iva_ref,
      };
      
      const newTransaction = await applyTransactionRule(payload);

      setUsers(prevUsers => {
        const updatedUsers = [...prevUsers];
        const origemIndex = updatedUsers.findIndex(u => u.id === selectedOrigem);
        const destinoIndex = updatedUsers.findIndex(u => u.id === selectedDestino);
        if (origemIndex !== -1) {
          updatedUsers[origemIndex].saldo -= newTransaction.montante;
        }
        if (destinoIndex !== -1) {
          updatedUsers[destinoIndex].saldo += newTransaction.montante;
        }
        return updatedUsers;
      });

      setTransactions(prev => [newTransaction, ...prev]);
      setRecentTransactions(prev => [newTransaction, ...prev.slice(0, 4)]);
      toast.success('Transação criada com sucesso!');
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
    <>{`${parseFloat(amount || 0).toFixed(2)}`}<ValCoinIcon className="w-4 h-4 inline-block" /></>
  );

  const formatDate = (dateString) => new Date(dateString).toLocaleString('pt-PT', {
    hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric',
  });

  const getRuleStatusIcon = (ruleId) => {
    const status = ruleStatuses[ruleId];
    if (isLoadingRules || !status) return <Clock className="w-4 h-4 text-gray-400" />;
    return status.can_apply ? <CheckCircle className="w-4 h-4 text-green-500" /> : <AlertCircle className="w-4 h-4 text-red-500" />;
  };

  const getRuleStatusColor = (ruleId) => {
    const status = ruleStatuses[ruleId];
    if (isLoadingRules || !status) return 'bg-gray-100 hover:bg-gray-200 text-gray-800';
    return status.can_apply ? 'bg-green-100 hover:bg-green-200 text-green-800 border-green-300' : 'bg-red-100 text-red-800 border-red-300 cursor-not-allowed';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Sistema TAP - Transações Rápidas</h2>
        <button
          onClick={handleQuickTap}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg flex items-center"
          disabled={!availableRules.some(rule => ruleStatuses[rule.id]?.can_apply)}
        >
          <Zap className="w-4 h-4 inline mr-2" />
          TAP Rápido
        </button>
      </div>

      <div className="bg-white p-6 rounded-lg border">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* 1. Categoria */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2"><Tag className="w-4 h-4 inline mr-2" />Categoria</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              value={selectedCategoria}
              onChange={(e) => setSelectedCategoria(e.target.value)}
            >
              <option value="">Selecionar categoria...</option>
              {categorias.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>

          {/* 2. Utilizador de Origem */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2"><Users className="w-4 h-4 inline mr-2" />Utilizador de Origem</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              value={selectedOrigem}
              onChange={(e) => setSelectedOrigem(e.target.value)}
              disabled={!selectedCategoria}
            >
              <option value="">Selecionar origem...</option>
              {filteredOrigemUsers.map(user => (
                <option key={user.id} value={user.id}>{user.nome} ({user.tipo_utilizador})</option>
              ))}
            </select>
          </div>

          {/* 3. Disciplina (Condicional) */}
          {needsDisciplina && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2"><Book className="w-4 h-4 inline mr-2" />Disciplina</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                value={selectedDisciplina}
                onChange={(e) => setSelectedDisciplina(e.target.value)}
                disabled={!selectedOrigem || disciplinaOptions.length === 0}
              >
                <option value="">{disciplinaOptions.length === 0 ? 'Nenhuma disciplina' : 'Selecionar disciplina...'}</option>
                {disciplinaOptions.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}
              </select>
            </div>
          )}

          {/* 4. Utilizador de Destino */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2"><Target className="w-4 h-4 inline mr-2" />Utilizador de Destino</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              value={selectedDestino}
              onChange={(e) => setSelectedDestino(e.target.value)}
              disabled={!selectedOrigem || (needsDisciplina && !selectedDisciplina)}
            >
              <option value="">Selecionar destino...</option>
              {filteredDestinoUsers.map(user => (
                <option key={user.id} value={user.id}>{user.nome} ({user.tipo_utilizador})</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Regras Disponíveis */}
      {selectedOrigem && selectedCategoria && (needsDisciplina ? selectedDisciplina : true) && selectedDestino && (
        <div className="bg-white p-6 rounded-lg border">
          <h3 className="text-lg font-medium mb-4"><Zap className="w-5 h-5 inline mr-2" />Regras Disponíveis</h3>
          {isLoadingRules ? (
            <div className="text-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div><p className="mt-2">A carregar...</p></div>
          ) : availableRules.length === 0 ? (
            <div className="text-center py-8"><p>Nenhuma regra disponível para esta combinação.</p></div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableRules.map(rule => {
                const status = ruleStatuses[rule.id];
                const canApply = status?.can_apply || false;
                return (
                  <div key={rule.id} className={`border-2 rounded-lg p-4 transition-all ${getRuleStatusColor(rule.id)}`}>
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-sm">{rule.nome}</h4>
                      {getRuleStatusIcon(rule.id)}
                    </div>
                    <div className="space-y-1 mb-3 text-xs">
                      <div className="flex justify-between"><span>Montante:</span><span className="font-medium">{formatCurrency(rule.montante)}</span></div>
                      <div className="flex justify-between"><span>Tipo:</span><span className={`px-1 rounded ${rule.tipo_transacao === 'CREDITO' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'}`}>{rule.tipo_transacao}</span></div>
                      {rule.limite_por_disciplina && <div className="flex justify-between"><span>Disciplina:</span><span>{(subjects || []).find(s => s.id === selectedDisciplina)?.nome || 'N/A'}</span></div>}
                    </div>
                    {status?.limites && <div className="text-xs text-gray-600 mb-3">Limite: {status.limites.restante}/{status.limites.limite_total} ({status.limites.periodo})</div>}
                    {status?.errors && <div className="text-xs text-red-600 mb-3">{status.errors.map((e, i) => <div key={i}>• {e}</div>)}</div>}
                    {status?.warnings && <div className="text-xs text-yellow-600 mb-3">{status.warnings.map((w, i) => <div key={i}>⚠ {w}</div>)}</div>}
                    <button onClick={() => handleApplyRule(rule)} disabled={!canApply} className={`w-full py-2 px-3 rounded-md text-sm font-medium ${canApply ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}>
                      {canApply ? `Aplicar` : 'Indisponível'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Transações Recentes */}
      {recentTransactions.length > 0 && (
        <div className="bg-white p-6 rounded-lg border">
          <h3 className="text-lg font-medium mb-4">Transações Recentes (Sessão)</h3>
          <div className="space-y-2">
            {recentTransactions.map(t => t && t.id && (
              <div key={t.id} className="flex items-center justify-between p-3 bg-green-50 border-green-200 rounded-lg">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <div>
                    <div className="text-sm font-medium">{t.descricao} ({t.categoria})</div>
                    <div className="text-xs text-gray-600">{formatDate(t.data_transacao)}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium">{formatCurrency(t.montante)}</div>
                  <div className={`text-xs px-2 py-1 rounded ${t.tipo === 'CREDITO' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'}`}>{t.tipo}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TapTransactions;
