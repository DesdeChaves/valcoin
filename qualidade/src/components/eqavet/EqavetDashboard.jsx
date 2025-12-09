// src/components/eqavet/EqavetDashboard.jsx
import React, { useEffect, useState } from 'react';
import { getEqavetResumoAnual } from '../../services/api'; // nova API (vamos criar já)

const StatusBadge = ({ cumprida, pendente = false }) => {
  if (pendente) return <span className="px-4 py-2 bg-gray-100 text-gray-600 rounded-full text-sm font-medium">Pendente</span>;
  return (
    <span className={`px-4 py-2 rounded-full text-sm font-bold text-white ${cumprida ? 'bg-green-600' : 'bg-red-600'}`}>
      {cumprida ? 'Cumprida' : 'Não Cumprida'}
    </span>
  );
};

const IndicadorCard = ({ label, resultado, meta, unidade = '%', isAbandono = false }) => {
  const valor = Number(resultado) || 0;
  const metaValor = Number(meta) || 0;
  const cumprida = isAbandono ? valor <= metaValor : valor >= metaValor;
  const pendente = resultado === null || resultado === undefined;

  return (
    <div className="bg-white rounded-xl shadow-md p-5 border border-gray-100 hover:shadow-lg transition">
      <div class="flex justify-between items-start mb-3">
        <h4 class="font-semibold text-gray-700">{label}</h4>
        <StatusBadge cumprida={cumprida} pendente={pendente} />
      </div>
      <div class="text-3xl font-bold text-gray-900">
        {pendente ? '—' : valor.toFixed(1)}{unidade}
      </div>
      <div class="text-sm text-gray-500 mt-1">
        Meta: {metaValor.toFixed(1)}{unidade}
      </div>
      {!pendente && (
        <div class={`text-sm font-medium mt-2 ${cumprida ? 'text-green-600' : 'text-red-600'}`}>
          {cumprida ? '+' : ''}{ (valor - metaValor).toFixed(1) } pp
        </div>
      )}
    </div>
  );
};

const EqavetDashboard = () => {
  const [dados, setDados] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getEqavetResumoAnual()
      .then(response => {
        if (Array.isArray(response)) {
          setDados(response);
        } else {
          console.error("getEqavetResumoAnual did not return an array:", response);
          setDados([]); // Ensure dados is always an array
        }
      })
      .catch(err => {
        console.error("Error fetching EQAVET annual summary:", err);
        setDados([]); // Also set to empty array on error
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div class="flex items-center justify-center py-20">
        <div class="text-xl text-gray-600">A carregar dashboard EQAVET...</div>
      </div>
    );
  }

  if (dados.length === 0) {
    return <div class="text-center py-10 text-gray-500">Nenhum dado EQAVET disponível.</div>;
  }

  return (
    <div class="max-w-7xl mx-auto p-6">
      <div class="mb-10 text-center">
        <h1 class="text-4xl font-bold text-indigo-700 mb-3">
          Dashboard EQAVET – Metas vs Resultados
        </h1>
        <p class="text-lg text-gray-600">
          Comparação anual entre metas institucionais e resultados reais
        </p>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
        {dados.map((ano) => (
          <div
            key={ano.ano_letivo}
            className={`rounded-2xl shadow-xl overflow-hidden border-l-8 ${
              ano.ano_letivo.includes(new Date().getFullYear().toString())
                ? 'border-indigo-600 bg-gradient-to-br from-indigo-50'
                : 'border-gray-400 bg-white'
            }`}
          >
            <div class="bg-gradient-to-r from-gray-800 to-gray-900 text-white p-6">
              <h2 class="text-2xl font-bold">
                Ano Letivo {ano.ano_letivo}
                {ano.ano_letivo.includes(new Date().getFullYear().toString()) && (
                  <span class="ml-3 text-sm bg-yellow-400 text-gray-900 px-3 py-1 rounded-full font-bold">
                    ATUAL
                  </span>
                )}
              </h2>
              <p class="text-gray-300 mt-1">{ano.ciclos_ativos} ciclos formativos</p>
            </div>

            <div class="p-6 space-y-5">
              <IndicadorCard
                label="Colocação no Mercado"
                resultado={ano.media_ind1}
                meta={ano.meta_ind1}
              />
              <IndicadorCard
                label="Taxa de Conclusão"
                resultado={ano.media_ind2}
                meta={ano.meta_ind2}
              />
              <IndicadorCard
                label="Taxa de Abandono"
                resultado={ano.media_ind3}
                meta={ano.meta_ind3}
                isAbandono={true}
              />
              <IndicadorCard
                label="Utilização Competências"
                resultado={ano.media_ind4 || null}
                meta={ano.meta_ind4 || 0}
              />
              <IndicadorCard
                label="Satisfação Empregadores (1-4)"
                resultado={ano.media_ind5b_media}
                meta={ano.meta_ind5b}
                unidade=" (1-4)"
              />
              <IndicadorCard
                label="Taxa de Satisfação Empregadores (%)"
                resultado={ano.media_ind5b_taxa}
                meta={ano.meta_ind5b_taxa}
              />
              <IndicadorCard
                label="Prosseguimento Estudos"
                resultado={ano.media_ind6a || null}
                meta={ano.meta_ind6a || 0}
              />
            </div>
          </div>
        ))}
      </div>

      <div class="mt-12 text-center text-sm text-gray-500">
        Sistema EQAVET 2025 • Dados atualizados automaticamente • Auditável ANQEP
      </div>
    </div>
  );
};

export default EqavetDashboard;
