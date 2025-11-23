import React, { useState, useEffect } from 'react';
import { CheckCircle, Circle, TrendingUp, TrendingDown, Award, AlertCircle, Calendar, Users, BookOpen, Target, ChevronDown, ChevronUp, Loader } from 'lucide-react';
import { toast } from 'react-toastify';
import useAuth from '../../hooks/useAuth';
import { getStudentCrisucessoFeedback } from '../../utils/api';

const CriterioCard = ({ criterio, expanded, onToggle }) => {
  const progressoPercentual = (criterio.ultima_pontuacao / 10) * 100;
  const nivelAceitavelPercentual = (criterio.nivel_aceitavel / 10) * 100;

  const getStatusColor = () => {
    if (criterio.atingiu_sucesso) return 'text-emerald-600';
    if (criterio.ultima_pontuacao >= criterio.nivel_aceitavel - 1) return 'text-amber-600';
    return 'text-red-600';
  };
  
  const getStatusBg = () => {
    if (criterio.atingiu_sucesso) return 'bg-emerald-50 border-emerald-200';
    if (criterio.ultima_pontuacao >= criterio.nivel_aceitavel - 1) return 'bg-amber-50 border-amber-200';
    return 'bg-red-50 border-red-200';
  };

  const getTendencia = () => {
    if (criterio.historico.length < 2) return null;
    const ultimaDuas = criterio.historico.slice(-2);
    const diferenca = parseFloat(ultimaDuas[1].pontuacao) - parseFloat(ultimaDuas[0].pontuacao);
    return diferenca;
  };

  const tendencia = getTendencia();

  return (
    <div className={`bg-white rounded-2xl border-2 ${criterio.atingiu_sucesso ? 'border-emerald-200' : 'border-slate-200'} overflow-hidden transition-all duration-300 hover:shadow-lg`}>
      {/* Header */}
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              {criterio.atingiu_sucesso ? (
                <CheckCircle className="w-6 h-6 text-emerald-600 flex-shrink-0" />
              ) : (
                <Circle className="w-6 h-6 text-slate-400 flex-shrink-0" />
              )}
              <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                {criterio.codigo}
              </span>
              {criterio.tipo_criterio === 'transversal' && (
                <span className="text-xs font-semibold text-purple-600 bg-purple-50 px-3 py-1 rounded-full">
                  Transversal
                </span>
              )}
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">{criterio.nome}</h3>
            <p className="text-sm text-slate-600 leading-relaxed">{criterio.descricao}</p>
          </div>
          
          <div className="flex flex-col items-end gap-2 ml-4">
            <div className={`text-3xl font-bold ${getStatusColor()}`}>
              {criterio.ultima_pontuacao.toFixed(1)}
            </div>
            {tendencia !== null && (
              <div className={`flex items-center gap-1 text-sm font-semibold ${tendencia >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {tendencia >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                {tendencia >= 0 ? '+' : ''}{tendencia.toFixed(1)}
              </div>
            )}
          </div>
        </div>

        {/* Barra de Progresso */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs text-slate-600 mb-2">
            <span>Progresso</span>
            <span>Objetivo: {parseFloat(criterio.nivel_aceitavel).toFixed(1)}</span>
          </div>
          <div className="relative h-3 bg-slate-100 rounded-full overflow-hidden">
            <div 
              className={`absolute inset-y-0 left-0 ${criterio.atingiu_sucesso ? 'bg-emerald-500' : 'bg-blue-500'} transition-all duration-500 rounded-full`}
              style={{ width: `${progressoPercentual}%` }}
            ></div>
            <div 
              className="absolute inset-y-0 border-l-2 border-dashed border-slate-400"
              style={{ left: `${nivelAceitavelPercentual}%` }}
            ></div>
          </div>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-slate-50 rounded-xl p-3">
            <div className="flex items-center gap-2 text-slate-600 mb-1">
              <Calendar className="w-4 h-4" />
              <span className="text-xs font-medium">Desde</span>
            </div>
            <div className="text-sm font-bold text-slate-900">{criterio.ano_escolaridade_inicial}º ano</div>
          </div>
          
          <div className="bg-slate-50 rounded-xl p-3">
            <div className="flex items-center gap-2 text-slate-600 mb-1">
              <Users className="w-4 h-4" />
              <span className="text-xs font-medium">Departamentos</span>
            </div>
            <div className="text-sm font-bold text-slate-900">{criterio.total_departamentos}</div>
          </div>
          
          <div className="bg-slate-50 rounded-xl p-3">
            <div className="flex items-center gap-2 text-slate-600 mb-1">
              <Target className="w-4 h-4" />
              <span className="text-xs font-medium">Avaliações</span>
            </div>
            <div className="text-sm font-bold text-slate-900">{criterio.total_avaliacoes}</div>
          </div>
        </div>

        {/* Status Badge */}
        <div className={`${getStatusBg()} border-2 rounded-xl p-4`}>
          <div className="flex items-center gap-3">
            {criterio.atingiu_sucesso ? (
              <>
                <Award className={`w-5 h-5 ${getStatusColor()}`} />
                <div className="flex-1">
                  <div className={`font-bold ${getStatusColor()} mb-1`}>Critério Alcançado! 🎉</div>
                  {criterio.data_conclusao &&
                    <div className="text-xs text-slate-600">
                      Concluído em {new Date(criterio.data_conclusao).toLocaleDateString('pt-PT')}
                    </div>
                  }
                </div>
              </>
            ) : (
              <>
                <AlertCircle className={`w-5 h-5 ${getStatusColor()}`} />
                <div className="flex-1">
                  <div className={`font-bold ${getStatusColor()} mb-1`}>Em Desenvolvimento</div>
                  <div className="text-xs text-slate-600">
                    Faltam {(parseFloat(criterio.nivel_aceitavel) - criterio.ultima_pontuacao).toFixed(1)} pontos para atingir o objetivo
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Toggle Histórico */}
        <button
          onClick={onToggle}
          className="w-full mt-4 flex items-center justify-center gap-2 text-blue-600 hover:text-blue-700 font-semibold text-sm py-2 hover:bg-blue-50 rounded-lg transition-colors"
        >
          {expanded ? (
            <>
              <span>Ocultar Histórico</span>
              <ChevronUp className="w-4 h-4" />
            </>
          ) : (
            <>
              <span>Ver Histórico Completo</span>
              <ChevronDown className="w-4 h-4" />
            </>
          )}
        </button>
      </div>

      {/* Histórico Expandido */}
      {expanded && (
        <div className="border-t border-slate-200 bg-slate-50 p-6">
          <h4 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Histórico de Avaliações
          </h4>
          <div className="space-y-3">
            {criterio.historico.length > 0 ? criterio.historico.map((aval, idx) => (
              <div key={idx} className="bg-white rounded-xl p-4 border border-slate-200">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="font-semibold text-slate-900 mb-1">{aval.disciplina}</div>
                    <div className="text-xs text-slate-600">{aval.professor}</div>
                  </div>
                  <div className="text-right">
                    <div className={`text-2xl font-bold ${parseFloat(aval.pontuacao) >= parseFloat(criterio.nivel_aceitavel) ? 'text-emerald-600' : 'text-slate-900'}`}>
                      {parseFloat(aval.pontuacao).toFixed(1)}
                    </div>
                    {idx > 0 && (
                      <div className={`text-xs font-semibold ${(parseFloat(aval.pontuacao) - parseFloat(criterio.historico[idx-1].pontuacao)) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {(parseFloat(aval.pontuacao) - parseFloat(criterio.historico[idx-1].pontuacao)) >= 0 ? '+' : ''}{(parseFloat(aval.pontuacao) - parseFloat(criterio.historico[idx-1].pontuacao)).toFixed(1)}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <span>{new Date(aval.data).toLocaleDateString('pt-PT')}</span>
                  <span>•</span>
                  <span>{aval.periodo}</span>
                </div>
              </div>
            )) : <p className="text-slate-500 text-sm">Ainda não existem avaliações para este critério.</p>}
          </div>
        </div>
      )}
    </div>
  );
};

export default function CriSucessoFeedbackPage() {
  const { user } = useAuth();
  const [criterios, setCriterios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('todos'); // 'todos', 'concluidos', 'em_progresso'
  const [expandidos, setExpandidos] = useState({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await getStudentCrisucessoFeedback();
        setCriterios(data);
      } catch (error) {
        toast.error("Não foi possível carregar os dados dos critérios de sucesso.");
        console.error("Failed to fetch success criteria feedback:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const toggleExpanded = (id) => {
    setExpandidos(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const criteriosFiltrados = criterios.filter(c => {
    if (filtro === 'concluidos') return c.atingiu_sucesso;
    if (filtro === 'em_progresso') return !c.atingiu_sucesso;
    return true;
  });

  const estatisticas = {
    total: criterios.length,
    concluidos: criterios.filter(c => c.atingiu_sucesso).length,
    emProgresso: criterios.filter(c => !c.atingiu_sucesso).length,
    mediaGeral: criterios.length > 0 ? (criterios.reduce((acc, c) => acc + c.ultima_pontuacao, 0) / criterios.length).toFixed(1) : '0.0'
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader className="w-12 h-12 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
              <Target className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Meus Critérios de Sucesso</h1>
              <p className="text-white/80">Acompanhe sua jornada de aprendizagem</p>
            </div>
          </div>

          {/* Perfil do Aluno */}
          {user && (
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <span className="text-xl font-bold">{user.nome ? user.nome.charAt(0) : ''}</span>
                </div>
                <div>
                  <div className="font-bold text-lg">{user.nome}</div>
                  <div className="text-white/80 text-sm">{user.ano_escolar}º Ano • Nº {user.numero_mecanografico}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Estatísticas */}
      <div className="max-w-7xl mx-auto px-6 -mt-8 mb-8">
        <div className="grid md:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <Target className="w-5 h-5 text-blue-600" />
              </div>
              <span className="text-sm font-medium text-slate-600">Total</span>
            </div>
            <div className="text-3xl font-bold text-slate-900">{estatisticas.total}</div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border border-emerald-200">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
              </div>
              <span className="text-sm font-medium text-slate-600">Concluídos</span>
            </div>
            <div className="text-3xl font-bold text-emerald-600">{estatisticas.concluidos}</div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border border-amber-200">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-amber-600" />
              </div>
              <span className="text-sm font-medium text-slate-600">Em Progresso</span>
            </div>
            <div className="text-3xl font-bold text-amber-600">{estatisticas.emProgresso}</div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border border-purple-200">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                <Award className="w-5 h-5 text-purple-600" />
              </div>
              <span className="text-sm font-medium text-slate-600">Média Geral</span>
            </div>
            <div className="text-3xl font-bold text-purple-600">{estatisticas.mediaGeral}</div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="max-w-7xl mx-auto px-6 mb-6">
        <div className="flex gap-3">
          <button
            onClick={() => setFiltro('todos')}
            className={`px-6 py-3 rounded-xl font-semibold transition-all ${
              filtro === 'todos'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            Todos ({estatisticas.total})
          </button>
          <button
            onClick={() => setFiltro('concluidos')}
            className={`px-6 py-3 rounded-xl font-semibold transition-all ${
              filtro === 'concluidos'
                ? 'bg-emerald-600 text-white shadow-lg'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            Concluídos ({estatisticas.concluidos})
          </button>
          <button
            onClick={() => setFiltro('em_progresso')}
            className={`px-6 py-3 rounded-xl font-semibold transition-all ${
              filtro === 'em_progresso'
                ? 'bg-amber-600 text-white shadow-lg'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            Em Progresso ({estatisticas.emProgresso})
          </button>
        </div>
      </div>

      {/* Lista de Critérios */}
      <div className="max-w-7xl mx-auto px-6 pb-12">
        <div className="space-y-6">
          {criteriosFiltrados.map(criterio => (
            <CriterioCard
              key={criterio.id}
              criterio={criterio}
              expanded={expandidos[criterio.id]}
              onToggle={() => toggleExpanded(criterio.id)}
            />
          ))}
        </div>

        {criteriosFiltrados.length === 0 && !loading && (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Target className="w-10 h-10 text-slate-400" />
            </div>
            <p className="text-slate-600">Nenhum critério encontrado com este filtro</p>
          </div>
        )}
      </div>
    </div>
  );
}