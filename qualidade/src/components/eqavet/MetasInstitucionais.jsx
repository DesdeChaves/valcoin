// src/components/eqavet/MetasInstitucionais.jsx
import React, { useState, useEffect } from 'react';
import { getMetasInstitucionais, saveMetaInstitucional } from '../../services/api';

const MetasInstitucionais = ({ currentUser }) => {
  const [anosLetivos, setAnosLetivos] = useState([]);
  const [selectedAno, setSelectedAno] = useState('');
  const [metas, setMetas] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const isResponsavelOnly = currentUser && currentUser.roles && currentUser.roles.includes('responsavel_ciclo') && !currentUser.roles.includes('coordenador_cursos_profissionais') && !currentUser.roles.includes('admin');

  // Lista de anos letivos dos últimos 6 anos + próximos 2 (ajusta se quiseres)
  useEffect(() => {
    const currentYear = new Date().getFullYear();
    const startYear = currentYear - 4;
    const years = [];
    for (let y = startYear; y <= currentYear + 2; y++) {
      years.push(`${y}/${y + 1}`);
    }
    setAnosLetivos(years);
    setSelectedAno(`${currentYear}/${currentYear + 1}`); // ano atual por defeito
  }, []);

  // Carregar metas quando muda o ano letivo
  useEffect(() => {
    if (selectedAno) {
      loadMetas(selectedAno, currentUser);
    }
  }, [selectedAno, currentUser]);

  const loadMetas = async (anoLetivo, user) => {
    setLoading(true);
    let responsavelId = null;
    if (isResponsavelOnly) {
      responsavelId = user.id;
    }

    try {
      const data = await getMetasInstitucionais(anoLetivo, responsavelId);
      const map = {};
      data.forEach(m => {
        map[m.indicador] = (
          typeof m.meta_global === 'number' && !isNaN(m.meta_global)
            ? m.meta_global
            : parseFloat(m.meta_global) || 0
        ).toFixed(2);
      });
      setMetas(map);
    } catch (err) {
      console.error('Erro ao carregar metas:', err);
      setMetas({});
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (indicador, value) => {
    setMetas(prev => ({
      ...prev,
      [indicador]: value
    }));
  };

  const saveAll = async () => {
    if (!selectedAno) return alert('Selecione um ano letivo');

    setSaving(true);
    try {
      const promises = indicadores.map(async (ind) => {
        const valor = metas[ind.id];
        if (valor !== undefined && valor !== '' && !isNaN(valor)) {
          await saveMetaInstitucional({
            ano_letivo: selectedAno,
            indicador: ind.id,
            meta_global: parseFloat(valor)
          });
        }
      });

      await Promise.all(promises);
      alert(`Metas do ano letivo ${selectedAno} guardadas com sucesso!`);
      loadMetas(selectedAno, currentUser); // recarrega para confirmar
    } catch (err) {
      console.error('Erro ao guardar:', err);
      alert('Erro ao guardar algumas metas. Verifique os valores.');
    } finally {
      setSaving(false);
    }
  };

  const indicadores = [
    { id: '1', nome: 'Colocação no Mercado de Trabalho (Ind. 1)', unidade: '%' },
    { id: '2', nome: 'Taxa de Conclusão (Ind. 2)', unidade: '%' },
    { id: '3', nome: 'Taxa de Abandono Máxima (Ind. 3)', unidade: '%' },
    { id: '4', nome: 'Utilização das Competências no Posto de Trabalho (Ind. 4)', unidade: '%' },
    { id: '5b', nome: 'Satisfação dos Empregadores (Ind. 5b)', unidade: 'média (1-4)' },
    { id: '6a', nome: 'Prosseguimento de Estudos (Ind. 6a)', unidade: '%' },
  ];

  const handlePrintPDF = async () => {
    if (loading || !selectedAno) {
      alert('Aguarde o carregamento dos dados ou selecione um ano letivo.');
      return;
    }

    const htmlContent = `
      <html>
        <head>
          <title>Metas Institucionais EQAVET - ${selectedAno}</title>
          <style>
            body { font-family: sans-serif; margin: 20px; }
            h1 { color: #333; text-align: center; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .footer { font-size: 10px; text-align: center; margin-top: 30px; color: #777; }
          </style>
        </head>
        <body>
          <div class="header" style="text-align: center; margin-bottom: 20px;">
            <img src="/qualidade/logotipo.jpg" alt="Logotipo" style="max-width: 150px; height: auto;">
          </div>
          <h1>Metas Institucionais EQAVET - Ano Letivo ${selectedAno}</h1>
          <table>
            <thead>
              <tr>
                <th>Indicador</th>
                <th>Meta</th>
              </tr>
            </thead>
            <tbody>
              ${indicadores.map(ind => `
                <tr>
                  <td>${ind.nome}</td>
                  <td>${metas[ind.id] || 'N/A'} ${ind.unidade}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="footer">
            Sistema EQAVET 2025 • Relatório gerado em ${new Date().toLocaleDateString()}
          </div>
        </body>
      </html>
    `;

    try {
      const formData = new FormData();
      const htmlFile = new Blob([htmlContent], { type: 'text/html' });
      formData.append('files', htmlFile, 'index.html'); // Gotenberg expects 'files' as the field name for the HTML file

      const response = await fetch('/gotenberg/forms/chromium/convert/html', {
        method: 'POST',
        body: formData, // No Content-Type header needed, fetch sets it automatically for FormData
      });

      if (!response.ok) {
        throw new Error(`Erro ao gerar PDF: ${response.statusText}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Metas_EQAVET_${selectedAno}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erro ao imprimir PDF:', error);
      alert('Não foi possível gerar o PDF. Verifique a consola para mais detalhes.');
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-600 to-blue-700 text-white p-8">
          <h1 className="text-3xl font-bold">Metas Institucionais EQAVET</h1>
          <p className="mt-2 text-indigo-100">Plano de Melhoria Anual – Definição e Histórico</p>
        </div>

        <div className="p-8">
          {/* Seleção do Ano Letivo */}
          <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <label className="text-lg font-semibold text-gray-700">Ano Letivo:</label>
            <select
              value={selectedAno}
              onChange={(e) => setSelectedAno(e.target.value)}
              className="px-5 py-3 border-2 border-indigo-200 rounded-xl text-lg font-medium focus:border-indigo-500 outline-none transition"
            >
              {anosLetivos.map(ano => (
                <option key={ano} value={ano}>
                  {ano} {ano === `${new Date().getFullYear()}/${new Date().getFullYear() + 1}` ? ' (Atual)' : ''}
                </option>
              ))}
            </select>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-4 border-indigo-600"></div>
              <p className="mt-4 text-gray-600">A carregar metas do ano {selectedAno}...</p>
            </div>
          ) : isResponsavelOnly ? (
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-4 font-semibold text-gray-700 border-b">Indicador</th>
                  <th className="p-4 font-semibold text-gray-700 border-b">Meta</th>
                </tr>
              </thead>
              <tbody>
                {indicadores.map(ind => (
                  <tr key={ind.id} className="border-t hover:bg-gray-50">
                    <td className="p-4">{ind.nome}</td>
                    <td className="p-4 font-mono">{metas[ind.id] || 'N/A'} {ind.unidade}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="grid gap-5">
              {indicadores.map(ind => (
                <div
                  key={ind.id}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl hover:shadow-md transition"
                >
                  <div className="flex-1">
                    <span className="font-semibold text-gray-800 text-lg">{ind.nome}</span>
                    <span className="block text-sm text-gray-500 mt-1">Indicador {ind.id}</span>
                  </div>
                  <div className="flex items-center gap-4 mt-4 sm:mt-0">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max={ind.id === '5b' ? 4 : 100}
                      value={metas[ind.id] || ''}
                      onChange={(e) => handleInputChange(ind.id, e.target.value)}
                      className="w-28 px-4 py-3 border-2 border-gray-300 rounded-lg text-right text-xl font-bold focus:border-indigo-500 outline-none"
                      placeholder="0.0"
                    />
                    <span className="text-lg font-medium text-gray-600 w-32 text-left">
                      {ind.unidade}
                    </span>
                  </div>
                </div>
              ))}

              <div className="text-center mt-10">
                <button
                  onClick={saveAll}
                  disabled={saving}
                  className={`px-12 py-4 rounded-xl text-white font-bold text-lg transition transform hover:scale-105 shadow-lg ${
                    saving 
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700'
                  }`}
                >
                  {saving ? 'A GUARDAR METAS...' : 'GUARDAR TODAS AS METAS'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Rodapé */}
        <div className="bg-gray-50 px-8 py-5 border-t text-center text-sm text-gray-600 flex justify-center items-center gap-4">
          <button
            onClick={handlePrintPDF}
            disabled={loading}
            className="px-6 py-2 rounded-xl text-white font-bold bg-blue-600 hover:bg-blue-700 transition"
          >
            Imprimir PDF
          </button>
          Sistema EQAVET 2025 • Metas definidas anualmente conforme Plano de Melhoria • Auditável ANQEP
        </div>
      </div>
    </div>
  );
};

export default MetasInstitucionais;
