// src/components/eqavet/TrackingDiplomados.jsx
import React, { useEffect, useState } from 'react';
import { getTrackingDiplomados, updateTrackingDiplomado } from '../../services/api';

const TrackingDiplomados = ({ cicloId }) => {
  const [alunos, setAlunos] = useState([]);

  useEffect(() => {
    if (cicloId) loadTracking();
  }, [cicloId]);

  const loadTracking = async () => {
    const data = await getTrackingDiplomados(cicloId);
    setAlunos(data);
  };

  const updateSituacao = async (alunoId, campo, valor) => {
    const aluno = alunos.find(a => a.aluno_id === alunoId);
    const payload = {
      aluno_id: aluno.aluno_id,
      ciclo_formativo_id: cicloId,
      [campo]: valor,
      profissao_relacionada: campo === 'situacao_atual' && ['EMPREGADO','CONTA_PROPRIA'].includes(valor) ? aluno.profissao_relacionada : null
    };
    await updateTrackingDiplomado(payload);
    loadTracking(); // recarrega → recalcula indicadores automaticamente
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="p-6 border-b">
        <h2 className="text-2xl font-bold">Tracking de Diplomados – Ciclo {cicloId}</h2>
        <p className="text-sm text-gray-600 mt-1">Atualize a situação → indicadores 1, 4 e 6a recalculam automaticamente</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="text-left p-4">Aluno</th>
              <th className="p-4">Situação Atual</th>
              <th className="p-4">Profissão Relacionada?</th>
            </tr>
          </thead>
          <tbody>
            {alunos.map(a => (
              <tr key={a.aluno_id} className="border-t">
                <td className="p-4 font-medium">{a.nome} ({a.numero_mecanografico})</td>
                <td className="p-4">
                  <select value={a.situacao_atual || ''} onChange={e => updateSituacao(a.aluno_id, 'situacao_atual', e.target.value)} className="border rounded px-3 py-1">
                    <option value="">Selecionar</option>
                    <option value="EMPREGADO">Empregado</option>
                    <option value="CONTA_PROPRIA">Conta Própria</option>
                    <option value="ESTAGIO">Estágio</option>
                    <option value="DESEMPREGADO">À procura</option>
                    <option value="ENSINO_SUPERIOR">Ensino Superior</option>
                    <option value="FORMACAO_POS">Outra Formação</option>
                    <option value="OUTRA">Outra</option>
                    <option value="DESCONHECIDA">Desconhecida</option>
                  </select>
                </td>
                <td className="p-4 text-center">
                  {['EMPREGADO','CONTA_PROPRIA'].includes(a.situacao_atual) && (
                    <input
                      type="checkbox"
                      checked={a.profissao_relacionada || false}
                      onChange={e => updateSituacao(a.aluno_id, 'profissao_relacionada', e.target.checked)}
                    />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TrackingDiplomados;
