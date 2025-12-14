// src/pages/QuestionariosGestao.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getQuestionarios, deleteQuestionario } from '../services/api';

const QuestionariosGestao = () => {
  const navigate = useNavigate();
  const [questionarios, setQuestionarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroCategoria, setFiltroCategoria] = useState('todos');
  const [filtroVisibilidade, setFiltroVisibilidade] = useState('todos');

  useEffect(() => {
    const carregar = async () => {
      try {
        const data = await getQuestionarios(); // backend devolve tudo
        const activeQuestionnaires = data.filter(q => q.ativo !== false);
        setQuestionarios(activeQuestionnaires);
      } catch (err) {
        alert('Erro ao carregar questionários');
      } finally {
        setLoading(false);
      }
    };
    carregar();
  }, []);

  const handleApagar = async (id, titulo) => {
    if (!window.confirm(`Apagar permanentemente "${titulo}"?`)) return;
    try {
      await deleteQuestionario(id);
      setQuestionarios(prev => prev.filter(q => q.id !== id));
      alert('Questionário apagado');
    } catch (err) {
      alert('Erro ao apagar');
    }
  };

  const handleDuplicar = (id) => {
    navigate(`/questionarios/editar/${id}`, { state: { duplicar: true } });
  };

  const filtrados = questionarios.filter(q => {
    if (filtroCategoria !== 'todos' && q.categoria !== filtroCategoria) return false;
    if (filtroVisibilidade !== 'todos' && q.visibilidade !== filtroVisibilidade) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-2xl">A carregar questionários...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">

        {/* Cabeçalho */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
          <div>
            <h1 className="text-5xl font-bold text-gray-900 mb-3">
              Gestão de Questionários
            </h1>
            <p className="text-xl text-gray-600">
              Cria, edita e organiza os teus modelos de questionário
            </p>
          </div>
          <Link
            to="/questionarios/criar"
            className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-10 py-5 rounded-2xl text-xl font-bold shadow-lg hover:shadow-2xl transition transform hover:scale-105 flex items-center gap-3"
          >
            + Criar Novo Questionário
          </Link>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-10">
          <h2 className="text-2xl font-bold mb-6">Filtros</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-lg font-medium mb-3">Categoria</label>
              <select
                value={filtroCategoria}
                onChange={(e) => setFiltroCategoria(e.target.value)}
                className="w-full px-6 py-4 py-4 border rounded-xl text-lg"
              >
                <option value="todos">Todas</option>
                <option value="avaliacao">Avaliação</option>
                <option value="quiz">Quiz/Teste</option>
                <option value="satisfacao">Satisfação</option>
                <option value="diagnostico">Diagnóstico</option>
              </select>
            </div>
            <div>
              <label className="block text-lg font-medium mb-3">Visibilidade</label>
              <select
                value={filtroVisibilidade}
                onChange={(e) => setFiltroVisibilidade(e.target.value)}
                className="w-full px-6 py-4 border rounded-xl text-lg"
              >
                <option value="todos">Todas</option>
                <option value="privado">Apenas eu</option>
                <option value="escola">Escola</option>
                <option value="publico">Público</option>
              </select>
            </div>
          </div>
        </div>

        {/* Lista */}
        {filtrados.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl shadow">
            <p className="text-2xl text-gray-600 mb-8">
              {questionarios.length === 0 
                ? 'Ainda não tens nenhum questionário criado.' 
                : 'Nenhum questionário encontrado com estes filtros.'}
            </p>
            <Link
              to="/questionarios/criar"
              className="bg-blue-600 text-white px-10 py-4 rounded-xl text-xl"
            >
              Criar o primeiro
            </Link>
          </div>
        ) : (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {filtrados.map(q => (
              <div
                key={q.id}
                className="bg-white rounded-2xl shadow-xl hover:shadow-2xl transition p-8 border border-gray-100"
              >
                <div className="flex justify-between items-start mb-6">
                  <h3 className="text-2xl font-bold text-gray-900 line-clamp-2">
                    {q.titulo}
                  </h3>
                  <span className={`px-4 py-2 rounded-full text-sm font-medium ${
                    q.visibilidade === 'publico' ? 'bg-green-100 text-green-800' :
                    q.visibilidade === 'escola' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {q.visibilidade}
                  </span>
                </div>

                {q.descricao && (
                  <p className="text-gray-600 mb-4 line-clamp-3">{q.descricao}</p>
                )}

                <div className="flex items-center gap-4 text-sm text-gray-500 mb-6">
                  <span>{q.total_perguntas || 0} perguntas</span>
                  <span>•</span>
                  <span className="capitalize">{q.categoria}</span>
                </div>

                <div className="flex gap-3">
                  <Link
                    to={`/questionarios/editar/${q.id}`}
                    className="flex-1 text-center bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium transition"
                  >
                    Editar
                  </Link>
                  <button
                    onClick={() => handleDuplicar(q.id)}
                    className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg font-medium transition"
                  >
                    Duplicar
                  </button>
                  <button
                    onClick={() => handleApagar(q.id, q.titulo)}
                    className="px-6 bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-medium transition"
                  >
                    Apagar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default QuestionariosGestao;
