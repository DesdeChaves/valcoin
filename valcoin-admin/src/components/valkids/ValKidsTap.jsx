import React, { useState, useEffect } from 'react';
import { getStudentTransactionRules, getStudentPayableUsers, applyStudentTransactionRule } from '../../services/api';
import { toast } from 'react-toastify';
import { BookOpen, User, Home, Award, Users, ArrowRight } from 'lucide-react';
import GraphicalError from './GraphicalError';

const categoryIcons = {
  'Materiais': <BookOpen size={48} />,
  'Colaboração e Liderança': <Users size={48} />,
  'Default': <Award size={48} />
};

const userTypeIcons = {
  'PROFESSOR': <User size={48} />,
  'ESCOLA': <Home size={48} />,
  'ALUNO': <Users size={48} />,
  'ADMIN': <Award size={48} />,
  'Default': <User size={48} />
};

const ValKidsTap = ({ student, onTransactionCreated }) => {
  const [rules, setRules] = useState([]);
  const [payableUsers, setPayableUsers] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [applicableRule, setApplicableRule] = useState(null);
  const [paymentError, setPaymentError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [studentRules, users] = await Promise.all([
          getStudentTransactionRules(),
          getStudentPayableUsers()
        ]);
        setRules(studentRules);
        setPayableUsers(users);
      } catch (error) {
        console.error('Error fetching data for ValKidsTap:', error);
        toast.error('Não foi possível carregar as opções de pagamento.');
      }
    };

    if (student) {
      fetchData();
    }
  }, [student]);

  useEffect(() => {
    setPaymentError(''); // Clear error on new selection
    if (selectedCategory && selectedUser) {
      const rule = rules.find(r => 
        r.categoria === selectedCategory.categoria &&
        r.destino_permitido === selectedUser.tipo_utilizador &&
        r.ativo
      );
      setApplicableRule(rule);
    } else {
      setApplicableRule(null);
    }
  }, [selectedCategory, selectedUser, rules]);

  const handlePayment = async () => {
    if (!applicableRule) {
      setPaymentError('Não há uma regra aplicável para esta seleção.');
      return;
    }

    if (student.saldo < applicableRule.montante) {
        setPaymentError('Não tens moedas suficientes!');
        return;
    }

    try {
      const payload = {
        rule_id: applicableRule.id,
        utilizador_origem_id: student.id,
        utilizador_destino_id: selectedUser.id,
        descricao: `Pagamento: ${applicableRule.nome}`,
        taxa_iva_ref: applicableRule.taxa_iva_ref,
      };
      await applyStudentTransactionRule(payload);
      toast.success('Pagamento realizado com sucesso!');
      onTransactionCreated();
      setSelectedCategory(null);
      setSelectedUser(null);
      setPaymentError('');
    } catch (error) {
      console.error('Erro ao realizar pagamento:', error);
      const errorMessage = error.response?.data?.error || 'Erro ao realizar pagamento.';
      setPaymentError(errorMessage);
    }
  };

  const availableCategories = [...new Map(rules.map(rule => [rule.categoria, rule])).values()];
  
  const availableUsers = selectedCategory 
    ? payableUsers.filter(user => {
        return rules.some(rule => 
          rule.categoria === selectedCategory.categoria && 
          rule.destino_permitido === user.tipo_utilizador &&
          user.id !== student.id
        );
      })
    : [];

  return (
    <div className="bg-gradient-to-br from-blue-200 to-purple-200 p-6 rounded-3xl shadow-2xl border-4 border-white">
      <h2 className="text-3xl font-bold text-purple-600 mb-6 text-center" style={{ fontFamily: '"Comic Sans MS", cursive' }}>Pagamentos Divertidos</h2>
      
      <div className="flex flex-col items-center space-y-6">
        {/* Step 1: Choose Category */}
        <div className="w-full">
          <h3 className="text-xl font-semibold text-purple-800 mb-4 text-center">1. O que queres pagar?</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {availableCategories.map(rule => (
              <button 
                key={rule.id} 
                onClick={() => setSelectedCategory(rule)}
                className={`p-4 rounded-2xl text-center transition-transform transform hover:scale-110 ${selectedCategory?.categoria === rule.categoria ? 'bg-yellow-400 ring-4 ring-yellow-200' : 'bg-white/70'}`}>
                <div className="flex justify-center text-purple-500">{categoryIcons[rule.categoria] || categoryIcons.Default}</div>
                <p className="mt-2 font-semibold text-purple-800">{rule.categoria}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Step 2: Choose User */}
        {selectedCategory && (
          <div className="w-full">
            <h3 className="text-xl font-semibold text-purple-800 my-4 text-center">2. Para quem?</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {availableUsers.map(user => (
                <button 
                  key={user.id} 
                  onClick={() => setSelectedUser(user)}
                  className={`p-4 rounded-2xl text-center transition-transform transform hover:scale-110 ${selectedUser?.id === user.id ? 'bg-yellow-400 ring-4 ring-yellow-200' : 'bg-white/70'}`}>
                  <div className="flex justify-center text-purple-500">{userTypeIcons[user.tipo_utilizador] || userTypeIcons.Default}</div>
                  <p className="mt-2 font-semibold text-purple-800">{user.nome}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Payment Button */}
        {applicableRule && (
          <div className="flex flex-col items-center pt-6">
            <div className="flex items-center text-2xl font-bold text-purple-800">
              <span>{categoryIcons[selectedCategory.categoria] || categoryIcons.Default}</span>
              <ArrowRight size={32} className="mx-4" />
              <span>{userTypeIcons[selectedUser.tipo_utilizador] || userTypeIcons.Default}</span>
            </div>
            <button 
              onClick={handlePayment}
              className="mt-6 bg-green-500 text-white font-bold text-2xl px-12 py-6 rounded-full shadow-lg hover:bg-green-600 transition-transform transform hover:scale-110 animate-pulse"
            >
              Pagar {applicableRule.montante} Moedas!
            </button>
            {paymentError && <GraphicalError />}
          </div>
        )}
      </div>
    </div>
  );
};

export default ValKidsTap;
