import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchMomentoAvaliacao, fetchNotasFinaisByMomento } from '../../utils/api';

function MomentoAvaliacaoNotasFinaisPage() {
  const { momentoId } = useParams();
  const [momentoAvaliacao, setMomentoAvaliacao] = useState(null);
  const [notasFinais, setNotasFinais] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'aluno_nome', direction: 'asc' });
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      if (!momentoId) {
        setError('ID do momento de avaliação não encontrado.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError('');

        // Fetch momento de avaliação details
        const momentoResponse = await fetchMomentoAvaliacao(momentoId);
        setMomentoAvaliacao(momentoResponse);

        // Fetch final grades for this moment
        const notasResponse = await fetchNotasFinaisByMomento(momentoId);
        setNotasFinais(notasResponse || []);
      } catch (err) {
        console.error('Error fetching final grades:', err);
        setError(
          err.response?.data?.message || 
          'Erro ao carregar notas finais. Por favor, tente novamente.'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [momentoId]);

  // Sorting function
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Get sorted data
  const getSortedNotasFinais = () => {
    const sortedData = [...notasFinais];
    sortedData.sort((a, b) => {
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];

      // Handle numeric sorting for nota
      if (sortConfig.key === 'nota') {
        aValue = parseFloat(aValue);
        bValue = parseFloat(bValue);
      } else {
        // String comparison for other fields
        aValue = String(aValue).toLowerCase();
        bValue = String(bValue).toLowerCase();
      }

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
    return sortedData;
  };

  // Calculate statistics
  const calculateStats = () => {
    if (notasFinais.length === 0) return null;

    const notas = notasFinais.map(n => parseFloat(n.nota) || 0);
    const sum = notas.reduce((acc, nota) => acc + nota, 0);
    const avg = sum / notas.length;
    const max = Math.max(...notas);
    const min = Math.min(...notas);

    return {
      average: avg.toFixed(2),
      max: max.toFixed(2),
      min: min.toFixed(2),
      total: notasFinais.length,
    };
  };

  // Export to CSV
  const exportToCSV = () => {
    const headers = ['Número Mecanográfico', 'Nome do Aluno', 'Nota Final'];
    const rows = notasFinais.map(nota => [
      nota.aluno_numero,
      nota.aluno_nome,
      (parseFloat(nota.nota) || 0).toFixed(2),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `notas_finais_${momentoAvaliacao?.nome || 'momento'}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Render sort indicator
  const SortIndicator = ({ columnKey }) => {
    if (sortConfig.key !== columnKey) {
      return <span className="ml-1 text-gray-400">⇅</span>;
    }
    return (
      <span className="ml-1">
        {sortConfig.direction === 'asc' ? '↑' : '↓'}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando notas finais...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p className="font-bold">Erro</p>
          <p>{error}</p>
        </div>
        <button
          onClick={() => navigate(-1)}
          className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
        >
          Voltar
        </button>
      </div>
    );
  }

  const stats = calculateStats();
  const sortedNotasFinais = getSortedNotasFinais();

  return (
    <div className="container mx-auto p-4">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-3xl font-bold mb-2">
          Notas Finais: {momentoAvaliacao?.nome}
        </h2>
        {momentoAvaliacao?.descricao && (
          <p className="text-gray-600">{momentoAvaliacao.descricao}</p>
        )}
      </div>

      {/* Statistics Panel */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-100 border border-blue-300 rounded-lg p-4">
            <p className="text-sm text-blue-600 font-semibold">Total de Alunos</p>
            <p className="text-2xl font-bold text-blue-800">{stats.total}</p>
          </div>
          <div className="bg-green-100 border border-green-300 rounded-lg p-4">
            <p className="text-sm text-green-600 font-semibold">Média</p>
            <p className="text-2xl font-bold text-green-800">{stats.average}</p>
          </div>
          <div className="bg-purple-100 border border-purple-300 rounded-lg p-4">
            <p className="text-sm text-purple-600 font-semibold">Nota Máxima</p>
            <p className="text-2xl font-bold text-purple-800">{stats.max}</p>
          </div>
          <div className="bg-orange-100 border border-orange-300 rounded-lg p-4">
            <p className="text-sm text-orange-600 font-semibold">Nota Mínima</p>
            <p className="text-2xl font-bold text-orange-800">{stats.min}</p>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {notasFinais.length > 0 && (
        <div className="mb-4 flex justify-end">
          <button
            onClick={exportToCSV}
            className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded inline-flex items-center"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Exportar CSV
          </button>
        </div>
      )}

      {/* Table */}
      {notasFinais.length === 0 ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <svg className="w-16 h-16 mx-auto text-yellow-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-lg text-gray-700">Nenhuma nota final encontrada para este momento de avaliação.</p>
        </div>
      ) : (
        <div className="overflow-x-auto shadow-md rounded-lg">
          <table className="min-w-full bg-white">
            <thead className="bg-gray-800 text-white">
              <tr>
                <th 
                  className="py-3 px-4 uppercase font-semibold text-sm text-left cursor-pointer hover:bg-gray-700"
                  onClick={() => handleSort('aluno_numero')}
                >
                  Nº Mec.
                  <SortIndicator columnKey="aluno_numero" />
                </th>
                <th 
                  className="py-3 px-4 uppercase font-semibold text-sm text-left cursor-pointer hover:bg-gray-700"
                  onClick={() => handleSort('aluno_nome')}
                >
                  Nome do Aluno
                  <SortIndicator columnKey="aluno_nome" />
                </th>
                <th 
                  className="py-3 px-4 uppercase font-semibold text-sm text-left cursor-pointer hover:bg-gray-700"
                  onClick={() => handleSort('nota')}
                >
                  Nota Final
                  <SortIndicator columnKey="nota" />
                </th>
              </tr>
            </thead>
            <tbody className="text-gray-700">
              {sortedNotasFinais.map((nota, index) => (
                <tr 
                  key={nota.id} 
                  className={`border-b hover:bg-gray-50 ${
                    index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                  }`}
                >
                  <td className="py-3 px-4">{nota.aluno_numero}</td>
                  <td className="py-3 px-4">{nota.aluno_nome}</td>
                  <td className="py-3 px-4">
                    <span className={`font-bold text-lg ${
                      parseFloat(nota.nota) >= 10 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {(parseFloat(nota.nota) || 0).toFixed(2)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Back Button */}
      <div className="mt-6">
        <button
          onClick={() => navigate(-1)}
          className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded inline-flex items-center"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Voltar
        </button>
      </div>
    </div>
  );
}

export default MomentoAvaliacaoNotasFinaisPage;
