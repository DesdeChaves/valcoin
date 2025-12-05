// src/components/eqavet/MetasInstitucionais.jsx
import React, { useState, useEffect } from 'react';
import { getMetasInstitucionais, saveMetaInstitucional } from '../../services/api';

const MetasInstitucionais = () => {
  const [ano, setAno] = useState(new Date().getFullYear() + '/' + (new Date().getFullYear() + 1).toString().slice(-2));
  const [metas, setMetas] = useState({});
  const [loading, setLoading] = useState(false);

  const indicadores = [
    { id: '1', nome: 'Colocação (Ind. 1)', placeholder: 'ex: 85' },
    { id: '2', nome: 'Conclusão (Ind. 2)', placeholder: 'ex: 90' },
    { id: '3', nome: 'Abandono máximo (Ind. 3)', placeholder: 'ex: 8' },
    { id: '4', nome: 'Utilização Competências (Ind. 4)', placeholder: 'ex: 75' },
    { id: '5b', nome: 'Satisfação Empregadores (média 1-4)', placeholder: 'ex: 3.5' },
    { id: '6a', nome: 'Prosseguimento Estudos (Ind. 6a)', placeholder: 'ex: 40' },
  ];

  useEffect(() => {
    loadMetas();
  }, [ano]);

  const loadMetas = async () => {
    setLoading(true);
    try {
      const data = await getMetasInstitucionais(ano);
      const map = {};
      data.forEach(m => { map[m.indicador] = m.meta_global; });
      setMetas(map);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const saveAll = async () => {
    for (const ind of indicadores) {
      if (metas[ind.id]) {
        await saveMetaInstitucional({ ano_letivo: ano, indicador: ind.id, meta_global: Number(metas[ind.id]) });
      }
    }
    alert('Metas gravadas com sucesso!');
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-6">Metas Institucionais – Plano de Melhoria</h2>

      <div className="mb-6 flex items-center gap-4">
        <label className="font-medium">Ano Letivo:</label>
        <input value={ano} onChange={e => setAno(e.target.value)} className="border rounded px-3 py-2 w-40" />
      </div>

      {loading ? <p>Carregando...</p> : (
        <div className="space-y-4">
          {indicadores.map(ind => (
            <div key={ind.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded">
              <span className="w-80 font-medium">{ind.nome}</span>
              <input
                type="number"
                step="0.1"
                placeholder={ind.placeholder}
                value={metas[ind.id] || ''}
                onChange={e => setMetas({ ...metas, [ind.id]: e.target.value })}
                className="border rounded px-3 py-2 w-32 text-right"
              />
              <span className="text-gray-600">{ind.id === '5b' ? '(média 1-4)' : '%'}</span>
            </div>
          ))}
          <button onClick={saveAll} className="mt-6 bg-green-600 text-white px-8 py-3 rounded hover:bg-green-700 font-semibold">
            Gravar Todas as Metas
          </button>
        </div>
      )}
    </div>
  );
};

export default MetasInstitucionais;
