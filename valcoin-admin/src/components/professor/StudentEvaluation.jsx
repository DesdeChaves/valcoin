import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-toastify';
import { Book, User, Search, TrendingUp, BarChart2 } from 'lucide-react';
import { getProfessorStudentTransactionHistory } from '../../services/api';
import ValCoinIcon from '../icons/ValCoinIcon';

const StudentEvaluation = ({ professor, users, subjects, enrollments, professorAssignments }) => {
  const [selectedDisciplina, setSelectedDisciplina] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [transactionHistory, setTransactionHistory] = useState([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const professorDisciplinas = useMemo(() => {
    if (!professor || !professorAssignments || !subjects) return [];
    const disciplinaIds = professorAssignments
      .filter(pa => pa.professor_id === professor.id && pa.ativo)
      .map(pa => pa.disciplina_id);
    return subjects.filter(s => disciplinaIds.includes(s.id) && s.ativo);
  }, [professor, professorAssignments, subjects]);

  const studentsInDisciplina = useMemo(() => {
    if (!selectedDisciplina || !enrollments || !users) return [];
    const relevantDisciplinaTurma = professorAssignments
      .filter(dt => dt.disciplina_id === selectedDisciplina && dt.professor_id === professor.id && dt.ativo)
      .map(dt => dt.id);
    const studentIds = enrollments
      .filter(e => relevantDisciplinaTurma.includes(e.disciplina_turma_id) && e.ativo)
      .map(e => e.aluno_id);
    return users.filter(u => studentIds.includes(u.id) && u.ativo);
  }, [selectedDisciplina, enrollments, users, professorAssignments, professor]);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!selectedStudent || !selectedDisciplina || !professor) return;

      setIsLoading(true);
      try {
        const data = await getProfessorStudentTransactionHistory(professor.id, selectedStudent, selectedDisciplina);
        setTransactionHistory(data.transactions || []);
        setTotal(data.total || 0);
      } catch (error) {
        toast.error('Erro ao carregar histórico de transações.');
        console.error('Error fetching transaction history:', error);
      }
      setIsLoading(false);
    };

    fetchHistory();
  }, [selectedStudent, selectedDisciplina, professor]);

  return (
    <div className="p-6 bg-gray-50 min-h-full">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Avaliação de Alunos</h1>
          <p className="text-gray-600">Consulte o histórico de recompensas por aluno e disciplina.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="md:col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
              <Book className="w-4 h-4 mr-2 text-indigo-600" />
              Disciplina
            </label>
            <select
              value={selectedDisciplina}
              onChange={(e) => {
                setSelectedDisciplina(e.target.value);
                setSelectedStudent('');
                setTransactionHistory([]);
                setTotal(0);
              }}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 bg-white"
            >
              <option value="">Selecione uma disciplina</option>
              {professorDisciplinas.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}
            </select>
          </div>
          <div className="md:col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
              <User className="w-4 h-4 mr-2 text-indigo-600" />
              Aluno
            </label>
            <select
              value={selectedStudent}
              onChange={(e) => setSelectedStudent(e.target.value)}
              disabled={!selectedDisciplina}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 bg-white disabled:bg-gray-100"
            >
              <option value="">Selecione um aluno</option>
              {studentsInDisciplina.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
            </select>
          </div>
          <div className="md:col-span-1 flex items-end">
            <div className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl p-4 shadow-lg">
              <p className="text-sm opacity-80">Total de Recompensas</p>
              <div className="flex items-center">
                <span className="text-3xl font-bold">{total.toFixed(2)}</span>
                <ValCoinIcon className="w-7 h-7 ml-2" />
              </div>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">A carregar histórico...</p>
          </div>
        ) : transactionHistory.length > 0 ? (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoria</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome da Regra</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valor</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {transactionHistory.map(tx => (
                  <tr key={tx.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{tx.categoria}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{tx.nome}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{new Date(tx.data_transacao).toLocaleString('pt-PT')}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600 flex items-center">{parseFloat(tx.montante).toFixed(2)} <ValCoinIcon className="w-4 h-4 ml-1" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : selectedStudent ? (
          <div className="text-center py-16 bg-white rounded-2xl shadow-lg border border-gray-200">
            <BarChart2 className="w-12 h-12 mx-auto text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">Sem Histórico</h3>
            <p className="mt-1 text-sm text-gray-600">Nenhuma transação encontrada para este aluno nesta disciplina.</p>
          </div>
        ) : (
            <div className="text-center py-16 bg-white rounded-2xl shadow-lg border border-gray-200">
                <Search className="w-12 h-12 mx-auto text-gray-400" />
                <h3 className="mt-4 text-lg font-medium text-gray-900">Selecione uma Disciplina e Aluno</h3>
                <p className="mt-1 text-sm text-gray-600">Escolha uma disciplina e um aluno para ver o histórico de recompensas.</p>
            </div>
        )}
      </div>
    </div>
  );
};

export default StudentEvaluation;
