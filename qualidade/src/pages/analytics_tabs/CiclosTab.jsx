import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const CiclosTab = ({ avaliacoes }) => {
  // Performance por ciclo
  const getPerformancePorCiclo = () => {
    const ciclos = {};

    avaliacoes.forEach((av) => {
      if (!ciclos[av.ciclo]) {
        ciclos[av.ciclo] = { totalAlunos: 0, somaPositivos: 0, count: 0 };
      }
      ciclos[av.ciclo].totalAlunos += av.total_alunos || 0;
      ciclos[av.ciclo].somaPositivos += av.total_positivos || 0;
      ciclos[av.ciclo].count += 1;
    });

    return Object.entries(ciclos).map(([ciclo, data]) => ({
      ciclo: ciclo.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
      percentPositivos: data.totalAlunos
        ? ((data.somaPositivos / data.totalAlunos) * 100).toFixed(1)
        : '0',
      totalAlunos: data.totalAlunos,
      mediaAlunos: data.count ? Math.round(data.totalAlunos / data.count) : 0,
    }));
  };

  const performanceData = getPerformancePorCiclo();

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">
        Performance por Ciclo
      </h2>
      {performanceData.length === 0 ? (
        <p className="text-gray-500 text-center py-12">
          Sem dados para os filtros selecionados
        </p>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {performanceData.map((ciclo) => (
              <div key={ciclo.ciclo} className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-xl font-bold text-indigo-900 mb-2">
                  {ciclo.ciclo}
                </h3>
                <div className="space-y-2">
                  <p className="text-3xl font-bold text-indigo-600">
                    {ciclo.percentPositivos}%
                  </p>
                  <p className="text-sm text-gray-600">Taxa de Sucesso</p>
                  <p className="text-gray-700">
                    Total Alunos: {ciclo.totalAlunos}
                  </p>
                  <p className="text-gray-700">
                    Média por Turma: {ciclo.mediaAlunos}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={performanceData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="ciclo" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Legend />
              <Bar dataKey="percentPositivos" fill="#10b981" name="% Positivas" />
            </BarChart>
          </ResponsiveContainer>
        </>
      )}
    </div>
  );
};

export default CiclosTab;
