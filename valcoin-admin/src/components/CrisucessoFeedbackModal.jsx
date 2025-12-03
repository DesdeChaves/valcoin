import React, { useState, useEffect } from 'react';
import { XCircle, Trash, Plus, Edit, Eye } from 'lucide-react';
import { toast } from 'react-toastify';

const CrisucessoFeedbackModal = ({ showModal, closeModal, modalType, selectedItem, onSave, departments }) => {
  const initialState = {
    nome: '',
    codigo: '',
    descricao: '',
    ano_escolaridade_inicial: 5,
    ano_escolaridade_limite: null,
    nivel_aceitavel: 7.0,
    periodicidade_avaliacao: 'semestral',
    tipo_criterio: 'departamental',
    aprovado_por: '',
    data_aprovacao: null,
    departamentos: [],
    ativo: true,
  };
  const [formData, setFormData] = useState(initialState);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (showModal) {
      if (selectedItem && modalType !== 'create') {
        setFormData({
          ...initialState,
          ...selectedItem,
          data_aprovacao: selectedItem.data_aprovacao ? new Date(selectedItem.data_aprovacao).toISOString().split('T')[0] : null,
          departamentos: selectedItem.departamentos ? selectedItem.departamentos.map(d => d.id) : [],
        });
      } else {
        setFormData(initialState);
      }
      setErrors({});
    }
  }, [showModal, modalType, selectedItem]);

  if (!showModal) return null;

  const isViewMode = modalType === 'view';
  const isDeleteMode = modalType === 'delete';

  const validate = () => {
    const newErrors = {};
    if (!formData.nome) newErrors.nome = 'Nome é obrigatório.';
    if (!formData.codigo) newErrors.codigo = 'Código é obrigatório.';
    if (!formData.descricao) newErrors.descricao = 'Descrição é obrigatória.';
    if (!formData.ano_escolaridade_inicial) newErrors.ano_escolaridade_inicial = 'Ano de escolaridade inicial é obrigatório.';
    if (!formData.departamentos || formData.departamentos.length === 0) newErrors.departamentos = 'Selecione pelo menos um departamento.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isDeleteMode) {
        try {
            await onSave(formData);
            closeModal();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Erro ao apagar critério de sucesso.');
        }
        return;
    }
    if (!validate()) {
      toast.error('Por favor, preencha todos os campos obrigatórios.');
      return;
    }
    try {
      await onSave(formData);
      closeModal();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao salvar critério de sucesso.');
    }
  };

  const renderField = (label, value) => (
    <div>
      <label className="font-semibold text-gray-600">{label}</label>
      <p className="text-gray-800">{value || 'N/A'}</p>
    </div>
  );

  const renderContent = () => {
    if (isDeleteMode) {
      return (
        <div className="text-center">
          <h4 className="font-semibold text-lg mb-3">Desativar Critério de Sucesso</h4>
          <p>Tem certeza que deseja desativar o critério <strong>{selectedItem?.nome}</strong>?</p>
        </div>
      );
    }

    if (isViewMode) {
        const departmentName = selectedItem.departamentos ? selectedItem.departamentos.map(d => d.nome).join(', ') : 'N/A';
        return (
            <div className="space-y-4">
                {renderField('Nome', selectedItem.nome)}
                {renderField('Código', selectedItem.codigo)}
                {renderField('Descrição', selectedItem.descricao)}
                {renderField('Departamentos', departmentName)}
                {renderField('Ano de Escolaridade Inicial', selectedItem.ano_escolaridade_inicial)}
                {renderField('Ano de Escolaridade Limite', selectedItem.ano_escolaridade_limite)}
                {renderField('Nível Aceitável', selectedItem.nivel_aceitavel)}
                {renderField('Periodicidade', selectedItem.periodicidade_avaliacao)}
                {renderField('Tipo', selectedItem.tipo_criterio)}
                {renderField('Aprovado Por', selectedItem.aprovado_por)}
                {renderField('Data de Aprovação', selectedItem.data_aprovacao ? new Date(selectedItem.data_aprovacao).toLocaleDateString() : 'N/A')}
                {renderField('Status', selectedItem.ativo ? 'Ativo' : 'Inativo')}
            </div>
        );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left Column */}
        <div className="space-y-4">
            <div>
                <label htmlFor="nome" className="block text-sm font-medium text-gray-700">Nome</label>
                <input id="nome" type="text" value={formData.nome} onChange={(e) => setFormData({...formData, nome: e.target.value})} className="mt-1 block w-full p-2 border rounded-md" />
                {errors.nome && <p className="text-red-500 text-xs">{errors.nome}</p>}
            </div>
            <div>
                <label htmlFor="codigo" className="block text-sm font-medium text-gray-700">Código</label>
                <input id="codigo" type="text" value={formData.codigo} onChange={(e) => setFormData({...formData, codigo: e.target.value})} className="mt-1 block w-full p-2 border rounded-md" />
                {errors.codigo && <p className="text-red-500 text-xs">{errors.codigo}</p>}
            </div>
            <div>
                <label htmlFor="descricao" className="block text-sm font-medium text-gray-700">Descrição</label>
                <textarea id="descricao" rows="4" value={formData.descricao} onChange={(e) => setFormData({...formData, descricao: e.target.value})} className="mt-1 block w-full p-2 border rounded-md"></textarea>
                {errors.descricao && <p className="text-red-500 text-xs">{errors.descricao}</p>}
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700">Departamentos</label>
                <div className="mt-2 space-y-2 max-h-32 overflow-y-auto border p-2 rounded-md">
                    {departments.map(dep => (
                        <div key={dep.id} className="flex items-center">
                            <input
                                id={`dep-${dep.id}`}
                                type="checkbox"
                                checked={formData.departamentos.includes(dep.id)}
                                onChange={(e) => {
                                    const { checked } = e.target;
                                    setFormData(prev => {
                                        const newDepartamentos = checked
                                            ? [...prev.departamentos, dep.id]
                                            : prev.departamentos.filter(id => id !== dep.id);
                                        return { ...prev, departamentos: newDepartamentos };
                                    });
                                }}
                                className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                            />
                            <label htmlFor={`dep-${dep.id}`} className="ml-2 block text-sm text-gray-900">
                                {dep.nome}
                            </label>
                        </div>
                    ))}
                </div>
                {errors.departamentos && <p className="text-red-500 text-xs">{errors.departamentos}</p>}
            </div>
        </div>
        {/* Right Column */}
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label htmlFor="ano_escolaridade_inicial" className="block text-sm font-medium text-gray-700">Ano Inicial</label>
                    <input id="ano_escolaridade_inicial" type="number" value={formData.ano_escolaridade_inicial} onChange={(e) => setFormData({...formData, ano_escolaridade_inicial: e.target.value})} className="mt-1 block w-full p-2 border rounded-md" />
                    {errors.ano_escolaridade_inicial && <p className="text-red-500 text-xs">{errors.ano_escolaridade_inicial}</p>}
                </div>
                <div>
                    <label htmlFor="ano_escolaridade_limite" className="block text-sm font-medium text-gray-700">Ano Limite</label>
                    <input id="ano_escolaridade_limite" type="number" value={formData.ano_escolaridade_limite || ''} onChange={(e) => setFormData({...formData, ano_escolaridade_limite: e.target.value || null})} className="mt-1 block w/full p-2 border rounded-md" />
                </div>
            </div>
            <div>
                <label htmlFor="nivel_aceitavel" className="block text-sm font-medium text-gray-700">Nível Aceitável (0-10)</label>
                <input id="nivel_aceitavel" type="number" step="0.1" value={formData.nivel_aceitavel} onChange={(e) => setFormData({...formData, nivel_aceitavel: e.target.value})} className="mt-1 block w-full p-2 border rounded-md" />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label htmlFor="periodicidade_avaliacao" className="block text-sm font-medium text-gray-700">Periodicidade</label>
                    <select id="periodicidade_avaliacao" value={formData.periodicidade_avaliacao} onChange={(e) => setFormData({...formData, periodicidade_avaliacao: e.target.value})} className="mt-1 block w-full p-2 border rounded-md">
                        <option value="trimestral">Trimestral</option>
                        <option value="semestral">Semestral</option>
                        <option value="anual">Anual</option>
                    </select>
                </div>
                <div>
                    <label htmlFor="tipo_criterio" className="block text-sm font-medium text-gray-700">Tipo</label>
                    <select id="tipo_criterio" value={formData.tipo_criterio} onChange={(e) => setFormData({...formData, tipo_criterio: e.target.value})} className="mt-1 block w-full p-2 border rounded-md">
                        <option value="departamental">Departamental</option>
                        <option value="transversal">Transversal</option>
                        <option value="interdisciplinar">Interdisciplinar</option>
                        <option value="global">Global</option>
                    </select>
                </div>
            </div>
            <div>
                <label htmlFor="aprovado_por" className="block text-sm font-medium text-gray-700">Aprovado Por</label>
                <input id="aprovado_por" type="text" value={formData.aprovado_por || ''} onChange={(e) => setFormData({...formData, aprovado_por: e.target.value})} className="mt-1 block w-full p-2 border rounded-md" />
            </div>
            <div>
                <label htmlFor="data_aprovacao" className="block text-sm font-medium text-gray-700">Data de Aprovação</label>
                <input id="data_aprovacao" type="date" value={formData.data_aprovacao || ''} onChange={(e) => setFormData({...formData, data_aprovacao: e.target.value || null})} className="mt-1 block w-full p-2 border rounded-md" />
            </div>
            <div className="flex items-center">
                <input id="ativo" type="checkbox" checked={formData.ativo} onChange={(e) => setFormData({...formData, ativo: e.target.checked})} className="h-4 w-4 text-blue-600 border-gray-300 rounded" />
                <label htmlFor="ativo" className="ml-2 block text-sm text-gray-900">Ativo</label>
            </div>
        </div>
      </div>
    );
  };

  const getTitle = () => {
    if (isViewMode) return 'Visualizar Critério de Sucesso';
    if (isDeleteMode) return 'Desativar Critério de Sucesso';
    return modalType === 'create' ? 'Criar Novo Critério de Sucesso' : 'Editar Critério de Sucesso';
  };

  const getIcon = () => {
    if (isViewMode) return <Eye className="w-5 h-5 mr-2" />;
    if (isDeleteMode) return <Trash className="w-5 h-5 mr-2" />;
    return modalType === 'create' ? <Plus className="w-5 h-5 mr-2" /> : <Edit className="w-5 h-5 mr-2" />;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="text-xl font-semibold flex items-center">{getIcon()}{getTitle()}</h3>
          <button onClick={closeModal} className="text-gray-500 hover:text-gray-700"><XCircle className="w-6 h-6" /></button>
        </div>
        <div className="p-6 overflow-y-auto flex-grow">
          <form id="crisucesso-feedback-form" onSubmit={handleSubmit}>{renderContent()}</form>
        </div>
        <div className="p-4 border-t flex justify-end space-x-3">
          <button type="button" onClick={closeModal} className="px-4 py-2 border rounded-md text-sm font-medium hover:bg-gray-50">
            {isViewMode ? 'Fechar' : 'Cancelar'}
          </button>
          {!isViewMode && (
            <button type="submit" form="crisucesso-feedback-form" className={`px-4 py-2 text-white rounded-md text-sm font-medium ${isDeleteMode ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
              {modalType === 'create' ? 'Criar' : modalType === 'edit' ? 'Salvar' : 'Desativar'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CrisucessoFeedbackModal;