import React, { useState, useEffect, useMemo } from 'react';
import { XCircle, CheckCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import { createEnrollment, createDisciplinaTurma, getDisciplinaTurma } from '../services';

const StudentEnrollmentModal = ({
  showModal,
  closeModal,
  subject,
  users,
  classes,
  setEnrollments,
  alunoDisciplina,
  setAlunoDisciplina,
  disciplinaTurma,
  setDisciplinaTurma,
}) => {
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedProfessor, setSelectedProfessor] = useState('');
  const [anoLetivo, setAnoLetivo] = useState('2024/2025');
  const [errors, setErrors] = useState({});

  const students = useMemo(() => users.filter((user) => user.tipo_utilizador === 'ALUNO' && user.ativo), [users]);
  const teachers = useMemo(() => users.filter((user) => user.tipo_utilizador === 'PROFESSOR' && user.ativo), [users]);
  const availableClasses = useMemo(() => classes.filter((cls) => cls.ativo), [classes]);

  useEffect(() => {
    if (!showModal) return;
    setSelectedStudent('');
    setSelectedClass(availableClasses.length > 0 ? availableClasses[0].id : '');
    setSelectedProfessor('');
    setAnoLetivo('2024/2025');
    setErrors({});
  }, [showModal, availableClasses]);

  if (!showModal) return null;

  const validateForm = () => {
    const newErrors = {};
    if (!selectedStudent) newErrors.student = 'Selecione um aluno';
    if (!selectedClass) newErrors.class = 'Selecione uma turma';
    if (!selectedProfessor) newErrors.professor = 'Selecione um professor';
    if (!anoLetivo.match(/^[0-9]{4}\/[0-9]{4}$/)) newErrors.anoLetivo = 'Ano letivo deve seguir o formato AAAA/AAAA';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error('Por favor, corrija os erros no formulário.');
      return;
    }

    try {
      // Check if disciplina_turma exists for the subject, class, and ano_letivo
      let disciplinaTurmaRecord = disciplinaTurma.find(
        (dt) => dt.disciplina_id === subject.id && dt.turma_id === selectedClass && dt.ano_letivo === anoLetivo && dt.ativo
      );

      if (!disciplinaTurmaRecord) {
        // Create new disciplina_turma with professor_id
        const newDisciplinaTurma = await createDisciplinaTurma({
          disciplina_id: subject.id,
          turma_id: selectedClass,
          professor_id: selectedProfessor,
          ano_letivo: anoLetivo,
        });
        disciplinaTurmaRecord = newDisciplinaTurma;
        setDisciplinaTurma([...disciplinaTurma, newDisciplinaTurma]);
      }

      // Create enrollment
      const enrollmentData = {
        aluno_id: selectedStudent,
        disciplina_turma_id: disciplinaTurmaRecord.id,
      };
      const newEnrollment = await createEnrollment(enrollmentData);
      setAlunoDisciplina([...alunoDisciplina, newEnrollment]);
      setEnrollments([...alunoDisciplina, newEnrollment]);

      toast.success('Aluno inscrito com sucesso!');
      closeModal();
    } catch (error) {
      console.error('Error enrolling student:', error);
      toast.error(error.response?.data?.error || 'Erro ao inscrever aluno.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Inscrever Aluno em {subject.nome}</h3>
            <button onClick={closeModal} className="text-gray-500 hover:text-gray-700">
              <XCircle className="w-6 h-6" />
            </button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Aluno</label>
                <select
                  value={selectedStudent}
                  onChange={(e) => setSelectedStudent(e.target.value)}
                  className={`w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.student ? 'border-red-500' : ''
                  }`}
                >
                  <option value="">Selecione um aluno</option>
                  {students.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.nome}
                    </option>
                  ))}
                </select>
                {errors.student && <p className="text-red-500 text-xs mt-1">{errors.student}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Turma</label>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className={`w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.class ? 'border-red-500' : ''
                  }`}
                >
                  <option value="">Selecione uma turma</option>
                  {availableClasses.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.nome}
                    </option>
                  ))}
                </select>
                {errors.class && <p className="text-red-500 text-xs mt-1">{errors.class}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Professor</label>
                <select
                  value={selectedProfessor}
                  onChange={(e) => setSelectedProfessor(e.target.value)}
                  className={`w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.professor ? 'border-red-500' : ''
                  }`}
                >
                  <option value="">Selecione um professor</option>
                  {teachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.nome}
                    </option>
                  ))}
                </select>
                {errors.professor && <p className="text-red-500 text-xs mt-1">{errors.professor}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ano Letivo</label>
                <input
                  type="text"
                  value={anoLetivo}
                  onChange={(e) => setAnoLetivo(e.target.value)}
                  className={`w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.anoLetivo ? 'border-red-500' : ''
                  }`}
                  placeholder="Ex: 2024/2025"
                />
                {errors.anoLetivo && <p className="text-red-500 text-xs mt-1">{errors.anoLetivo}</p>}
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Inscrever
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default StudentEnrollmentModal;
