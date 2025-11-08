import React, { useEffect, useState } from 'react';
import { fetchInstrumentDetails, fetchInstrumentGrades, fetchInstrumentStatistics, saveBatchGrades } from '../../utils/api';
import { useParams, useNavigate } from 'react-router-dom';

function GradesPage() {
  const { instrumentId } = useParams();
  const [instrument, setInstrument] = useState(null);
  const [students, setStudents] = useState([]);
  const [notes, setNotes] = useState({});
  const [statistics, setStatistics] = useState(null); // New state for statistics
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Helper function to get color based on grade
  const getGradeColor = (grade, maxGrade) => {
    if (grade === null || grade === undefined || maxGrade === 0) return 'transparent';
    
    const percentage = grade / maxGrade;
    
    // Interpolate between red (0%) and green (100%)
    const red = Math.round(255 * (1 - percentage));
    const green = Math.round(255 * percentage);
    const blue = 0;
    
    return `rgb(${red}, ${green}, ${blue})`;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch instrument details
        const instrumentResponse = await fetchInstrumentDetails(instrumentId);
        setInstrument(instrumentResponse.data);

        // Fetch students and their grades for this instrument
        const gradesResponse = await fetchInstrumentGrades(instrumentId);
        
        setStudents(gradesResponse.data.map(item => item.aluno));
        const initialNotes = {};
        gradesResponse.data.forEach(item => {
          initialNotes[item.aluno.id] = item.nota;
        });
        setNotes(initialNotes);

        // Fetch statistics
        const statsResponse = await fetchInstrumentStatistics(instrumentId);
        setStatistics(statsResponse.data.estatisticas);

      } catch (err) {
        setError('Erro ao carregar dados.');
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [instrumentId, navigate]);

  const handleGradeChange = (studentId, value) => {
    setNotes(prevNotes => ({
      ...prevNotes,
      [studentId]: {
        ...prevNotes[studentId],
        nota: value,
      }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!instrument) {
      setError('Instrument data not loaded.');
      return;
    }

    try {
      const notesToUpdate = Object.keys(notes).map(studentId => {
        const grade = parseFloat(notes[studentId].nota);
        if (isNaN(grade) || grade < 0 || grade > instrument.cotacao_maxima) {
          throw new Error(`A nota para o aluno ${studentId} deve ser entre 0 e ${instrument.cotacao_maxima}.`);
        }
        return {
          notaId: notes[studentId].id,
          nota: grade,
        };
      });

      await saveBatchGrades(instrumentId, notesToUpdate);

      navigate(-1); // Go back to the previous page
    } catch (err) {
      setError(`Erro ao atualizar notas: ${err.message}`);
      console.error('Error updating grades:', err);
    }
  };

  if (loading) {
    return <div className="text-center mt-8">Loading...</div>;
  }

  if (error) {
    return <div className="text-center mt-8 text-red-500">{error}</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">Lançar/Editar Notas para: {instrument?.nome}</h2>
      
      {statistics && (
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h3 className="text-xl font-bold mb-4">Estatísticas do Instrumento</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <p className="text-gray-600">Média:</p>
              <p className="text-lg font-semibold">{statistics.media}</p>
            </div>
            <div>
              <p className="text-gray-600">Mediana:</p>
              <p className="text-lg font-semibold">{statistics.mediana}</p>
            </div>
            <div>
              <p className="text-gray-600">Desvio Padrão:</p>
              <p className="text-lg font-semibold">{statistics.desvio_padrao}</p>
            </div>
            <div>
              <p className="text-gray-600">Percentil 25:</p>
              <p className="text-lg font-semibold">{statistics.percentil_25}</p>
            </div>
            <div>
              <p className="text-gray-600">Percentil 75:</p>
              <p className="text-lg font-semibold">{statistics.percentil_75}</p>
            </div>
            <div>
              <p className="text-gray-600">Notas abaixo de {instrument?.cotacao_maxima / 2}:</p>
              <p className="text-lg font-semibold">{statistics.notas_abaixo_metade_max}</p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <table className="min-w-full bg-white">
          <thead>
            <tr>
              <th className="py-2 px-4 border-b">Nº Mec.</th>
              <th className="py-2 px-4 border-b">Nome do Aluno</th>
              <th className="py-2 px-4 border-b">Nota (0-{instrument?.cotacao_maxima})</th>
            </tr>
          </thead>
          <tbody>
            {students.map(student => (
              <tr key={student.id} style={{ backgroundColor: getGradeColor(notes[student.id]?.nota, instrument?.cotacao_maxima) }}>
                <td className="py-2 px-4 border-b">{student.numero}</td>
                <td className="py-2 px-4 border-b">{student.name}</td>
                <td className="py-2 px-4 border-b">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max={instrument?.cotacao_maxima}
                    value={notes[student.id]?.nota || ''}
                    onChange={(e) => handleGradeChange(student.id, e.target.value)}
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-6">
          <button
            type="submit"
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Salvar Notas
          </button>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="ml-4 bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}

export default GradesPage;
