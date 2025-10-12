import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { Zap, AlertCircle, Clock, Users, BookOpen, Coins, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import ValCoinIcon from '../icons/ValCoinIcon';

const StudentTap = ({
  student,
  onTransactionCreated,
  getStudentPayableUsers,
  getStudentTransactionRules,
  getStudentApplicableRules,
  checkStudentRuleApplicability,
  applyStudentTransactionRule,
  getClasses,
  getStudentsByClass,
}) => {
  const [localUsers, setLocalUsers] = useState([]);
  const [transactionRules, setTransactionRules] = useState([]);
  const [availableRules, setAvailableRules] = useState([]);
  const [ruleStatuses, setRuleStatuses] = useState({});
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [selectedCategoria, setSelectedCategoria] = useState(null);
  const [selectedRule, setSelectedRule] = useState(null);
  const [selectedDestino, setSelectedDestino] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [isLoadingRules, setIsLoadingRules] = useState(false);
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [studentsInClass, setStudentsInClass] = useState([]);

  useEffect(() => {
    const stored = localStorage.getItem('studentRecentTransactions');
    if (stored) {
      const parsed = JSON.parse(stored);
      const now = new Date().getTime();
      const oneDayMs = 24 * 60 * 60 * 1000;
      const validTransactions = parsed.filter(t => t && t.data_transacao && (now - new Date(t.data_transacao).getTime()) <= oneDayMs);
      setRecentTransactions(validTransactions);
    }
  }, []);

  useEffect(() => {
    if (recentTransactions.length > 0) {
      localStorage.setItem('studentRecentTransactions', JSON.stringify(recentTransactions));
    }
  }, [recentTransactions]);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [allUsers, rules, classData] = await Promise.all([
          getStudentPayableUsers(),
          getStudentTransactionRules(),
          getClasses(),
        ]);
        setLocalUsers(allUsers);
        setTransactionRules(rules);
        setClasses(classData);
      } catch (error) {
        console.error('Erro ao carregar dados iniciais:', error);
        toast.error('Erro ao carregar dados iniciais');
      }
    };
    fetchInitialData();
  }, [getStudentPayableUsers, getStudentTransactionRules, getClasses]);

  useEffect(() => {
    const loadStudentsByClass = async () => {
      if (selectedClass) {
        try {
          console.log('Loading students for class:', selectedClass);
          const students = await getStudentsByClass(selectedClass);
          console.log('Students loaded:', students);
          setStudentsInClass(students);
        } catch (error) {
          console.error('Erro ao carregar alunos da turma:', error);
          toast.error('Erro ao carregar alunos da turma');
        }
      } else {
        setStudentsInClass([]);
      }
    };
    loadStudentsByClass();
  }, [selectedClass, getStudentsByClass]);

  const loadAvailableRules = async () => {
    if (!student || !selectedCategoria) {
      console.log('Cannot load rules: missing student or categoria');
      return;
    }
    
    setIsLoadingRules(true);
    
    try {
      const params = {
        categoria: selectedCategoria,
        origem_id: student.id,
        origem_tipo: student.tipo_utilizador,
      };

      if (selectedDestino) {
        const destinoUser = localUsers.find(u => u.id === selectedDestino);
        if (destinoUser) {
          params.destino_id = selectedDestino;
          params.destino_tipo = destinoUser.tipo_utilizador;
        }
      }

      console.log('Loading student rules with params:', params);
      const rules = await getStudentApplicableRules(params);
      console.log('Fetched student rules:', rules);

      const statusPromises = rules.map(async (rule) => {
        try {
          const checkPayload = {
            rule_id: rule.id,
            utilizador_origem_id: student.id,
            utilizador_destino_id: selectedDestino || null,
            disciplina_id: rule.limite_por_disciplina ? (selectedSubject || null) : null,
          };
          
          const result = await checkStudentRuleApplicability(checkPayload);
          return { ruleId: rule.id, status: result };
        } catch (error) {
          console.error(`Error checking applicability for rule ${rule.id}:`, error);
          
          let errors = ['Erro na verificação da regra'];
          if (error.response?.data?.errors) {
            errors = error.response.data.errors;
          } else if (error.response?.data?.error) {
            errors = [error.response.data.error];
          } else if (error.message) {
            errors = [error.message];
          }
          
          return { 
            ruleId: rule.id, 
            status: { 
              can_apply: false, 
              errors: errors 
            } 
          };
        }
      });

      const statuses = await Promise.all(statusPromises);
      const statusMap = statuses.reduce((acc, { ruleId, status }) => ({ 
        ...acc, 
        [ruleId]: status 
      }), {});

      setAvailableRules(rules);
      setRuleStatuses(statusMap);
    } catch (error) {
      console.error('Erro ao carregar regras do estudante:', error);
      
      let errorMessage = 'Erro ao carregar regras disponíveis';
      if (error.response?.data?.error) {
        errorMessage += `: ${error.response.data.error}`;
      } else if (error.message) {
        errorMessage += `: ${error.message}`;
      }
      
      toast.error(errorMessage);
      setAvailableRules([]);
      setRuleStatuses({});
    } finally {
      setIsLoadingRules(false);
    }
  };

  useEffect(() => {
    loadAvailableRules();
  }, [student, selectedCategoria, selectedDestino]);

  const getRuleOptions = () => {
    if (!selectedCategoria) return [];
    return transactionRules.filter(
      rule => rule.categoria === selectedCategoria && rule.ativo
    );
  };

  const getDestinoOptions = () => {
    if (!student || !selectedCategoria) {
      console.log('No student or category selected');
      return [];
    }
    
    const relevantRules = transactionRules.filter(
      rule =>
        rule.origem_permitida === student.tipo_utilizador &&
        rule.categoria === selectedCategoria &&
        rule.ativo
    );
    
    const allowedDestinationTypes = [...new Set(relevantRules.map(rule => rule.destino_permitido))];
    const baseUsers = selectedClass ? studentsInClass : localUsers;
    
    const options = baseUsers.filter(
      user => user.id !== student.id && 
               allowedDestinationTypes.includes(user.tipo_utilizador) && 
               user.ativo
    );
    
    return options;
  };

  const handleApplyRule = async (rule) => {
    try {
      if (!student) {
        toast.error('Erro: Dados do estudante não encontrados.');
        return;
      }

      if (!selectedDestino) {
        toast.error('Por favor, selecione um utilizador de destino.');
        return;
      }

      const payload = {
        rule_id: rule.id,
        utilizador_origem_id: student.id,
        utilizador_destino_id: selectedDestino,
        descricao: `Pagamento automático: ${rule.nome}`,
        taxa_iva_ref: rule.taxa_iva_ref || null,
        disciplina_id: rule.limite_por_disciplina ? (selectedSubject || null) : null,
      };

      if (rule.limite_por_disciplina && !payload.disciplina_id) {
        toast.error('Esta regra requer a seleção de uma disciplina.');
        return;
      }

      console.log('Applying student rule with payload:', payload);
      const result = await applyStudentTransactionRule(payload);

      if (!result || !result.id || !result.descricao) {
        console.error('Invalid student transaction received:', result);
        toast.error('Transação inválida recebida do servidor.');
        return;
      }

      setRecentTransactions(prev => [result, ...prev.slice(0, 9)]);
      toast.success('Transação criada com sucesso!');
      await loadAvailableRules();

      if (onTransactionCreated) {
        onTransactionCreated();
      }
    } catch (error) {
      console.error('Erro ao aplicar regra do estudante:', error);
      
      let errorMessage = 'Erro ao criar transação';
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.data?.errors && error.response.data.errors.length > 0) {
        errorMessage = error.response.data.errors.join(', ');
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    }
  };

  const resetSelections = () => {
    setSelectedRule(null);
    setSelectedDestino(null);
    setSelectedClass(null);
    setSelectedSubject(null);
  };

  const categorias = [...new Set(transactionRules.map(rule => rule.categoria))];
  
  // Calcular as opções de destino diretamente no useMemo
  const destinoOptions = React.useMemo(() => {
    if (!student || !selectedCategoria) {
      console.log('No student or category selected');
      return [];
    }
    
    const relevantRules = transactionRules.filter(
      rule =>
        rule.origem_permitida === student.tipo_utilizador &&
        rule.categoria === selectedCategoria &&
        rule.ativo
    );
    
    console.log('Relevant rules for destino options:', relevantRules);
    
    const allowedDestinationTypes = [...new Set(relevantRules.map(rule => rule.destino_permitido))];
    console.log('Allowed destination types:', allowedDestinationTypes);
    
    // Se uma turma está selecionada, usar estudantes da turma, senão usar todos
    const baseUsers = selectedClass && studentsInClass.length > 0 ? studentsInClass : localUsers;
    console.log('Base users for filtering:', baseUsers);
    console.log('Selected class:', selectedClass);
    console.log('Students in class:', studentsInClass);
    
    const options = baseUsers.filter(
      user => user.id !== student.id && 
               allowedDestinationTypes.includes(user.tipo_utilizador) && 
               user.ativo !== false // permitir undefined ou true
    );
    
    console.log('Filtered destination options:', options);
    return options;
  }, [student, selectedCategoria, selectedClass, studentsInClass, localUsers, transactionRules]);

  const getStatusIcon = (canApply, errors) => {
    if (canApply) {
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    } else if (errors && errors.some(e => e.includes('Saldo'))) {
      return <Coins className="w-4 h-4 text-red-500" />;
    } else if (errors && errors.some(e => e.includes('Limite'))) {
      return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
    } else {
      return <XCircle className="w-4 h-4 text-red-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Transações Rápidas
            </h1>
          </div>
          <p className="text-gray-600">Efetue pagamentos automatizados usando as regras pré-configuradas</p>
        </div>

        {/* Selection Panel */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-600" />
            Configuração da Transação
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Categoria */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                Categoria
              </label>
              <select
                value={selectedCategoria || ''}
                onChange={e => {
                  setSelectedCategoria(e.target.value || null);
                  resetSelections();
                }}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 bg-white/70 backdrop-blur-sm"
              >
                <option value="">Selecione uma categoria</option>
                {categorias.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Turma */}
            {selectedCategoria && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-600" />
                  Turma
                </label>
                <select
                  value={selectedClass || ''}
                  onChange={e => {
                    setSelectedClass(e.target.value || null);
                    setSelectedDestino(null);
                  }}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 bg-white/70 backdrop-blur-sm"
                >
                  <option value="">Todas as turmas</option>
                  {classes.map(cls => (
                    <option key={cls.id} value={cls.id}>{cls.nome}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Destinatário */}
            {selectedCategoria && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  Destinatário
                </label>
                <select
                  value={selectedDestino || ''}
                  onChange={e => setSelectedDestino(e.target.value || null)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 bg-white/70 backdrop-blur-sm"
                >
                  <option value="">Selecione um destinatário</option>
                  {destinoOptions.map(user => (
                    <option key={user.id} value={user.id}>{user.nome}</option>
                  ))}
                </select>
                
                {selectedCategoria && destinoOptions.length === 0 && !selectedClass && (
                  <div className="flex items-center gap-2 text-amber-600 text-sm mt-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
                    <AlertCircle className="w-4 h-4" />
                    <span>Nenhum destinatário disponível para esta categoria</span>
                  </div>
                )}
                
                {selectedCategoria && selectedClass && studentsInClass.length === 0 && (
                  <div className="flex items-center gap-2 text-amber-600 text-sm mt-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
                    <AlertCircle className="w-4 h-4" />
                    <span>Nenhum aluno encontrado nesta turma</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Loading State */}
        {isLoadingRules && (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-8 text-center">
            <div className="flex items-center justify-center gap-3">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-indigo-600 border-t-transparent"></div>
              <span className="text-gray-600">Carregando regras disponíveis...</span>
            </div>
          </div>
        )}

        {/* Available Rules */}
        {availableRules.length > 0 && (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <Zap className="w-5 h-5 text-indigo-600" />
              Regras Disponíveis
            </h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {availableRules.map(rule => {
                const status = ruleStatuses[rule.id] || {};
                const canApply = status.can_apply;
                const errors = status.errors || [];
                const warnings = status.warnings || [];
                const limits = status.limits || {};

                return (
                  <div 
                    key={rule.id} 
                    className={`relative overflow-hidden rounded-xl border-2 transition-all duration-300 ${
                      canApply && selectedDestino
                        ? 'border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 hover:shadow-lg transform hover:scale-[1.02]'
                        : 'border-gray-200 bg-gradient-to-br from-gray-50 to-slate-50'
                    }`}
                  >
                    {/* Status Badge */}
                    <div className={`absolute top-4 right-4 p-2 rounded-full ${
                      canApply ? 'bg-green-100' : 'bg-red-100'
                    }`}>
                      {getStatusIcon(canApply, errors)}
                    </div>

                    <div className="p-6">
                      <div className="mb-4">
                        <h4 className="text-lg font-semibold text-gray-900 mb-2">{rule.nome}</h4>
                        <p className="text-sm text-gray-600 mb-3">{rule.descricao}</p>
                        
                        {/* Rule Details */}
                        <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                          <div className="flex items-center gap-1">
                            <ValCoinIcon className="w-4 h-4" />
                            <span className="font-medium">{parseFloat(rule.montante).toFixed(2)}</span>
                          </div>
                          
                          {rule.limite_valor && (
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              <span>
                                {limits.restante?.toFixed(2)} / {rule.limite_valor} ({rule.limite_periodo})
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Progress Bar for Limits */}
                        {rule.limite_valor && limits.limite_total > 0 && (
                          <div className="mb-3">
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full transition-all duration-500 ${
                                  (limits.restante / limits.limite_total) > 0.5 
                                    ? 'bg-green-500' 
                                    : (limits.restante / limits.limite_total) > 0.2 
                                    ? 'bg-yellow-500' 
                                    : 'bg-red-500'
                                }`}
                                style={{ 
                                  width: `${Math.max(0, (limits.restante / limits.limite_total) * 100)}%` 
                                }}
                              ></div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Error Messages */}
                      {errors.length > 0 && (
                        <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                          {errors.map((error, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-sm text-red-600">
                              <XCircle className="w-4 h-4 flex-shrink-0" />
                              <span>{error}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Warning Messages */}
                      {warnings.length > 0 && (
                        <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                          {warnings.map((warning, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-sm text-yellow-600">
                              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                              <span>{warning}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Action Button */}
                      <button
                        onClick={() => handleApplyRule(rule)}
                        disabled={!canApply || !selectedDestino}
                        className={`w-full py-3 px-4 rounded-xl font-semibold transition-all duration-300 ${
                          canApply && selectedDestino
                            ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 shadow-lg hover:shadow-xl transform hover:scale-105'
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        {canApply && selectedDestino ? (
                          <span className="flex items-center justify-center gap-2">
                            <Zap className="w-4 h-4" />
                            Aplicar {rule.nome}
                          </span>
                        ) : (
                          'Não Disponível'
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* No Rules Available */}
        {availableRules.length === 0 && selectedCategoria && !isLoadingRules && (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-8 text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="p-3 bg-amber-100 rounded-full">
                <AlertCircle className="w-6 h-6 text-amber-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">Nenhuma regra disponível</h3>
              <p className="text-gray-600">Não existem regras ativas para a categoria selecionada</p>
            </div>
          </div>
        )}

        {/* Recent Transactions */}
        {recentTransactions.length > 0 && (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-600" />
              Transações Recentes
            </h3>
            
            <div className="space-y-3">
              {recentTransactions.map(tx => (
                <div 
                  key={tx.id} 
                  className="bg-white/70 backdrop-blur-sm border border-gray-200 rounded-xl p-4 hover:shadow-md transition-all duration-200"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 mb-1">{tx.descricao}</p>
                      <p className="text-sm text-gray-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(tx.data_transacao).toLocaleString('pt-PT')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-bold flex items-center gap-1 ${
                        tx.tipo === 'CREDITO' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {tx.tipo === 'CREDITO' ? '+' : '-'}
                        {parseFloat(tx.montante).toFixed(2)}
                        <ValCoinIcon className="w-4 h-4" />
                      </p>
                    </div>
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

export default StudentTap;