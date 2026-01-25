import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';

const UploadTab = () => {
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState(null);
  const [anoLetivo, setAnoLetivo] = useState('');
  const [periodo, setPeriodo] = useState('1');

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!anoLetivo.trim() || !periodo) {
      setUploadMessage({ type: 'error', text: 'Preencha o ano letivo e o período' });
      return;
    }

    setUploading(true);
    setUploadMessage(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('ano_letivo', anoLetivo.trim());
    formData.append('periodo', periodo);

    try {
      const response = await fetch('/upload/excel', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        setUploadMessage({
          type: 'success',
          text: `Sucesso! ${result.registos_guardados} registos guardados`,
        });
        setAnoLetivo('');
        setPeriodo('1');
        e.target.value = '';
      } else {
        setUploadMessage({ type: 'error', text: result.detail || 'Erro desconhecido' });
      }
    } catch (err) {
      setUploadMessage({ type: 'error', text: 'Erro de rede ao enviar o ficheiro' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg p-6 mb-6">
        <h2 className="text-2xl font-bold mb-2">Upload de Ficheiro Excel</h2>
        <p>Carregue ficheiros Excel com dados de avaliações escolares</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Ano Letivo
          </label>
          <input
            type="text"
            placeholder="Ex: 2024/2025"
            value={anoLetivo}
            onChange={(e) => setAnoLetivo(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Período
          </label>
          <select
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          >
            <option value="1">1º Período</option>
            <option value="2">2º Período</option>
            <option value="3">3º Período</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Ficheiro Excel
          </label>
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileUpload}
            disabled={uploading}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg file:mr-4 file:py-2 file:px-4 file:rounded-lg file:bg-indigo-50 file:text-indigo-700"
          />
        </div>

        {uploading && (
          <div className="flex items-center gap-2 text-indigo-600">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>A processar ficheiro...</span>
          </div>
        )}

        {uploadMessage && (
          <div
            className={`p-4 rounded-lg border ${
              uploadMessage.type === 'success'
                ? 'bg-green-50 text-green-800 border-green-200'
                : 'bg-red-50 text-red-800 border-red-200'
            }`}
          >
            {uploadMessage.text}
          </div>
        )}
      </div>
    </div>
  );
};

export default UploadTab;
