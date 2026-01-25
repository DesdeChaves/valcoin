import React from 'react';
import { Award, AlertCircle } from 'lucide-react';

const DisciplinasTab = ({ avaliacoes }) => {
  // Top/Bottom disciplinas
  const getTopBottomDisciplinas = () => {
    const disciplinas = {};

    avaliacoes.forEach((av) => {
      if (!disciplinas[av.disciplina]) {
        disciplinas[av.disciplina] = { soma: 0, count: 0, totalAlunos: 0 };
      }
      disciplinas[av.disciplina].soma += av.percent_positivos || 0;
      disciplinas[av.disciplina].count += 1;
      disciplinas[av.disciplina].totalAlunos += av.total_alunos || 0;
    });

    const resultado = Object.entries(disciplinas)
      .map(([disc, data]) => ({
        disciplina: disc,
        media: data.count ? (data.soma / data.count).toFixed(1) : '0',
        totalAlunos: data.totalAlunos,
      }))
      .sort((a, b) => Number(b.media) - Number(a.media));

    return {
      top: resultado.slice(0, 5),
      bottom: resultado.slice(-5).reverse(),
    };
  };

  const { top, bottom } = getTopBottomDisciplinas();

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">
        Ranking de Disciplinas
      </h2>
      {top.length === 0 ? (
        <p className="text-gray-500 text-center py-12">
          Sem dados para os filtros selecionados
        </p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-xl font-bold text-green-700 mb-4 flex items-center gap-2">
              <Award className="w-6 h-6" />
              Top 5 Disciplinas
            </h3>
            <div className="space-y-3">
              {top.map((disc, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 bg-green-50 rounded-lg"
                >
                  <div>
                    <span className="font-bold text-green-700 mr-2">
                      #{idx + 1}
                    </span>
                    <span className="font-medium">{disc.disciplina}</span>
                  </div>
                  <span className="text-2xl font-bold text-green-600">
                    {disc.media}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-xl font-bold text-orange-700 mb-4 flex items-center gap-2">
              <AlertCircle className="w-6 h-6" />
              Disciplinas com Maior Dificuldade
            </h3>
            <div className="space-y-3">
              {bottom.map((disc, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 bg-orange-50 rounded-lg"
                >
                  <div>
                    <span className="font-medium">{disc.disciplina}</span>
                  </div>
                  <span className="text-2xl font-bold text-orange-600">
                    {disc.media}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DisciplinasTab;
