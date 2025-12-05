import React, { useState, useEffect, useCallback } from 'react';
import { AlertCircle, Info, Save, Database, Loader2 } from 'lucide-react';
import { getCiclosFormativos, getIndicador, saveIndicador } from '../../services/api';

const INDICADORES = ['1', '2', '3', '4', '5b', '6a'];

const IndicadoresForm = () => {
  const [ciclos, setCiclos] = useState([]);
  const [selectedCiclo, setSelectedCiclo] = useState('');
  const [ano, setAno] = useState(new Date().getFullYear());
  
  const [dados, setDados] = useState(INDICADORES.reduce((acc, ind) => ({ ...acc, [ind]: {} }), {}));
  const [erros, setErros] = useState({});
  const [justificativaInd1, setJustificativaInd1] = useState('');
  
  const [activeTab, setActiveTab] = useState('1');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Carregar ciclos formativos
  useEffect(() => {
    const fetchCiclos = async () => {
      try {
        setLoading(true);
        const ciclosData = await getCiclosFormativos();
        setCiclos(ciclosData);
        if (ciclosData.length > 0) {
          setSelectedCiclo(ciclosData[0].id);
        }
      } catch (err) {
        console.error("Erro ao carregar ciclos formativos:", err);
        alert("Não foi possível carregar os ciclos formativos. Verifique a ligação à API.");
      } finally {
        setLoading(false);
      }
    };
    fetchCiclos();
  }, []);

  // Carregar dados dos indicadores quando o ciclo ou ano muda
  const carregarDadosIndicadores = useCallback(async () => {
    if (!selectedCiclo) return;

    setLoading(true);
    const novosDados = {};
    try {
      for (const ind of INDICADORES) {
        const data = await getIndicador(ind, selectedCiclo, ano);
        novosDados[ind] = data || {};
        if (ind === '1' && data?.observacoes) {
          setJustificativaInd1(data.observacoes);
        }
      }
      setDados(novosDados);
    } catch (err) {
      console.error(`Erro ao carregar dados dos indicadores para o ciclo ${selectedCiclo} e ano ${ano}:`, err);
    } finally {
      setLoading(false);
    }
  }, [selectedCiclo, ano]);

  useEffect(() => {
    carregarDadosIndicadores();
  }, [carregarDadosIndicadores]);
  
  // Lógicas de cálculo e validação
  useEffect(() => {
    const d = dados;
    const novosErros = {};

    // Propagar o total de conclusões do Ind. 2 para os outros
    const conclusoesGlobais = Number(d['2']?.conclusoes_global) || 0;
    if (conclusoesGlobais >= 0) {
        const updates = {
            '1': { ...d['1'], total_conclusoes_globais: conclusoesGlobais },
            '6a': { ...d['6a'], total_diplomados: conclusoesGlobais },
        };
        // Só atualiza se houver mudança para evitar loop
        if (d['1']?.total_conclusoes_globais !== conclusoesGlobais || d['6a']?.total_diplomados !== conclusoesGlobais) {
            setDados(prev => ({ ...prev, ...updates }));
        }
    }
    
    // Validações do Indicador 1
    if (d['1']) {
        const totalConclusoes = Number(d['1'].total_conclusoes_globais) || 0;
        const totalDiplomados = Number(d['1'].total_diplomados) || 0;
        
        if (totalDiplomados > totalConclusoes) {
            novosErros['1'] = `Não pode inquirir mais diplomados (${totalDiplomados}) do que os que concluíram (${totalConclusoes})`;
        } else if (totalDiplomados < totalConclusoes && totalDiplomados > 0 && !justificativaInd1.trim()) {
            novosErros['1'] = `Faltam ${totalConclusoes - totalDiplomados} respostas. Justifique abaixo.`;
        }

        const somaSituacoes =
            Number(d['1'].empregados || 0) + Number(d['1'].conta_propria || 0) +
            Number(d['1'].estagios_profissionais || 0) + Number(d['1'].prosseguimento_estudos || 0) +
            Number(d['1'].procura_emprego || 0) + Number(d['1'].outra_situacao || 0) +
            Number(d['1'].situacao_desconhecida || 0);

        if (totalDiplomados > 0 && somaSituacoes !== totalDiplomados) {
            novosErros['1'] = `A soma das situações (${somaSituacoes}) deve ser igual ao total de diplomados inquiridos (${totalDiplomados})`;
        }

        const colocados = Number(d['1'].empregados || 0) + Number(d['1'].conta_propria || 0) + 
                          Number(d['1'].estagios_profissionais || 0) + Number(d['1'].prosseguimento_estudos || 0);
        const taxaColocacao = totalDiplomados > 0 ? (colocados / totalDiplomados * 100).toFixed(2) : '0.00';
        if (d['1'].taxa_colocacao_global !== taxaColocacao) {
            setDados(prev => ({ ...prev, '1': { ...prev['1'], taxa_colocacao_global: taxaColocacao }}));
        }
    }

    // Taxa de conclusão (Indicador 2)
    if (d['2']) {
      const ing = Number(d['2'].ingressos) || 0;
      const conc = Number(d['2'].conclusoes_global) || 0;
      const taxa = ing > 0 ? (conc / ing * 100).toFixed(2) : '0.00';
      if (d['2'].taxa_conclusao_global !== taxa) {
        setDados(prev => ({ ...prev, '2': { ...prev['2'], taxa_conclusao_global: taxa } }));
      }
    }

    // Taxa de abandono (Indicador 3)
    if (d['2'] && d['3']) {
      const ing = Number(d['2'].ingressos) || 0;
      const des = Number(d['3'].desistencias) || 0;
      const taxa = ing > 0 ? (des / ing * 100).toFixed(2) : '0.00';
      if (d['3'].taxa_abandono_global !== taxa) {
        setDados(prev => ({ ...prev, '3': { ...prev['3'], taxa_abandono_global: taxa } }));
      }
    }

    // Taxa de prosseguimento (Indicador 6a)
    if (d['6a']) {
      const prosseg = Number(d['6a'].prosseguimento_estudos || 0);
      const total = Number(d['6a'].total_diplomados) || 0;
      const taxa = total > 0 ? (prosseg / total * 100).toFixed(2) : '0.00';
      if (d['6a'].taxa_prosseguimento_global !== taxa) {
        setDados(prev => ({ ...prev, '6a': { ...prev['6a'], taxa_prosseguimento_global: taxa } }));
      }
    }

    setErros(novosErros);
  }, [dados, justificativaInd1]);

  const handleInputChange = (indicador, campo, valor) => {
    setDados(prev => ({
        ...prev,
        [indicador]: {
            ...prev[indicador],
            [campo]: valor
        }
    }));
  };

  const save = async (nomeIndicador) => {
    if (erros[nomeIndicador]) {
      alert(`Corrija o erro:\n${erros[nomeIndicador]}`);
      return;
    }
    if (!selectedCiclo) {
      alert('Erro: Ciclo formativo não definido');
      return;
    }

    setSaving(true);
    
    // eslint-disable-next-line no-unused-vars
    const { total_conclusoes_globais, ...dadosParaSalvar } = dados[nomeIndicador];

    const payload = {
      ciclo_formativo_id: selectedCiclo,
      ano_recolha: ano,
      ...dadosParaSalvar
    };
    
    if (nomeIndicador === '1' && justificativaInd1.trim()) {
      payload.observacoes = justificativaInd1;
    }

    try {
      await saveIndicador(nomeIndicador, payload);
      alert(`✓ Indicador ${nomeIndicador} gravado com sucesso!\n\nCiclo: ${selectedCiclo} | Ano: ${ano}`);
      // Recarrega os dados para garantir consistência, especialmente se houver lógicas no backend
      carregarDadosIndicadores();
    } catch (err) {
      alert(`Erro ao gravar o Indicador ${nomeIndicador}. Verifique a consola.`);
      console.error(err.response?.data?.error || err.message);
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: '1', label: 'Ind. 1 - Colocação', color: 'blue' },
    { id: '2', label: 'Ind. 2 - Conclusão', color: 'green' },
    { id: '3', label: 'Ind. 3 - Abandono', color: 'orange' },
    { id: '4', label: 'Ind. 4 - Competências', color: 'purple' },
    { id: '5b', label: 'Ind. 5b - Empregadores', color: 'pink' },
    { id: '6a', label: 'Ind. 6a - Prosseguimento', color: 'indigo' },
  ];

  if (loading && !ciclos.length) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="animate-spin h-12 w-12 text-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-800">Indicadores EQAVET</h1>
              <p className="text-slate-600 mt-1">Sistema de Garantia da Qualidade</p>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex items-center gap-3 px-4 py-2 bg-blue-50 rounded-lg border border-blue-200 min-w-[200px]">
                <Database className="w-5 h-5 text-blue-600" />
                <div>
                  <label className="block text-xs text-blue-600 font-medium">Ciclo Formativo</label>
                  <select
                    value={selectedCiclo}
                    onChange={e => setSelectedCiclo(Number(e.target.value))}
                    className="text-sm font-bold text-blue-900 bg-transparent outline-none border-none"
                    disabled={loading}
                  >
                    {ciclos.map(c => <option key={c.id} value={c.id}>{c.designacao}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Ano recolha</label>
                <input
                  type="number"
                  value={ano}
                  onChange={e => setAno(Number(e.target.value))}
                  className="w-28 px-3 py-2 text-lg font-semibold border-2 border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none text-center"
                  disabled={loading}
                />
              </div>
            </div>
          </div>
        </div>
        
        {loading && (
          <div className="flex justify-center items-center my-4">
            <Loader2 className="animate-spin h-8 w-8 text-slate-500" />
            <span className="ml-2 text-slate-600">A carregar dados...</span>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-lg mb-6 overflow-hidden">
          <div className="flex overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 min-w-max px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 bg-blue-50'
                    : 'border-transparent text-slate-600 hover:text-slate-800 hover:bg-slate-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* INDICADOR 1 */}
        {activeTab === '1' && (
          <div className="bg-white rounded-xl shadow-lg p-6 space-y-6">
            <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <strong>Indicador 1:</strong> Percentagem de diplomados em situação de emprego, conta própria, estágios ou a prosseguir estudos (6 meses após conclusão).
              </div>
            </div>

            {erros['1'] && (
              <div className="flex items-start gap-3 p-4 bg-red-50 rounded-lg border-2 border-red-400">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <span className="text-sm font-medium text-red-800">{erros['1']}</span>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-6">
              <div className="p-5 bg-purple-50 rounded-lg border-2 border-purple-300">
                <label className="block text-sm font-semibold text-purple-900 mb-2">
                  Total Conclusões (Ind. 2)
                </label>
                <div className="text-4xl font-bold text-purple-700 text-center py-4">
                  {dados['1']?.total_conclusoes_globais || 0}
                </div>
                <p className="text-xs text-purple-600 text-center mt-2">← Automático</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Total Diplomados
                </label>
                <input
                  type="number"
                  value={dados['1']?.total_diplomados || ''}
                  onChange={e => handleInputChange('1', 'total_diplomados', e.target.value)}
                  className="w-full text-3xl font-bold text-center px-4 py-3 border-2 border-slate-300 rounded-lg focus:border-blue-500 outline-none"
                  placeholder="0"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { campo: 'empregados', label: 'Empregados' },
                { campo: 'conta_propria', label: 'Conta Própria' },
                { campo: 'estagios_profissionais', label: 'Estágios' },
                { campo: 'prosseguimento_estudos', label: 'Estudos' },
                { campo: 'procura_emprego', label: 'Procura Emprego' },
                { campo: 'outra_situacao', label: 'Outra' },
                { campo: 'situacao_desconhecida', label: 'Desconhecida' },
              ].map(({ campo, label }) => (
                <div key={campo}>
                  <label className="block text-xs font-medium text-slate-700 mb-1">{label}</label>
                  <input
                    type="number"
                    value={dados['1']?.[campo] || ''}
                    onChange={e => handleInputChange('1', campo, e.target.value)}
                    className="w-full text-2xl font-semibold text-center px-3 py-2 border-2 border-slate-300 rounded-lg focus:border-blue-500 outline-none"
                    placeholder="0"
                  />
                </div>
              ))}
            </div>

            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex justify-between items-center text-sm">
                <span className="font-semibold text-blue-900">Soma das situações:</span>
                <span className="text-2xl font-bold text-blue-700">
                  {(Number(dados['1']?.empregados || 0) +
                    Number(dados['1']?.conta_propria || 0) +
                    Number(dados['1']?.estagios_profissionais || 0) +
                    Number(dados['1']?.prosseguimento_estudos || 0) +
                    Number(dados['1']?.procura_emprego || 0) +
                    Number(dados['1']?.outra_situacao || 0) +
                    Number(dados['1']?.situacao_desconhecida || 0))}
                </span>
                <span className="font-semibold text-blue-900">
                  = Total Diplomados: {dados['1']?.total_diplomados || 0}
                </span>
              </div>
            </div>

            {dados['1']?.total_conclusoes_globais > (dados['1']?.total_diplomados || 0) && (dados['1']?.total_diplomados > 0) && (
              <div className="p-4 bg-yellow-50 rounded-lg border-2 border-yellow-400">
                <label className="block text-sm font-semibold text-yellow-900 mb-2">
                  Justificação obrigatória
                </label>
                <textarea
                  value={justificativaInd1}
                  onChange={e => setJustificativaInd1(e.target.value)}
                  placeholder="Ex: 1 faleceu; 2 emigraram; 1 recusou."
                  className="w-full p-3 text-sm border-2 border-yellow-300 rounded-lg outline-none"
                  rows="3"
                />
              </div>
            )}

            <div className="p-6 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl text-center">
              <h3 className="text-lg font-semibold mb-2">Taxa de Colocação</h3>
              <div className="text-5xl font-bold">{dados['1']?.taxa_colocacao_global || '0.00'}%</div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => save('1')}
                disabled={!!erros['1'] || saving || loading}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-colors ${
                  !!erros['1'] || saving || loading ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {saving ? <Loader2 className="animate-spin w-5 h-5"/> : <Save className="w-5 h-5" />}
                {saving ? 'A gravar...' : 'Gravar'}
              </button>
            </div>
          </div>
        )}

        {/* INDICADOR 2 */}
        {activeTab === '2' && (
            <div className="bg-white rounded-xl shadow-lg p-6 space-y-6">
                <div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
                    <Info className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-green-800">
                        <strong>Indicador 2:</strong> Percentagem de formandos que concluem relativamente aos ingressos.
                        <div className="mt-2 font-semibold">⚠️ Alimenta Indicadores 1 e 6a</div>
                    </div>
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                    <div>
                        <label className="block text-sm font-semibold mb-2">Ingressos</label>
                        <input
                            type="number"
                            value={dados['2']?.ingressos || ''}
                            onChange={e => handleInputChange('2', 'ingressos', e.target.value)}
                            className="w-full text-3xl font-bold text-center px-4 py-3 border-2 border-slate-300 rounded-lg focus:border-green-500 outline-none"
                            placeholder="0"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold mb-2">Conclusões</label>
                        <input
                            type="number"
                            value={dados['2']?.conclusoes_global || ''}
                            onChange={e => handleInputChange('2', 'conclusoes_global', e.target.value)}
                            className="w-full text-3xl font-bold text-center px-4 py-3 border-2 border-slate-300 rounded-lg focus:border-green-500 outline-none"
                            placeholder="0"
                        />
                    </div>

                    <div className="flex flex-col justify-center p-5 bg-green-50 rounded-lg border-2 border-green-300">
                        <p className="text-sm font-semibold text-center">Taxa</p>
                        <p className="text-4xl font-bold text-green-700 text-center mt-2">{dados['2']?.taxa_conclusao_global || '0.00'}%</p>
                    </div>
                </div>

                <div className="flex justify-end">
                    <button onClick={() => save('2')} disabled={saving || loading} className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold ${saving || loading ? 'bg-slate-300 text-slate-500' : 'bg-green-600 text-white hover:bg-green-700'}`}>
                        {saving ? <Loader2 className="animate-spin w-5 h-5"/> : <Save className="w-5 h-5" />}
                        {saving ? 'A gravar...' : 'Gravar'}
                    </button>
                </div>
            </div>
        )}
        
        {/* INDICADOR 3 */}
        {activeTab === '3' && (
            <div className="bg-white rounded-xl shadow-lg p-6 space-y-6">
                <div className="flex items-start gap-3 p-4 bg-orange-50 rounded-lg border border-orange-200">
                    <Info className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-orange-800">
                        <strong>Indicador 3:</strong> Percentagem de desistências relativamente aos ingressos.
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-semibold mb-2">Desistências</label>
                        <input
                            type="number"
                            value={dados['3']?.desistencias || ''}
                            onChange={e => handleInputChange('3', 'desistencias', e.target.value)}
                            className="w-full text-3xl font-bold text-center px-4 py-3 border-2 border-slate-300 rounded-lg outline-none"
                            placeholder="0"
                        />
                    </div>

                    <div className="flex flex-col justify-center p-5 bg-orange-50 rounded-lg border-2 border-orange-300">
                        <p className="text-sm font-semibold text-center">Taxa de Abandono</p>
                        <p className="text-4xl font-bold text-orange-700 text-center mt-2">{dados['3']?.taxa_abandono_global || '0.00'}%</p>
                    </div>
                </div>

                <div className="flex justify-end">
                    <button onClick={() => save('3')} disabled={saving || loading} className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold ${saving || loading ? 'bg-slate-300 text-slate-500' : 'bg-orange-600 text-white hover:bg-orange-700'}`}>
                        {saving ? <Loader2 className="animate-spin w-5 h-5"/> : <Save className="w-5 h-5" />}
                        {saving ? 'A gravar...' : 'Gravar'}
                    </button>
                </div>
            </div>
        )}

        {/* INDICADOR 4 */}
        {activeTab === '4' && (
            <div className="bg-white rounded-xl shadow-lg p-6 space-y-6">
                <div className="flex items-start gap-3 p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <Info className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-purple-800">
                        <strong>Indicador 4:</strong> Percentagem de diplomados que utilizam competências adquiridas.
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-semibold mb-2">Taxa Utilização (%)</label>
                    <input
                        type="number"
                        step="0.01"
                        value={dados['4']?.taxa_utilizacao_global || ''}
                        onChange={e => handleInputChange('4', 'taxa_utilizacao_global', e.target.value)}
                        className="w-full text-3xl font-bold text-center px-4 py-3 border-2 border-slate-300 rounded-lg outline-none"
                        placeholder="0.00"
                    />
                </div>

                <div className="flex justify-end">
                    <button onClick={() => save('4')} disabled={saving || loading} className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold ${saving || loading ? 'bg-slate-300 text-slate-500' : 'bg-purple-600 text-white hover:bg-purple-700'}`}>
                        {saving ? <Loader2 className="animate-spin w-5 h-5"/> : <Save className="w-5 h-5" />}
                        {saving ? 'A gravar...' : 'Gravar'}
                    </button>
                </div>
            </div>
        )}

        {/* INDICADOR 5b */}
        {activeTab === '5b' && (
            <div className="bg-white rounded-xl shadow-lg p-6 space-y-6">
                <div className="flex items-start gap-3 p-4 bg-pink-50 rounded-lg border border-pink-200">
                    <Info className="w-5 h-5 text-pink-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-pink-800">
                        <strong>Indicador 5b:</strong> Satisfação empregadores (escala 1-4).
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-semibold mb-2">Média Satisfação (1-4)</label>
                    <input
                        type="number"
                        step="0.01"
                        min="1"
                        max="4"
                        value={dados['5b']?.media_satisfacao_global || ''}
                        onChange={e => handleInputChange('5b', 'media_satisfacao_global', e.target.value)}
                        className="w-full text-3xl font-bold text-center px-4 py-3 border-2 border-slate-300 rounded-lg outline-none"
                        placeholder="0.00"
                    />
                </div>

                <div className="p-4 bg-pink-50 rounded-lg">
                    <div className="grid grid-cols-4 gap-2 text-xs">
                        <div className="p-2 bg-white rounded border"><strong>1</strong> Insuf.</div>
                        <div className="p-2 bg-white rounded border"><strong>2</strong> Suf.</div>
                        <div className="p-2 bg-white rounded border"><strong>3</strong> Bom</div>
                        <div className="p-2 bg-white rounded border"><strong>4</strong> M.Bom</div>
                    </div>
                </div>

                <div className="flex justify-end">
                    <button onClick={() => save('5b')} disabled={saving || loading} className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold ${saving || loading ? 'bg-slate-300 text-slate-500' : 'bg-pink-600 text-white hover:bg-pink-700'}`}>
                        {saving ? <Loader2 className="animate-spin w-5 h-5"/> : <Save className="w-5 h-5" />}
                        {saving ? 'A gravar...' : 'Gravar'}
                    </button>
                </div>
            </div>
        )}

        {/* INDICADOR 6a */}
        {activeTab === '6a' && (
            <div className="bg-white rounded-xl shadow-lg p-6 space-y-6">
                <div className="flex items-start gap-3 p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                    <Info className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-indigo-800">
                        <strong>Indicador 6a:</strong> Percentagem de diplomados que ingressaram em níveis subsequentes.
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-semibold mb-2">Prosseguiram Estudos</label>
                        <input
                            type="number"
                            value={dados['6a']?.prosseguimento_estudos || ''}
                            onChange={e => handleInputChange('6a', 'prosseguimento_estudos', e.target.value)}
                            className="w-full text-3xl font-bold text-center px-4 py-3 border-2 border-slate-300 rounded-lg outline-none"
                            placeholder="0"
                        />
                    </div>

                    <div className="p-5 bg-purple-50 rounded-lg border-2 border-purple-300">
                        <label className="block text-sm font-semibold text-purple-900 mb-2">
                            Base (Ind. 2)
                        </label>
                        <div className="text-4xl font-bold text-purple-700 text-center py-4">
                            {dados['6a']?.total_diplomados || 0}
                        </div>
                        <p className="text-xs text-purple-600 text-center mt-2">← Automático</p>
                    </div>
                </div>

                <div className="p-6 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl text-center">
                    <h3 className="text-lg font-semibold mb-2">Taxa Prosseguimento</h3>
                    <div className="text-5xl font-bold">{dados['6a']?.taxa_prosseguimento_global || '0.00'}%</div>
                </div>

                <div className="p-4 bg-blue-50 rounded-lg">
                    <h4 className="text-sm font-semibold mb-2">Exemplos:</h4>
                    <ul className="text-xs space-y-1 ml-4 list-disc">
                        <li>Cursos Profissionais → TeSP</li>
                        <li>TeSP → Licenciaturas</li>
                        <li>Nível 2 → Nível 4</li>
                    </ul>
                </div>

                <div className="flex justify-end">
                    <button onClick={() => save('6a')} disabled={saving || loading} className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold ${saving || loading ? 'bg-slate-300 text-slate-500' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}>
                        {saving ? <Loader2 className="animate-spin w-5 h-5"/> : <Save className="w-5 h-5" />}
                        {saving ? 'A gravar...' : 'Gravar'}
                    </button>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default IndicadoresForm;
