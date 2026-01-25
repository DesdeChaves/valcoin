import React, { useState, useRef } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts';
import {
  mean,
  standardDeviation,
  variance,
  quantile,
  median,
  min,
  max,
} from 'simple-statistics';
import { Printer } from 'lucide-react';
import html2canvas from 'html2canvas';

const IndicadoresTab = ({ avaliacoes, ciclo }) => {
  const [selectedAno, setSelectedAno] = useState('');
  const [selectedDisciplinas, setSelectedDisciplinas] = useState([]);
  const [exportingPDF, setExportingPDF] = useState(false);
  const refSectionPositivas = useRef(null);
  const refSectionMedias = useRef(null);
  const refSectionEvolucao = useRef(null);

  const cicloMap = {
    '1_ciclo': '1º ciclo',
    '2_ciclo': '2º ciclo',
    '3_ciclo': '3º ciclo',
    'secundario': 'Secundário'
  }

  const calculateStats = (data, groupKey, valueKey) => {
    const grouped = {};
    data.forEach(item => {
      const key = item[groupKey];
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(item[valueKey] || 0);
    });
    return Object.entries(grouped)
      .map(([group, values]) => {
        if (values.length < 2) return null;
        const avg = mean(values);
        const std = standardDeviation(values);
        const cv = (std / avg) * 100 || 0;
        const minVal = min(values);
        const maxVal = max(values);
        const varVal = variance(values);
        return {
          group,
          mean: avg.toFixed(2),
          stdDev: std.toFixed(2),
          cv: cv.toFixed(2),
          min: minVal.toFixed(2),
          max: maxVal.toFixed(2),
          variance: varVal.toFixed(2),
          count: values.length,
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.group.localeCompare(b.group));
  };

  const calculateMedia = (av) => {
    const classif = av.classificacoes || {};
    let sum = 0;
    let total = 0;
    if (av.ciclo === '1_ciclo') {
      sum = 1 * (classif.I || 0) + 2 * (classif.S || 0) + 3 * (classif.B || 0) + 4 * (classif.MB || 0);
      total = av.total_alunos || 1;
    } else if (av.ciclo === '2_ciclo' || av.ciclo === '3_ciclo') {
      for (let i = 1; i <= 5; i++) {
        sum += i * (classif[i.toString()] || 0);
      }
      total = av.total_alunos || 1;
    } else if (av.ciclo === 'secundario') {
      if (classif.media) return classif.media;
      sum = 4 * (classif['1_7'] || 0) + 8.5 * (classif['8_9'] || 0) + 11.5 * (classif['10_13'] || 0) +
            15.5 * (classif['14_17'] || 0) + 19 * (classif['18_20'] || 0);
      total = av.total_alunos || 1;
    }
    return total > 0 ? sum / total : 0;
  };

  const calculateStatsByTurma = (data, anoKey, valueKey) => {
    const porAno = {};
    data.forEach(item => {
      const ano = item[anoKey];
      if (!porAno[ano]) porAno[ano] = {};
   
      const turmaKey = `${item.ano}-${item.turma}`;
      if (!porAno[ano][turmaKey]) {
        porAno[ano][turmaKey] = {
          values: [],
          turma: item.turma
        };
      }
      porAno[ano][turmaKey].values.push(item[valueKey] || 0);
    });
    return Object.entries(porAno).map(([ano, turmas]) => {
      const turmasArray = Object.values(turmas);
      if (turmasArray.length < 2) return null;
      const mediasPorTurma = turmasArray.map(t => mean(t.values));
   
      const avg = mean(mediasPorTurma);
      const std = standardDeviation(mediasPorTurma);
      const cv = (std / avg) * 100 || 0;
      const minVal = min(mediasPorTurma);
      const maxVal = max(mediasPorTurma);
   
      return {
        group: ano,
        mean: avg.toFixed(2),
        stdDev: std.toFixed(2),
        cv: cv.toFixed(2),
        min: minVal.toFixed(2),
        max: maxVal.toFixed(2),
        numTurmas: turmasArray.length,
        numRegistos: turmasArray.reduce((sum, t) => sum + t.values.length, 0)
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.group.localeCompare(b.group));
  };

  const heterogeneidadePositivasPorAno = calculateStatsByTurma(avaliacoes, 'ano', 'percent_positivos');
  const dadosComMedia = avaliacoes.map(av => ({
    ...av,
    media_calculada: calculateMedia(av)
  }));
  const heterogeneidadeMediasPorAno = calculateStatsByTurma(dadosComMedia, 'ano', 'media_calculada');

  const percentisPorAnoLetivo = (() => {
    const groupedPositivas = {};
    const groupedMedias = {};
 
    avaliacoes.forEach(av => {
      const key = av.ano_letivo;
      if (!groupedPositivas[key]) groupedPositivas[key] = [];
      if (!groupedMedias[key]) groupedMedias[key] = [];
      groupedPositivas[key].push(av.percent_positivos || 0);
      groupedMedias[key].push(calculateMedia(av));
    });
    return Object.entries(groupedPositivas)
      .map(([anoLetivo, positivas]) => {
        if (positivas.length === 0) return null;
        const medias = groupedMedias[anoLetivo];
        return {
          anoLetivo,
          p25_pos: quantile(positivas, 0.25).toFixed(2),
          p50_pos: median(positivas).toFixed(2),
          p75_pos: quantile(positivas, 0.75).toFixed(2),
          mean_pos: mean(positivas).toFixed(2),
          stdDev_pos: standardDeviation(positivas).toFixed(2),
          p25_med: quantile(medias, 0.25).toFixed(2),
          p50_med: median(medias).toFixed(2),
          p75_med: quantile(medias, 0.75).toFixed(2),
          mean_med: mean(medias).toFixed(2),
          stdDev_med: standardDeviation(medias).toFixed(2),
          count: positivas.length,
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.anoLetivo.localeCompare(b.anoLetivo));
  })();

  const getEfeitoDisciplinaPorAno = () => {
    const efeitosPorAnoLetivo = {};
 
    avaliacoes.forEach(av => {
      if (!efeitosPorAnoLetivo[av.ano_letivo]) efeitosPorAnoLetivo[av.ano_letivo] = [];
      efeitosPorAnoLetivo[av.ano_letivo].push({
        ...av,
        media_calculada: calculateMedia(av)
      });
    });
    return Object.entries(efeitosPorAnoLetivo).map(([anoLetivo, dados]) => {
      const mediaGeral = mean(dados.map(d => d.media_calculada));
      const mediasPorAnoEscolar = {};
      dados.forEach(item => {
        if (!mediasPorAnoEscolar[item.ano]) mediasPorAnoEscolar[item.ano] = [];
        mediasPorAnoEscolar[item.ano].push(item.media_calculada);
      });
      const mediasAno = Object.entries(mediasPorAnoEscolar).reduce((acc, [ano, vals]) => {
        acc[ano] = mean(vals);
        return acc;
      }, {});
      const residuosPorDisciplina = {};
      dados.forEach(item => {
        const mediaAnoEscolar = mediasAno[item.ano] || 0;
        const residual = item.media_calculada - mediaAnoEscolar;
     
        const key = `${item.disciplina}|||${item.ano}`;
        if (!residuosPorDisciplina[key]) {
          residuosPorDisciplina[key] = {
            disciplina: item.disciplina,
            ano: item.ano,
            residuais: []
          };
        }
        residuosPorDisciplina[key].residuais.push(residual);
      });
      const mediaResidualPorDisc = Object.values(residuosPorDisciplina)
        .map(item => ({
          disciplina: item.disciplina,
          ano: item.ano,
          mediaResidual: mean(item.residuais),
          count: item.residuais.length,
        }))
        .sort((a, b) => Math.abs(b.mediaResidual) - Math.abs(a.mediaResidual));
      return {
        anoLetivo,
        mediaGeral: mediaGeral.toFixed(2),
        mediaResidualPorDisc,
      };
    }).sort((a, b) => a.anoLetivo.localeCompare(b.anoLetivo));
  };

  const efeitosDisciplina = getEfeitoDisciplinaPorAno();

  const getEvolucaoDisciplina = (disciplina) => {
    const evolucao = efeitosDisciplina.map(ef => {
      const disc = ef.mediaResidualPorDisc.find(d => d.disciplina === disciplina);
      return {
        anoLetivo: ef.anoLetivo,
        mediaResidual: disc ? disc.mediaResidual.toFixed(2) : null,
        count: disc ? disc.count : 0
      };
    }).filter(e => e.mediaResidual !== null);
    return evolucao;
  };

  const disciplinasUnicas = [...new Set(avaliacoes.map(av => av.disciplina))].sort();
  const anosLetivos = [...new Set(avaliacoes.map(av => av.ano_letivo))].sort();

  const getTopDisciplinas = (anoLetivo, limit = 10) => {
    const efeito = efeitosDisciplina.find(e => e.anoLetivo === anoLetivo);
    if (!efeito) return [];
 
    return efeito.mediaResidualPorDisc
      .slice(0, limit)
      .map(d => ({
        ...d,
        mediaResidual: Number(d.mediaResidual.toFixed(2))
      }));
  };

  const getColor = (value, threshold = 0.3) => {
    if (value > threshold) return '#10b981';
    if (value < -threshold) return '#ef4444';
    return '#6b7280';
  };

  const colors = ['#8b5cf6', '#10b981', '#ef4444', '#f59e0b', '#6366f1', '#ec4899', '#06b6d4', '#f43f5e'];

  const generateTableHeteroPosHTML = () => {
    if (heterogeneidadePositivasPorAno.length === 0) return '<p class="text-center text-gray-500 py-4">Sem dados disponíveis.</p>';
    let html = `
      <h3 class="text-lg font-semibold mb-4">A) Heterogeneidade das % Positivas</h3>
      <table class="calculation-table">
        <thead>
          <tr>
            <th>Ano Escolar</th>
            <th>Média %</th>
            <th>CV (%)</th>
            <th>Desvio Padrão</th>
            <th>Mín/Máx</th>
            <th>Nº Turmas</th>
            <th>Nº Registos</th>
          </tr>
        </thead>
        <tbody>
    `;
    heterogeneidadePositivasPorAno.forEach(item => {
      const cvColor = Number(item.cv) > 20 ? '#ef4444' : Number(item.cv) > 10 ? '#f59e0b' : '#10b981';
      html += `
        <tr>
          <td>${item.group}</td>
          <td>${item.mean}%</td>
          <td style="color:${cvColor};font-weight:bold;">${item.cv}%</td>
          <td>${item.stdDev}%</td>
          <td>${item.min}% / ${item.max}%</td>
          <td>${item.numTurmas}</td>
          <td>${item.numRegistos}</td>
        </tr>
      `;
    });
    html += `</tbody></table>`;
    return html;
  };

  const generateTableHeteroMedHTML = () => {
    if (heterogeneidadeMediasPorAno.length === 0) return '<p class="text-center text-gray-500 py-4">Sem dados disponíveis.</p>';
    let html = `
      <h3 class="text-lg font-semibold mb-4">B) Heterogeneidade das Médias Calculadas</h3>
      <table class="calculation-table">
        <thead>
          <tr>
            <th>Ano Escolar</th>
            <th>Média</th>
            <th>CV (%)</th>
            <th>Desvio Padrão</th>
            <th>Mín/Máx</th>
            <th>Nº Turmas</th>
          </tr>
        </thead>
        <tbody>
    `;
    heterogeneidadeMediasPorAno.forEach(item => {
      const cvColor = Number(item.cv) > 20 ? '#ef4444' : Number(item.cv) > 10 ? '#f59e0b' : '#10b981';
      html += `
        <tr>
          <td>${item.group}</td>
          <td>${item.mean}</td>
          <td style="color:${cvColor};font-weight:bold;">${item.cv}%</td>
          <td>${item.stdDev}</td>
          <td>${item.min} / ${item.max}</td>
          <td>${item.numTurmas}</td>
        </tr>
      `;
    });
    html += `</tbody></table>`;
    return html;
  };

  const generateAnaliseComparativaHTML = () => {
    if (percentisPorAnoLetivo.length <= 1) return '';
    let html = `
      <h3 class="text-lg font-semibold mb-3">📈 Análise Comparativa entre Gerações</h3>
      <div class="space-y-2 text-sm">
    `;
    percentisPorAnoLetivo.forEach((item, idx, arr) => {
      if (idx === 0) return;
      const prev = arr[idx - 1];
      const diffPos = (Number(item.mean_pos) - Number(prev.mean_pos)).toFixed(2);
      const diffMed = (Number(item.mean_med) - Number(prev.mean_med)).toFixed(2);
      html += `
        <div class="p-3 bg-white rounded border border-gray-200">
          <div class="font-semibold text-gray-900 mb-2">
            ${prev.anoLetivo} → ${item.anoLetivo}
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <span class="text-gray-600">% Positivas: </span>
              <span class="font-bold" style="color:${Number(diffPos) > 0 ? '#10b981' : Number(diffPos) < 0 ? '#ef4444' : '#6b7280'}">
                ${Number(diffPos) > 0 ? '+' : ''}${diffPos}%
                ${Number(diffPos) > 0 ? ' ↗ (melhoria)' : Number(diffPos) < 0 ? ' ↘ (deterioração)' : ' → (estável)'}
              </span>
              <div class="text-xs text-gray-500 mt-1">
                ${prev.mean_pos}% → ${item.mean_pos}%
              </div>
            </div>
            <div>
              <span class="text-gray-600">Média Geral: </span>
              <span class="font-bold" style="color:${Number(diffMed) > 0 ? '#10b981' : Number(diffMed) < 0 ? '#ef4444' : '#6b7280'}">
                ${Number(diffMed) > 0 ? '+' : ''}${diffMed}
                ${Number(diffMed) > 0 ? ' ↗ (melhoria)' : Number(diffMed) < 0 ? ' ↘ (deterioração)' : ' → (estável)'}
              </span>
              <div class="text-xs text-gray-500 mt-1">
                ${prev.mean_med} → ${item.mean_med}
              </div>
            </div>
          </div>
        </div>
      `;
    });
    html += `</div>`;
    return html;
  };

  const generateTablePercentisHTML = () => {
    if (percentisPorAnoLetivo.length === 0) return '<p class="text-center text-gray-500 py-4">Sem dados disponíveis.</p>';
    let html = `
      <h3 class="text-lg font-semibold mb-4">Distribuição Estatística por Ano Letivo</h3>
      <table class="calculation-table">
        <thead>
          <tr>
            <th>Ano Letivo</th>
            <th>P25 Pos</th>
            <th>P50 Pos</th>
            <th>P75 Pos</th>
            <th>Média Pos</th>
            <th>Desvio Pos</th>
            <th>P25 Média</th>
            <th>P50 Média</th>
            <th>P75 Média</th>
            <th>Média Geral</th>
            <th>Desvio Média</th>
            <th>Nº Registos</th>
          </tr>
        </thead>
        <tbody>
    `;
    percentisPorAnoLetivo.forEach(item => {
      html += `
        <tr>
          <td>${item.anoLetivo}</td>
          <td>${item.p25_pos}%</td>
          <td>${item.p50_pos}%</td>
          <td>${item.p75_pos}%</td>
          <td style="font-weight:bold;">${item.mean_pos}%</td>
          <td>${item.stdDev_pos}%</td>
          <td>${item.p25_med}</td>
          <td>${item.p50_med}</td>
          <td>${item.p75_med}</td>
          <td style="font-weight:bold;">${item.mean_med}</td>
          <td>${item.stdDev_med}</td>
          <td>${item.count}</td>
        </tr>
      `;
    });
    html += `</tbody></table>`;
    return html;
  };

  const generateEfeitosDisciplinaHTML = () => {
    const efeitosFiltrados = efeitosDisciplina.filter(ef => !selectedAno || ef.anoLetivo === selectedAno);
    if (efeitosFiltrados.length === 0) return '<p class="text-center text-gray-500 py-4">Sem dados para o filtro aplicado.</p>';
    let html = '';
    efeitosFiltrados.forEach(efeito => {
      const top = getTopDisciplinas(efeito.anoLetivo);
      html += `
        <div class="mb-8">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-xl font-semibold">${efeito.anoLetivo}</h3>
            <span class="text-sm text-gray-500">Média Geral: ${efeito.mediaGeral}</span>
          </div>
          <p class="text-xs text-gray-500 mb-4">Top 10 disciplinas com maior desvio (positivo ou negativo)</p>
          <table class="calculation-table">
            <thead>
              <tr>
                <th>Disciplina</th>
                <th>Ano Escolar</th>
                <th>Residual Médio</th>
                <th>Impacto</th>
                <th>Nº Turmas</th>
              </tr>
            </thead>
            <tbody>
      `;
      top.forEach(disc => {
        const color = getColor(disc.mediaResidual, 0.3);
        const impacto = disc.mediaResidual > 0.5 ? '↑ Positivo' : disc.mediaResidual < -0.5 ? '↓ Negativo' : '≈ Neutro';
        const impactoBg = disc.mediaResidual > 0.5 ? '#d0f4e2' : disc.mediaResidual < -0.5 ? '#fcd9d9' : '#e5e7eb';
        html += `
          <tr>
            <td>${disc.disciplina}</td>
            <td>${disc.ano}</td>
            <td style="color:${color};font-weight:bold;">${disc.mediaResidual > 0 ? '+' : ''}${disc.mediaResidual.toFixed(2)}</td>
            <td style="background:${impactoBg};padding:4px 8px;border-radius:4px;text-align:center;">${impacto}</td>
            <td>${disc.count}</td>
          </tr>
        `;
      });
      html += `</tbody></table></div>`;
    });
    return html;
  };

  const generateEvolucoesHTML = () => {
    if (selectedDisciplinas.length === 0) return '';

    let html = '<h3 class="text-xl font-semibold mb-4">Evolução Temporal das Disciplinas Selecionadas</h3>';
    html += '<p class="text-sm text-gray-600 mb-4">Acompanhamento do residual médio ao longo dos anos letivos (valores positivos = melhoria; negativos = dificuldades)</p>';

    if (selectedDisciplinas.length === 1) {
      const disc = selectedDisciplinas[0];
      const evolucao = getEvolucaoDisciplina(disc);
      if (evolucao.length === 0) return '<p class="text-center text-gray-500 py-4">Sem dados disponíveis para esta disciplina.</p>';
      html += `<h4 class="text-lg font-semibold mb-4">${disc}</h4>`;
      html += '<table class="calculation-table"><thead><tr><th>Ano Letivo</th><th>Residual</th></tr></thead><tbody>';
      evolucao.forEach(item => {
        const color = getColor(Number(item.mediaResidual), 0.3);
        html += `<tr><td>${item.anoLetivo}</td><td style="color:${color};font-weight:bold;">${Number(item.mediaResidual) > 0 ? '+' : ''}${item.mediaResidual}</td></tr>`;
      });
      html += '</tbody></table>';
    } else {
      html += '<table class="calculation-table"><thead><tr><th>Ano Letivo</th>';
      selectedDisciplinas.forEach(disc => {
        html += `<th>${disc}</th>`;
      });
      html += '</tr></thead><tbody>';
      anosLetivos.forEach(year => {
        html += `<tr><td>${year}</td>`;
        selectedDisciplinas.forEach(disc => {
          const ef = efeitosDisciplina.find(e => e.anoLetivo === year);
          const d = ef?.mediaResidualPorDisc.find(dd => dd.disciplina === disc);
          const val = d ? d.mediaResidual.toFixed(2) : '-';
          const color = d && Number(d.mediaResidual) > 0.3 ? '#10b981' : d && Number(d.mediaResidual) < -0.3 ? '#ef4444' : '#6b7280';
          html += `<td style="color:${color};font-weight:bold;">${val !== '-' ? (Number(val) > 0 ? '+' : '') + val : val}</td>`;
        });
        html += '</tr>';
      });
      html += '</tbody></table>';
    }
    return html;
  };

  const captureChartAsPng = async (ref) => {
    if (!ref.current) return null;
    try {
      const canvas = await html2canvas(ref.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: true,
        allowTaint: true,
      });
      return canvas.toDataURL('image/png');
    } catch (error) {
      console.error('Erro html2canvas:', error);
      return null;
    }
  };

  const exportarPDF = async () => {
    if (avaliacoes.length === 0) return alert('Não há dados.');
    setExportingPDF(true);
    try {
      await new Promise(r => setTimeout(r, 1500));
      window.dispatchEvent(new Event('resize'));
      await new Promise(r => setTimeout(r, 800));

      const base64Positivas = await captureChartAsPng(refSectionPositivas);
      await new Promise(r => setTimeout(r, 500));
      const base64Medias = await captureChartAsPng(refSectionMedias);
      await new Promise(r => setTimeout(r, 500));
      const base64Evolucao = selectedDisciplinas.length > 0 ? await captureChartAsPng(refSectionEvolucao) : null;

      const dataGeracao = new Date().toLocaleDateString('pt-PT');
      const horaGeracao = new Date().toLocaleTimeString('pt-PT');

const htmlContent = `
        <html>
          <head>
            <title>Relatório de Indicadores de Resultados Escolares</title>
            <style>
              @page { margin: 15mm; }
              body { 
                font-family: 'Segoe UI', 'Arial', sans-serif; 
                margin: 0; 
                padding: 0; 
                line-height: 1.4; 
                color: #1f2937; 
                font-size: 9pt; 
                background: #ffffff;
              }
              .header { 
                text-align: center; 
                margin-bottom: 20px; 
                border-bottom: 3px solid #4f46e5; 
                padding-bottom: 15px; 
                background: linear-gradient(to bottom, #f0f9ff 0%, #ffffff 100%);
                padding: 20px;
                border-radius: 8px 8px 0 0;
              }
              h1 { 
                font-size: 20pt; 
                font-weight: bold; 
                color: #1e3a8a; 
                margin: 0 0 8px 0;
                letter-spacing: -0.5px;
              }
              h2 { 
                font-size: 14pt; 
                font-weight: bold; 
                color: #4f46e5; 
                margin: 25px 0 12px 0; 
                padding-bottom: 8px;
                border-bottom: 2px solid #e0e7ff;
                page-break-after: avoid;
              }
              h3 { 
                font-size: 11pt; 
                font-weight: 600; 
                color: #6366f1; 
                margin: 18px 0 10px 0;
                page-break-after: avoid;
              }
              h4 { 
                font-size: 10pt; 
                font-weight: 600; 
                color: #4b5563; 
                margin: 12px 0 8px 0;
              }
              .subtitle { 
                font-size: 9pt; 
                color: #6b7280; 
                margin-top: 8px;
                font-style: italic;
              }
              .info-box {
                background: #eff6ff;
                border-left: 4px solid #3b82f6;
                padding: 12px 15px;
                margin: 15px 0;
                border-radius: 4px;
                font-size: 8.5pt;
                line-height: 1.5;
                page-break-inside: avoid;
              }
              .info-box h3 {
                color: #1e40af;
                font-size: 10pt;
                margin: 0 0 8px 0;
              }
              .info-box p {
                margin: 0;
                color: #1e40af;
              }
              .calculation-table { 
                width: 100%; 
                border-collapse: collapse; 
                margin: 15px 0; 
                font-size: 8pt;
                page-break-inside: avoid;
                background: white;
                box-shadow: 0 1px 3px rgba(0,0,0,0.1);
              }
              .calculation-table thead {
                background: linear-gradient(to bottom, #4f46e5 0%, #4338ca 100%);
                color: white;
              }
              .calculation-table th { 
                padding: 10px 8px; 
                text-align: left; 
                font-weight: 600; 
                border: 1px solid #3730a3;
                font-size: 8pt;
                text-transform: uppercase;
                letter-spacing: 0.3px;
              }
              .calculation-table td { 
                padding: 8px; 
                border: 1px solid #e5e7eb; 
                text-align: left;
                font-size: 8pt;
              }
              .calculation-table tbody tr:nth-child(odd) {
                background-color: #f9fafb;
              }
              .calculation-table tbody tr:nth-child(even) {
                background-color: #ffffff;
              }
              .calculation-table tbody tr:hover {
                background-color: #f3f4f6;
              }
              .chart-img { 
                width: 100%; 
                max-width: 750px; 
                height: auto; 
                margin: 20px auto; 
                display: block; 
                page-break-inside: avoid;
                border: 1px solid #e5e7eb;
                border-radius: 8px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                padding: 10px;
                background: white;
              }
              .footer { 
                font-size: 7.5pt; 
                text-align: center; 
                margin-top: 30px; 
                color: #6b7280; 
                border-top: 2px solid #e5e7eb; 
                padding-top: 12px;
                font-style: italic;
              }
              .comparison-box {
                background: white;
                border: 1px solid #e5e7eb;
                border-radius: 6px;
                padding: 12px;
                margin: 10px 0;
                page-break-inside: avoid;
              }
              .comparison-title {
                font-weight: 600;
                color: #111827;
                margin-bottom: 8px;
                font-size: 9pt;
              }
              .comparison-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 12px;
              }
              .comparison-item {
                font-size: 8pt;
                line-height: 1.5;
              }
              .metric-label {
                color: #6b7280;
                font-weight: 500;
              }
              .metric-value {
                font-weight: 700;
                font-size: 9pt;
              }
              .metric-detail {
                font-size: 7pt;
                color: #9ca3af;
                margin-top: 2px;
              }
              p { 
                margin: 8px 0; 
                line-height: 1.5;
                font-size: 8.5pt;
              }
              strong {
                color: #1f2937;
                font-weight: 600;
              }
              .section-separator {
                margin: 25px 0;
                border-top: 1px dashed #d1d5db;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>Relatório de Indicadores de Resultados Escolares</h1>
              <div class="subtitle">Gerado em ${dataGeracao} às ${horaGeracao}</div>
              ${ciclo ? `<p><strong>Ciclo:</strong> ${cicloMap[ciclo]}</p>` : ''}
              ${selectedAno ? `<p><strong>Ano Letivo filtrado:</strong> ${selectedAno}</p>` : ''}
              ${selectedDisciplinas.length > 0 ? `<p><strong>Disciplinas acompanhadas:</strong> ${selectedDisciplinas.join(', ')}</p>` : ''}
            </div>
        
            <div class="info-box">
              <h3 style="font-size: 12pt; color: #1e40af; margin-bottom: 5px;">📊 Sobre estes Indicadores</h3>
              <p style="color: #1e40af;">
                Esta análise decompõe os resultados escolares em três componentes principais:
                <br/><strong>1. Efeito Administrativo:</strong> Diferenças entre turmas do mesmo ano escolar (equilíbrio na formação de turmas)
                <br/><strong>2. Efeito Geracional:</strong> Variação de desempenho entre diferentes anos letivos (ex: 2023/24 vs 2024/25)
                <br/><strong>3. Efeito Professor/Disciplina:</strong> Impacto específico de professores/disciplinas, descontando os efeitos anteriores
              </p>
            </div>
            <h2>1. Efeito Administrativo: Equilíbrio entre Turmas</h2>
            ${generateTableHeteroPosHTML()}
            ${generateTableHeteroMedHTML()}
            <h2>2. Efeito Geracional: Evolução entre Anos Letivos</h2>
            ${generateAnaliseComparativaHTML()}
            ${generateTablePercentisHTML()}
            ${base64Positivas ? `<img src="${base64Positivas}" class="chart-img" alt="Evolução da % de Positivas">` : ''}
            ${base64Medias ? `<img src="${base64Medias}" class="chart-img" alt="Evolução das Médias Calculadas">` : ''}
            <h2>3. Efeito Professor/Disciplina</h2>
            ${generateEfeitosDisciplinaHTML()}
            ${generateEvolucoesHTML()}
            ${base64Evolucao ? `<img src="${base64Evolucao}" class="chart-img" alt="Evolução das Disciplinas">` : ''}
            <div class="footer">
              Plataforma Aurora 2025 - Jorge Magalhães • Relatório gerado com ${avaliacoes.length} registo(s)
            </div>
          </body>
        </html>
      `;

      const formData = new FormData();
      formData.append('files', new Blob([htmlContent], { type: 'text/html' }), 'index.html');

      const response = await fetch('/gotenberg/forms/chromium/convert/html', { method: 'POST', body: formData });
      if (!response.ok) throw new Error('Erro Gotenberg');

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Relatorio_Indicadores_${selectedAno || 'Todos'}_${Date.now()}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      alert('Erro ao gerar PDF.');
    } finally {
      setExportingPDF(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-end">
        <button
          onClick={exportarPDF}
          disabled={exportingPDF || avaliacoes.length === 0}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-semibold shadow-lg transition-colors"
        >
          {exportingPDF ? (
            <>
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              A gerar PDF...
            </>
          ) : (
            <>
              <Printer className="w-5 h-5" />
              Exportar Relatório PDF
            </>
          )}
        </button>
      </div>
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">📊 Sobre estes Indicadores</h3>
        <p className="text-blue-800 text-sm leading-relaxed">
          Esta análise decompõe os resultados escolares em três componentes principais:
          <br/><strong>1. Efeito Administrativo:</strong> Diferenças entre turmas do mesmo ano escolar (equilíbrio na formação de turmas)
          <br/><strong>2. Efeito Geracional:</strong> Variação de desempenho entre diferentes anos letivos (ex: 2023/24 vs 2024/25)
          <br/><strong>3. Efeito Professor/Disciplina:</strong> Impacto específico de professores/disciplinas, descontando os efeitos anteriores
        </p>
      </div>
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-indigo-900 mb-2">
          1️⃣ Efeito Administrativo: Equilíbrio entre Turmas
        </h2>
        <p className="text-gray-600 mb-6 text-sm">
          Avalia se as turmas do mesmo ano escolar estão equilibradas. <strong>CV baixo (&lt;10%)</strong> indica boa distribuição de alunos.
        </p>
        <h3 className="text-xl font-semibold text-indigo-700 mb-4">A) Heterogeneidade das % Positivas</h3>
        <div className="overflow-x-auto mb-8">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ano Escolar</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Média %</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">CV (%)</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Desvio Padrão</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mín/Máx</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nº Turmas</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nº Registos</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {heterogeneidadePositivasPorAno.length > 0 ? heterogeneidadePositivasPorAno.map(item => (
                <tr key={item.group} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.group}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{item.mean}%</td>
                  <td className="px-4 py-3 text-sm font-bold" style={{ color: Number(item.cv) > 20 ? '#ef4444' : Number(item.cv) > 10 ? '#f59e0b' : '#10b981' }}>
                    {item.cv}%
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{item.stdDev}%</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{item.min}% / {item.max}%</td>
                  <td className="px-4 py-3 text-sm font-semibold text-indigo-600">{item.numTurmas}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{item.numRegistos}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="7" className="px-4 py-8 text-center text-gray-400">
                    Sem dados disponíveis. Carregue dados com pelo menos 2 turmas por ano escolar.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <h3 className="text-xl font-semibold text-indigo-700 mb-4">B) Heterogeneidade das Médias Calculadas</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ano Escolar</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Média</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">CV (%)</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Desvio Padrão</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mín/Máx</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nº Turmas</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {heterogeneidadeMediasPorAno.length > 0 ? heterogeneidadeMediasPorAno.map(item => (
                <tr key={item.group} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.group}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{item.mean}</td>
                  <td className="px-4 py-3 text-sm font-bold" style={{ color: Number(item.cv) > 20 ? '#ef4444' : Number(item.cv) > 10 ? '#f59e0b' : '#10b981' }}>
                    {item.cv}%
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{item.stdDev}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{item.min} / {item.max}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{item.numTurmas}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center text-gray-400">
                    Sem dados disponíveis.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-indigo-900 mb-2">
          2️⃣ Efeito Geracional: Evolução entre Anos Letivos
        </h2>
        <p className="text-gray-600 mb-6 text-sm">
          Compara os resultados escolares entre diferentes gerações (anos letivos). Permite identificar se houve melhoria ou deterioração geral do desempenho ao longo do tempo.
        </p>
        {percentisPorAnoLetivo.length > 1 && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg mb-6 border border-blue-200">
            <h3 className="text-lg font-semibold text-indigo-900 mb-3">📈 Análise Comparativa entre Gerações</h3>
            <div className="space-y-2 text-sm">
              {percentisPorAnoLetivo.map((item, idx, arr) => {
                if (idx === 0) return null;
                const prev = arr[idx - 1];
                const diffPos = (Number(item.mean_pos) - Number(prev.mean_pos)).toFixed(2);
                const diffMed = (Number(item.mean_med) - Number(prev.mean_med)).toFixed(2);
            
                return (
                  <div key={item.anoLetivo} className="p-3 bg-white rounded border border-gray-200">
                    <div className="font-semibold text-gray-900 mb-2">
                      {prev.anoLetivo} → ${item.anoLetivo}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <span className="text-gray-600">% Positivas: </span>
                        <span className={`font-bold ${Number(diffPos) > 0 ? 'text-green-600' : Number(diffPos) < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                          {Number(diffPos) > 0 ? '+' : ''}{diffPos}%
                          {Number(diffPos) > 0 ? ' ↗ (melhoria)' : Number(diffPos) < 0 ? ' ↘ (deterioração)' : ' → (estável)'}
                        </span>
                        <div className="text-xs text-gray-500 mt-1">
                          {prev.mean_pos}% → ${item.mean_pos}%
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-600">Média Geral: </span>
                        <span className={`font-bold ${Number(diffMed) > 0 ? 'text-green-600' : Number(diffMed) < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                          {Number(diffMed) > 0 ? '+' : ''}{diffMed}
                          {Number(diffMed) > 0 ? ' ↗ (melhoria)' : Number(diffMed) < 0 ? ' ↘ (deterioração)' : ' → (estável)'}
                        </span>
                        <div className="text-xs text-gray-500 mt-1">
                          {prev.mean_med} → ${item.mean_med}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        <h3 className="text-lg font-semibold text-indigo-700 mb-4">Distribuição Estatística por Ano Letivo</h3>
        <div className="overflow-x-auto mb-6">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ano Letivo</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">P25 Pos</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">P50 Pos</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">P75 Pos</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Média Pos</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Desvio Pos</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">P25 Média</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">P50 Média</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">P75 Média</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Média Geral</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Desvio Média</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nº Registos</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {percentisPorAnoLetivo.length > 0 ? percentisPorAnoLetivo.map(item => (
                <tr key={item.anoLetivo} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.anoLetivo}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{item.p25_pos}%</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{item.p50_pos}%</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{item.p75_pos}%</td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-700">{item.mean_pos}%</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{item.stdDev_pos}%</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{item.p25_med}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{item.p50_med}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{item.p75_med}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-700">{item.mean_med}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{item.stdDev_med}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{item.count}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="12" className="px-4 py-8 text-center text-gray-400">
                    Sem dados disponíveis.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {percentisPorAnoLetivo.length > 0 && (
          <div className="space-y-12">
            <div>
              <h3 className="text-lg font-semibold text-indigo-700 mb-4 text-center">Evolução da % de Positivas</h3>
              <div ref={refSectionPositivas} className="mx-auto" style={{ width: '800px', height: '400px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={percentisPorAnoLetivo}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="anoLetivo" />
                    <YAxis domain={[0, 100]} label={{ value: '% Positivas', angle: -90, position: 'insideLeft' }} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="mean_pos" stroke="#8b5cf6" name="Média % Positivas" strokeWidth={3} />
                    <Line type="monotone" dataKey="p25_pos" stroke="#ef4444" name="P25" strokeWidth={1.5} strokeDasharray="3 3" />
                    <Line type="monotone" dataKey="p50_pos" stroke="#f59e0b" name="Mediana (P50)" strokeWidth={2} />
                    <Line type="monotone" dataKey="p75_pos" stroke="#10b981" name="P75" strokeWidth={1.5} strokeDasharray="3 3" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-indigo-700 mb-4 text-center">Evolução das Médias Calculadas</h3>
              <div ref={refSectionMedias} className="mx-auto" style={{ width: '800px', height: '400px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={percentisPorAnoLetivo}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="anoLetivo" />
                    <YAxis domain={[0, 'auto']} label={{ value: 'Média (escala do ciclo)', angle: -90, position: 'insideLeft' }} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="mean_med" stroke="#10b981" name="Média Geral" strokeWidth={3} />
                    <Line type="monotone" dataKey="p25_med" stroke="#ef4444" name="P25" strokeWidth={1.5} strokeDasharray="3 3" />
                    <Line type="monotone" dataKey="p50_med" stroke="#f59e0b" name="Mediana (P50)" strokeWidth={2} />
                    <Line type="monotone" dataKey="p75_med" stroke="#6366f1" name="P75" strokeWidth={1.5} strokeDasharray="3 3" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-indigo-900 mb-2">
          3️⃣ Efeito Professor/Disciplina (descontado efeito administrativo e geracional)
        </h2>
        <p className="text-gray-600 mb-6 text-sm">
          Identifica disciplinas com desempenho <strong className="text-green-600">superior (+)</strong> ou <strong className="text-red-600">inferior (-)</strong> após descontar diferenças entre turmas e gerações.
          <br/>
          Valores positivos indicam que a disciplina/professor tem impacto positivo; negativos indicam dificuldades.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Filtrar por Ano Letivo:</label>
            <select value={selectedAno} onChange={(e) => setSelectedAno(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md">
              <option value="">Todos os Anos</option>
              {anosLetivos.map(ano => <option key={ano} value={ano}>{ano}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Acompanhar Disciplina(s):
              <span className="text-xs text-gray-500 block mt-1">(Segure Ctrl/Cmd para selecionar múltiplas)</span>
            </label>
            <select
              multiple
              size="6"
              value={selectedDisciplinas}
              onChange={(e) => setSelectedDisciplinas(Array.from(e.target.selectedOptions, o => o.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {disciplinasUnicas.map(disc => (
                <option key={disc} value={disc}>{disc}</option>
              ))}
            </select>
          </div>
        </div>

        {efeitosDisciplina.filter(ef => !selectedAno || ef.anoLetivo === selectedAno).map(efeito => (
          <div key={efeito.anoLetivo} className="mb-8 border-t pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-indigo-700">{efeito.anoLetivo}</h3>
              <span className="text-sm text-gray-500">Média Geral: {efeito.mediaGeral}</span>
            </div>
        
            <p className="text-xs text-gray-500 mb-4">Top 10 disciplinas com maior desvio (positivo ou negativo)</p>
        
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Disciplina</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ano Escolar</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Residual Médio</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Impacto</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nº Turmas</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {getTopDisciplinas(efeito.anoLetivo).map((disc, idx) => (
                    <tr key={`${disc.disciplina}-${disc.ano}`} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{disc.disciplina}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{disc.ano}</td>
                      <td className="px-4 py-3 text-sm font-bold" style={{ color: getColor(disc.mediaResidual, 0.3) }}>
                        {disc.mediaResidual > 0 ? '+' : ''}{disc.mediaResidual.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          disc.mediaResidual > 0.5 ? 'bg-green-100 text-green-800' :
                          disc.mediaResidual < -0.5 ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {disc.mediaResidual > 0.5 ? '↑ Positivo' : disc.mediaResidual < -0.5 ? '↓ Negativo' : '≈ Neutro'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">{disc.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}

        {selectedDisciplinas.length > 0 && (
          <div ref={refSectionEvolucao} className="mt-8 p-6 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-200">
            <h3 className="text-xl font-semibold text-indigo-900 mb-4 text-center">
              📈 Evolução Temporal das Disciplinas Selecionadas
            </h3>
            <p className="text-sm text-gray-600 mb-6 text-center">
              Valores positivos = impacto positivo; negativos = dificuldades
            </p>

            {selectedDisciplinas.length === 1 ? (
              <>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={getEvolucaoDisciplina(selectedDisciplinas[0])}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="anoLetivo" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="mediaResidual">
                      {getEvolucaoDisciplina(selectedDisciplinas[0]).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={Number(entry.mediaResidual) > 0 ? '#10b981' : '#ef4444'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-6 overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Ano Letivo</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Residual</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {getEvolucaoDisciplina(selectedDisciplinas[0]).map((item) => (
                        <tr key={item.anoLetivo}>
                          <td className="px-4 py-2 text-sm">{item.anoLetivo}</td>
                          <td className="px-4 py-2 text-sm font-bold" style={{ color: getColor(Number(item.mediaResidual), 0.3) }}>
                            {Number(item.mediaResidual) > 0 ? '+' : ''}{item.mediaResidual}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <>
                {(() => {
                  const multiData = anosLetivos.map(year => {
                    const row = { anoLetivo: year };
                    selectedDisciplinas.forEach(disc => {
                      const ef = efeitosDisciplina.find(e => e.anoLetivo === year);
                      const d = ef?.mediaResidualPorDisc.find(dd => dd.disciplina === disc);
                      row[disc] = d ? Number(d.mediaResidual.toFixed(2)) : null;
                    });
                    return row;
                  });

                  return (
                    <>
                      <ResponsiveContainer width="100%" height={450}>
                        <LineChart data={multiData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="anoLetivo" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          {selectedDisciplinas.map((disc, i) => (
                            <Line
                              key={disc}
                              type="monotone"
                              dataKey={disc}
                              stroke={colors[i % colors.length]}
                              name={disc}
                              strokeWidth={3}
                              dot={{ r: 5 }}
                            />
                          ))}
                        </LineChart>
                      </ResponsiveContainer>
                      <div className="mt-6 overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Ano Letivo</th>
                              {selectedDisciplinas.map(disc => (
                                <th key={disc} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{disc}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {multiData.map(row => (
                              <tr key={row.anoLetivo}>
                                <td className="px-4 py-2 text-sm font-medium">{row.anoLetivo}</td>
                                {selectedDisciplinas.map(disc => {
                                  const val = row[disc];
                                  const color = val !== null ? getColor(val, 0.3) : '#6b7280';
                                  return (
                                    <td key={disc} className="px-4 py-2 text-sm font-bold" style={{ color }}>
                                      {val !== null ? (val > 0 ? '+' : '') + val.toFixed(2) : '-'}
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  );
                })()}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default IndicadoresTab;
