// src/components/eqavet/EqavetDashboard.jsx
import React, { useEffect, useState } from 'react';
import { getEqavetDashboard } from '../../services/api';

const IndicadorCard = ({ label, resultado, meta, unidade = '%' }) => {
  const valor = Number(resultado) || 0;
  const metaValor = Number(meta) || 0;
  const cumprida = label.includes('Abandono')
    ? valor <= metaValor
    : valor >= metaValor;

  return (
    <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-600">
      <h3 className="text-lg font-semibold text-gray-700">{label}</h3>
      <div className="mt-4 flex items-baseline justify-between">
        <div>
          <span className="text-3xl font-bold text-gray-900">{valor.toFixed(1)}{unidade}</span>
          <span className="ml-2 text-gray-500">/ {metaValor.toFixed(1)}{unidade}</span>
          <p className="text-xs text-gray-400">Raw: {String(resultado)}</p>
        </div>
        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
          cumprida ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
        }`}>
          {cumprida ? 'Check' : 'Warning'}
        </div>
      </div>
    </div>
  );
};

const EqavetDashboard = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getEqavetDashboard().then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Carregando dashboard...</p>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {data.map((ciclo, i) => (
          <div key={i} className="bg-gray-50 rounded-xl p-6 shadow-sm">
            <h2 className="text-xl font-bold text-blue-700 mb-4">
              {ciclo.ciclo_formativo} ({ciclo.ano_letivo})
            </h2>
            <div className="space-y-4">
              <IndicadorCard label="Colocação" resultado={ciclo.resultado_ind1} meta={ciclo.meta_ind1} />
              <IndicadorCard label="Conclusão" resultado={ciclo.resultado_ind2} meta={ciclo.meta_ind2} />
              <IndicadorCard label="Abandono" resultado={ciclo.resultado_ind3} meta={ciclo.meta_ind3} />
              <IndicadorCard label="Utilização Competências" resultado={ciclo.resultado_ind4} meta={ciclo.meta_ind4} />
              <IndicadorCard label="Satisfação Empregadores" resultado={ciclo.resultado_ind5} meta={ciclo.meta_ind5} unidade=" (1-4)" />
              <IndicadorCard label="Prosseguimento Estudos" resultado={ciclo.resultado_ind6a} meta={ciclo.meta_ind6a} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EqavetDashboard;
