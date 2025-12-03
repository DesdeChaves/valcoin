import React, { useState, useEffect, useMemo } from 'react';
import { XCircle, Trash, Plus, Users as UsersIcon, BookOpen, UserCheck, Eye, Edit, Filter } from 'lucide-react';
import { toast } from 'react-toastify';
import {
  createSubject, updateSubject, softDeleteSubject,
  createDisciplinaTurma, updateDisciplinaTurma, getSubjects, getDisciplinaTurma, getEnrollments, createEnrollment, deleteEnrollment
} from '../services';

const SubjectModal = ({
  showModal, closeModal, modalType, selectedItem, setSubjects, users, classes, departments,
  disciplinaTurma, alunoDisciplina, alunoTurma,
  setDisciplinaTurma, setAlunoDisciplina
}) => {
  // Core subject data
  const [formData, setFormData] = useState({ nome: '', codigo: '', ativo: true, departamento_id: null });
  
  // State for associations
  const [associatedTurmas, setAssociatedTurmas] = useState([]);
  const [enrolledStudentsByTurma, setEnrolledStudentsByTurma] = useState({});
  const [professorByTurma, setProfessorByTurma] = useState({});

  // UI state
  const [selectedTurmaFilter, setSelectedTurmaFilter] = useState('all');
  const [errors, setErrors] = useState({});

  const teachers = useMemo(() => users.filter(u => u.tipo_utilizador === 'PROFESSOR'), [users]);
  const students = useMemo(() => users.filter(u => u.tipo_utilizador === 'ALUNO'), [users]);

  // Get current subject data for view/edit
  const currentSubjectData = useMemo(() => {
    if (!selectedItem) return { turmas: [], professors: {}, students: {} };

    const currentDt = disciplinaTurma.filter(dt => dt.disciplina_id === selectedItem.id && dt.ativo);
    const currentTurmas = currentDt.map(dt => ({
      turma_id: dt.turma_id,
      professor_id: dt.professor_id,
      disciplina_turma_id: dt.id
    }));

    const professors = {};
    const studentsByTurma = {};
    currentDt.forEach(dt => {
      professors[dt.turma_id] = teachers.find(t => t.id === dt.professor_id) || null;
      studentsByTurma[dt.turma_id] = alunoDisciplina
        .filter(ad => ad.disciplina_turma_id === dt.id && ad.ativo)
        .map(ad => students.find(s => s.id === ad.aluno_id))
        .filter(Boolean);
    });

    return {
      turmas: currentTurmas,
      professors,
      students: studentsByTurma
    };
  }, [selectedItem, disciplinaTurma, alunoDisciplina, teachers, students]);

  // Get students by turma
  const getStudentsForTurma = (turmaId) => {
    return alunoTurma
      .filter(at => at.turma_id === turmaId)
      .map(at => students.find(s => s.id === at.aluno_id))
      .filter(Boolean);
  };

  // Get available and enrolled students for a specific turma
  const getAvailableStudentsForTurma = (turmaId) => {
    const enrolledIds = new Set((enrolledStudentsByTurma[turmaId] || []).map(s => s.id));
    return getStudentsForTurma(turmaId).filter(student => !enrolledIds.has(student.id));
  };

  const getEnrolledStudentsForTurma = (turmaId) => {
    return enrolledStudentsByTurma[turmaId] || [];
  };

  // Initialize state when modal opens
  useEffect(() => {
    if (showModal && selectedItem && modalType !== 'create') {
      setFormData({ 
        nome: selectedItem.nome, 
        codigo: selectedItem.codigo, 
        ativo: selectedItem.ativo,
        departamento_id: selectedItem.departamento_id || null
      });

      const currentDt = disciplinaTurma.filter(dt => dt.disciplina_id === selectedItem.id && dt.ativo);
      setAssociatedTurmas(currentDt.map(dt => dt.turma_id));

      const professors = {};
      const studentsByTurma = {};
      currentDt.forEach(dt => {
        professors[dt.turma_id] = dt.professor_id || null;
        studentsByTurma[dt.turma_id] = alunoDisciplina
          .filter(ad => ad.disciplina_turma_id === dt.id && ad.ativo)
          .map(ad => students.find(s => s.id === ad.aluno_id))
          .filter(Boolean);
      });
      setProfessorByTurma(professors);
      setEnrolledStudentsByTurma(studentsByTurma);
    } else {
      setFormData({ nome: '', codigo: '', ativo: true, departamento_id: null });
      setAssociatedTurmas([]);
      setProfessorByTurma({});
      setEnrolledStudentsByTurma({});
    }
    setErrors({});
    setSelectedTurmaFilter('all');
  }, [showModal, modalType, selectedItem, disciplinaTurma, alunoDisciplina, students]);

  if (!showModal) return null;

  const isViewMode = modalType === 'view';
  const isCreateMode = modalType === 'create';
  const isEditMode = modalType === 'edit';
  const isDeleteMode = modalType === 'delete';

  const handleTurmaToggle = (turmaId) => {
    setAssociatedTurmas(prev => {
      if (prev.includes(turmaId)) {
        return prev.filter(id => id !== turmaId);
      }
      return [...prev, turmaId];
    });
  };

  const handleProfessorChange = (turmaId, professorId) => {
    setProfessorByTurma(prev => ({
      ...prev,
      [turmaId]: professorId || null
    }));
  };

  const handleStudentToggle = (turmaId, studentId) => {
    setEnrolledStudentsByTurma(prev => {
      const current = prev[turmaId] || [];
      if (current.some(s => s.id === studentId)) {
        return { ...prev, [turmaId]: current.filter(s => s.id !== studentId) };
      }
      const student = students.find(s => s.id === studentId);
      return { ...prev, [turmaId]: [...current, student] };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    let subject = selectedItem;

    try {
      if (isDeleteMode) {
        await softDeleteSubject(selectedItem.id);
        toast.success('Disciplina desativada com sucesso!');
        const subjectsData = await getSubjects();
        setSubjects(subjectsData);
        closeModal();
        return;
      }

      if (isCreateMode) {
        subject = await createSubject(formData);
      } else {
        subject = await updateSubject(selectedItem.id, formData);
      }

      // Sync Turmas
      const originalDt = disciplinaTurma.filter(dt => dt.disciplina_id === subject.id && dt.ativo);
      const originalTurmaIds = originalDt.map(dt => dt.turma_id);
      const turmasToAdd = associatedTurmas.filter(tId => !originalTurmaIds.includes(tId));
      const turmasToRemove = originalTurmaIds.filter(tId => !associatedTurmas.includes(tId));

      // Add new disciplina_turma with professor_id
      const addTurmaPromises = turmasToAdd.map(async (turmaId) => {
        if (!professorByTurma[turmaId]) {
          throw new Error(`Professor não selecionado para a turma ${turmaId}`);
        }
        return createDisciplinaTurma({
          disciplina_id: subject.id,
          turma_id: turmaId,
          professor_id: professorByTurma[turmaId]
        });
      });
      const newDtRecords = await Promise.all(addTurmaPromises);

      // Soft delete removed turmas
      const removeTurmaPromises = turmasToRemove.map(async (turmaId) => {
        const dt = originalDt.find(dt => dt.turma_id === turmaId);
        if (dt) {
          await updateDisciplinaTurma(dt.id, { ativo: false });
        }
      });
      await Promise.all(removeTurmaPromises);

      // Sync Students
      const updatedDt = await getDisciplinaTurma();
      const allDtForSubject = updatedDt.filter(dt => dt.disciplina_id === subject.id && dt.ativo);

      const studentPromises = [];
      associatedTurmas.forEach(turmaId => {
        const dt = allDtForSubject.find(dt => dt.turma_id === turmaId);
        if (!dt) return;

        const enrolledStudents = enrolledStudentsByTurma[turmaId] || [];
        const enrolledStudentIds = new Set(enrolledStudents.map(s => s.id));
        const originalAd = alunoDisciplina.filter(ad => ad.disciplina_turma_id === dt.id && ad.ativo);
        const originalStudentIds = new Set(originalAd.map(ad => ad.aluno_id));

        const studentsToAdd = enrolledStudents.filter(s => !originalStudentIds.has(s.id));
        const studentsToRemove = originalAd.filter(ad => !enrolledStudentIds.has(ad.aluno_id));

        studentsToAdd.forEach(student => {
          studentPromises.push(
            createEnrollment({
              aluno_id: student.id,
              disciplina_turma_id: dt.id
            }).catch(error => {
              if (error.response?.status === 400 && error.response?.data?.error === 'Aluno já está inscrito nesta disciplina-turma') {
                console.warn(`Skipping duplicate enrollment for aluno_id=${student.id}, disciplina_turma_id=${dt.id}`);
                return Promise.resolve();
              }
              throw error;
            })
          );
        });

        studentsToRemove.forEach(ad => {
          studentPromises.push(
            deleteEnrollment(ad.id).catch(error => {
              console.error(`Failed to remove enrollment for student ${ad.aluno_id}:`, error);
              return Promise.resolve();
            })
          );
        });
      });
      await Promise.all(studentPromises);

      // Refresh data
      const [subjectsData, dtData, adData] = await Promise.all([
        getSubjects(),
        getDisciplinaTurma(),
        getEnrollments()
      ]);

      setSubjects(subjectsData);
      setDisciplinaTurma(dtData);
      setAlunoDisciplina(adData);

      toast.success(`Disciplina ${isCreateMode ? 'criada' : 'atualizada'} com sucesso!`);
      closeModal();
    } catch (error) {
      console.error('Error saving subject:', error);
      toast.error(error.message || error.response?.data?.error || 'Erro ao salvar disciplina.');
    }
  };

  const renderViewMode = () => (
    <div className="space-y-6">
      <div>
        <h4 className="font-semibold text-lg mb-3 flex items-center">
          <BookOpen className="w-5 h-5 mr-2"/>
          Informações da Disciplina
        </h4>
        <div className="bg-gray-50 p-4 rounded-lg space-y-2">
          <div><strong>Nome:</strong> {selectedItem.nome}</div>
          <div><strong>Código:</strong> {selectedItem.codigo}</div>
          <div><strong>Departamento:</strong> {departments.find(d => d.id === selectedItem.departamento_id)?.nome || 'Nenhum'}</div>
          <div><strong>Status:</strong> 
            <span className={`ml-2 px-2 py-1 rounded text-sm ${
              selectedItem.ativo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {selectedItem.ativo ? 'Ativo' : 'Inativo'}
            </span>
          </div>
        </div>
      </div>

      <div>
        <h4 className="font-semibold text-lg mb-3 flex items-center">
          <UserCheck className="w-5 h-5 mr-2"/>
          Turmas e Professores
        </h4>
        <div className="space-y-3">
          {currentSubjectData.turmas.map(dt => {
            const turma = classes.find(c => c.id === dt.turma_id);
            const professor = currentSubjectData.professors[dt.turma_id];
            return (
              <div key={dt.turma_id} className="bg-gray-50 p-4 rounded-lg">
                <h5 className="font-medium mb-2 text-blue-600">{turma?.nome || 'Turma desconhecida'}</h5>
                <div><strong>Professor:</strong> {professor?.nome || 'Nenhum'}</div>
              </div>
            );
          })}
          {currentSubjectData.turmas.length === 0 && (
            <p className="text-gray-500 italic">Nenhuma turma associada</p>
          )}
        </div>
      </div>

      <div>
        <h4 className="font-semibold text-lg mb-3 flex items-center">
          <UsersIcon className="w-5 h-5 mr-2"/>
          Alunos Inscritos
        </h4>
        <div className="space-y-3">
          {currentSubjectData.turmas.map(dt => {
            const turma = classes.find(c => c.id === dt.turma_id);
            const turmaStudents = currentSubjectData.students[dt.turma_id] || [];
            return (
              <div key={dt.turma_id} className="bg-gray-50 p-4 rounded-lg">
                <h5 className="font-medium mb-2 text-blue-600">{turma?.nome} ({turmaStudents.length} alunos)</h5>
                {turmaStudents.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {turmaStudents.map(student => (
                      <div key={student.id} className="flex items-center p-2 bg-white rounded border">
                        <UsersIcon className="w-4 h-4 mr-2 text-green-500"/>
                        {student.nome}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 italic">Nenhum aluno inscrito nesta turma</p>
                )}
              </div>
            );
          })}
          {currentSubjectData.turmas.length === 0 && (
            <p className="text-gray-500 italic">Nenhuma turma associada</p>
          )}
        </div>
      </div>
    </div>
  );

  const renderEditMode = () => (
    <div className="space-y-6">
      <div>
        <h4 className="font-semibold text-lg mb-3 flex items-center">
          <BookOpen className="w-5 h-5 mr-2"/>
          Dados Gerais
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-lg">
          <input 
            name="nome" 
            value={formData.nome} 
            onChange={(e) => setFormData({...formData, nome: e.target.value})} 
            placeholder="Nome da Disciplina" 
            className="md:col-span-2 w-full p-2 border rounded focus:ring-2 focus:ring-blue-500" 
          />
          <input 
            name="codigo" 
            value={formData.codigo} 
            onChange={(e) => setFormData({...formData, codigo: e.target.value})} 
            placeholder="Código" 
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500" 
          />
          <label className="flex items-center">
            <input 
              type="checkbox" 
              name="ativo" 
              checked={formData.ativo} 
              onChange={(e) => setFormData({...formData, ativo: e.target.checked})} 
              className="h-4 w-4 mr-2" 
            /> 
            Ativo
          </label>
        </div>
        <div className="md:col-span-3">
            <label htmlFor="departamento" className="block text-sm font-medium text-gray-700">Departamento</label>
            <select
                id="departamento"
                name="departamento_id"
                value={formData.departamento_id || ''}
                onChange={(e) => setFormData({ ...formData, departamento_id: e.target.value ? e.target.value : null })}
                className="mt-1 block w-full p-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
                <option value="">Sem departamento</option>
                {departments.map(dep => (
                    <option key={dep.id} value={dep.id}>{dep.nome}</option>
                ))}
            </select>
        </div>
      </div>

      <div>
        <h4 className="font-semibold text-lg mb-3 flex items-center">
          <UsersIcon className="w-5 h-5 mr-2"/>
          Gestão de Turmas
        </h4>
        <div className="border rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {classes.filter(c => c.ativo).map(turma => (
              <label key={turma.id} className="flex items-center p-2 border rounded hover:bg-gray-50 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={associatedTurmas.includes(turma.id)}
                  onChange={() => handleTurmaToggle(turma.id)}
                  className="mr-3 h-4 w-4"
                />
                <span>{turma.nome}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <div>
        <h4 className="font-semibold text-lg mb-3 flex items-center">
          <UserCheck className="w-5 h-5 mr-2"/>
          Gestão de Professores por Turma
        </h4>
        <div className="space-y-4">
          {associatedTurmas.map(turmaId => {
            const turma = classes.find(c => c.id === turmaId);
            return (
              <div key={turmaId} className="border rounded-lg p-4">
                <h5 className="font-medium mb-2 text-blue-600">{turma?.nome}</h5>
                <select
                  value={professorByTurma[turmaId] || ''}
                  onChange={(e) => handleProfessorChange(turmaId, e.target.value)}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecione um professor</option>
                  {teachers.map(teacher => (
                    <option key={teacher.id} value={teacher.id}>{teacher.nome}</option>
                  ))}
                </select>
              </div>
            );
          })}
          {associatedTurmas.length === 0 && (
            <p className="text-gray-500 italic">Selecione pelo menos uma turma para atribuir professores</p>
          )}
        </div>
      </div>

      <div>
        <h4 className="font-semibold text-lg mb-3 flex items-center">
          <UsersIcon className="w-5 h-5 mr-2"/>
          Gestão de Alunos por Turma
        </h4>
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4"/>
            <label className="font-medium">Filtrar por turma:</label>
            <select 
              value={selectedTurmaFilter}
              onChange={(e) => setSelectedTurmaFilter(e.target.value)}
              className="p-2 border rounded focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todas as turmas</option>
              {associatedTurmas.map(turmaId => {
                const turma = classes.find(c => c.id === turmaId);
                return <option key={turmaId} value={turmaId}>{turma?.nome}</option>;
              })}
            </select>
          </div>
        </div>

        <div className="space-y-4">
          {associatedTurmas
            .filter(turmaId => selectedTurmaFilter === 'all' || selectedTurmaFilter === turmaId)
            .map(turmaId => {
              const turma = classes.find(c => c.id === turmaId);
              const enrolledStudents = getEnrolledStudentsForTurma(turmaId);
              const availableStudents = getAvailableStudentsForTurma(turmaId);
              const totalStudents = getStudentsForTurma(turmaId);

              return (
                <div key={turmaId} className="border rounded-lg p-4">
                  <h5 className="font-medium mb-3 text-blue-600 flex items-center justify-between">
                    <span>{turma?.nome}</span>
                    <span className="text-sm text-gray-600">
                      {enrolledStudents.length}/{totalStudents.length} inscritos
                    </span>
                  </h5>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div>
                      <h6 className="font-medium text-green-600 mb-2 flex items-center">
                        <UserCheck className="w-4 h-4 mr-1"/>
                        Inscritos ({enrolledStudents.length})
                      </h6>
                      <div className="max-h-32 overflow-y-auto space-y-1">
                        {enrolledStudents.map(student => (
                          <label key={student.id} className="flex items-center p-2 bg-green-50 border border-green-200 rounded hover:bg-green-100 cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={true}
                              onChange={() => handleStudentToggle(turmaId, student.id)}
                              className="mr-2 h-4 w-4"
                            />
                            <span className="text-sm">{student.nome}</span>
                          </label>
                        ))}
                        {enrolledStudents.length === 0 && (
                          <p className="text-gray-500 text-sm italic">Nenhum aluno inscrito</p>
                        )}
                      </div>
                    </div>
                    <div>
                      <h6 className="font-medium text-gray-600 mb-2 flex items-center">
                        <Plus className="w-4 h-4 mr-1"/>
                        Disponíveis ({availableStudents.length})
                      </h6>
                      <div className="max-h-32 overflow-y-auto space-y-1">
                        {availableStudents.map(student => (
                          <label key={student.id} className="flex items-center p-2 bg-gray-50 border border-gray-200 rounded hover:bg-gray-100 cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={false}
                              onChange={() => handleStudentToggle(turmaId, student.id)}
                              className="mr-2 h-4 w-4"
                            />
                            <span className="text-sm">{student.nome}</span>
                          </label>
                        ))}
                        {availableStudents.length === 0 && (
                          <p className="text-gray-500 text-sm italic">Todos os alunos já estão inscritos</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          {associatedTurmas.length === 0 && (
            <p className="text-gray-500 italic">Selecione pelo menos uma turma para inscrever alunos</p>
          )}
        </div>
      </div>
    </div>
  );

  const renderCreateMode = () => (
    <div>
      <h4 className="font-semibold text-lg mb-3 flex items-center">
        <BookOpen className="w-5 h-5 mr-2"/>
        Nova Disciplina
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-lg">
        <input 
          name="nome" 
          value={formData.nome} 
          onChange={(e) => setFormData({...formData, nome: e.target.value})} 
          placeholder="Nome da Disciplina" 
          className="md:col-span-2 w-full p-2 border rounded focus:ring-2 focus:ring-blue-500" 
          required
        />
        <input 
          name="codigo" 
          value={formData.codigo} 
          onChange={(e) => setFormData({...formData, codigo: e.target.value})} 
          placeholder="Código" 
          className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500" 
          required
        />
        <label className="flex items-center">
          <input 
            type="checkbox" 
            name="ativo" 
            checked={formData.ativo} 
            onChange={(e) => setFormData({...formData, ativo: e.target.checked})} 
            className="h-4 w-4 mr-2" 
          /> 
          Ativo
        </label>
      </div>
      <div className="mt-4">
        <label htmlFor="departamento" className="block text-sm font-medium text-gray-700">Departamento</label>
        <select
            id="departamento"
            name="departamento_id"
            value={formData.departamento_id || ''}
            onChange={(e) => setFormData({ ...formData, departamento_id: e.target.value ? e.target.value : null })}
            className="mt-1 block w-full p-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
        >
            <option value="">Sem departamento</option>
            {departments.map(dep => (
                <option key={dep.id} value={dep.id}>{dep.nome}</option>
            ))}
        </select>
      </div>
      <p className="text-sm text-gray-600 mt-2">
        Após criar a disciplina, você poderá atribuir turmas, professores e inscrever alunos.
      </p>
    </div>
  );

  const renderDeleteMode = () => (
    <div className="text-center">
      <h4 className="font-semibold text-lg mb-3">Desativar Disciplina</h4>
      <p>Tem certeza que deseja desativar a disciplina <strong>{selectedItem?.nome}</strong>?</p>
      <p className="text-sm text-red-600 mt-2">Isso também desativará todas as associações de turmas e inscrições de alunos.</p>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] flex flex-col">
        <div className="p-6 border-b flex justify-between items-center">
          <h3 className="text-xl font-semibold flex items-center">
            {isViewMode && <Eye className="w-5 h-5 mr-2"/>}
            {isEditMode && <Edit className="w-5 h-5 mr-2"/>}
            {isCreateMode && <Plus className="w-5 h-5 mr-2"/>}
            {isDeleteMode && <Trash className="w-5 h-5 mr-2"/>}
            {isViewMode ? 'Visualizar' : isEditMode ? 'Editar' : isDeleteMode ? 'Desativar' : 'Criar'} Disciplina
          </h3>
          <button 
            onClick={closeModal}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <XCircle className="w-6 h-6" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto flex-grow">
          <form id="subject-form" onSubmit={handleSubmit}>
            {isViewMode && renderViewMode()}
            {isEditMode && renderEditMode()}
            {isCreateMode && renderCreateMode()}
            {isDeleteMode && renderDeleteMode()}
          </form>
        </div>
        <div className="p-6 border-t flex justify-end space-x-3">
          <button 
            type="button" 
            onClick={closeModal} 
            className="px-4 py-2 border rounded hover:bg-gray-50 transition-colors"
          >
            {isViewMode ? 'Fechar' : 'Cancelar'}
          </button>
          {!isViewMode && (
            <button 
              type="submit" 
              form="subject-form" 
              className={`px-4 py-2 text-white rounded transition-colors ${
                isDeleteMode ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
              }`}>
              {isCreateMode ? 'Criar Disciplina' : isEditMode ? 'Salvar Alterações' : 'Desativar'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SubjectModal;