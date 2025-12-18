// portal/src/pages/IndicadoresPublicosPage.jsx
import React, { useEffect, useState } from 'react';
import { getEqavetResumoAnual } from '../services/api';
import { ArrowLeft, Check, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';

import InstrumentoAnalise from './InstrumentoAnalise';
import PontosdeLegado from './PontosdeLegado';
import SistemaHouses from './SistemaHouses';
import CriteriosSucesso from './CriteriosSucesso';
import CompetenciasPage from './CompetenciasPage';
import MemoriaStatsPage from './MemoriaStatsPage';

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

// This is the main content of the tab
const EqavetDashboardContent = () => {
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
            <div className="flex justify-center items-center h-64">
                <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (dados.length === 0) {
        return <p className="text-center text-slate-500">De momento, não existem dados de indicadores para apresentar.</p>
    }
  
    return (
      <div className="space-y-8">
        {dados.map((ano) => {
          console.log('Rendering data for ano:', ano);
          return (
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
                resultado={ano.media_ind4}
                meta={ano.meta_ind4}
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
                resultado={ano.media_ind6a}
                meta={ano.meta_ind6a}
              />
            </div>
          </div>
        )})}
      </div>
    );
};

export default function IndicadoresPublicosPage() {
    const [activeTab, setActiveTab] = useState('eqavet');

    const tabs = [
        { id: 'eqavet', label: 'Indicadores EQAVET' },
        { id: 'instrumento', label: 'Instrumento de Análise' },
        { id: 'legados', label: 'Pontos de Legado' },
        { id: 'houses', label: 'Sistema Houses' },
        { id: 'criterios', label: 'Critérios de Sucesso' },
        { id: 'competencias', label: 'Competências' },
        { id: 'memoria', label: 'Memória' },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
            <header className="bg-white/80 backdrop-blur-xl border-b border-slate-200/60 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link to="/" className="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-medium transition-colors">
                            <ArrowLeft className="w-5 h-5" />
                            <span>Voltar à Página Principal</span>
                        </Link>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full">Página Pública de Indicadores</span>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-12">
                <div className="text-center mb-12">
                    <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4 tracking-tight">
                        Indicadores de Desempenho
                    </h1>
                    <p className="text-lg text-slate-600 max-w-3xl mx-auto">
                        Transparência e compromisso com a qualidade do ensino. Acompanhe os nossos resultados.
                    </p>
                </div>

                <div className="border-b border-slate-200 mb-8">
                    <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                        {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`whitespace-nowrap py-4 px-1 border-b-2 font-semibold text-lg transition-colors ${
                            activeTab === tab.id
                                ? 'border-blue-600 text-blue-700'
                                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                            }`}
                        >
                            {tab.label}
                        </button>
                        ))}
                    </nav>
                </div>

                <div>
                    {activeTab === 'eqavet' && <EqavetDashboardContent />}
                    {activeTab === 'instrumento' && <InstrumentoAnalise />}
                    {activeTab === 'legados' && <PontosdeLegado />}
                    {activeTab === 'houses' && <SistemaHouses />}
                    {activeTab === 'criterios' && <CriteriosSucesso />}
                    {activeTab === 'competencias' && <CompetenciasPage />}
                    {activeTab === 'memoria' && <MemoriaStatsPage />}
                </div>
            </main>

            <footer className="border-t border-slate-200/60 bg-white/50 backdrop-blur-sm mt-20">
                <div className="max-w-7xl mx-auto px-6 py-8 text-center">
                <p className="text-sm text-slate-500">
                    © 2025 Aurora Educational Platform. Todos os direitos reservados.
                </p>
                </div>
            </footer>
        </div>
    );
}