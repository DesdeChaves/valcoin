import React, { useState, useEffect } from 'react';
import { createCompetency, updateCompetency } from '../../utils/api_competencias';
import { getAllDominios } from '../../utils/api';

const CompetencyModal = ({ isOpen, onClose, competency, disciplineId, professorId }) => {
    const [formData, setFormData] = useState({
        codigo: '',
        nome: '',
        descricao: '',
        dominio_ids: [], // Changed to handle multiple domains
        medida_educativa: 'nenhuma',
        descricao_adaptacao: '',
        ordem: 0,
    });
    const [dominios, setDominios] = useState([]);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchDominiosData = async () => {
            try {
                const data = await getAllDominios();
                setDominios(data);
            } catch (err) {
                console.error('Error fetching dominios:', err);
                setError('Falha ao carregar os domínios.');
            }
        };
        if (isOpen) {
            fetchDominiosData();
        }
    }, [isOpen]);

    useEffect(() => {
        if (competency) {
            setFormData({
                codigo: competency.codigo || '',
                nome: competency.nome || '',
                descricao: competency.descricao || '',
                dominio_ids: competency.dominios ? competency.dominios.map(d => d.id) : [], // Expecting an array of domain objects
                medida_educativa: competency.medida_educativa || 'nenhuma',
                descricao_adaptacao: competency.descricao_adaptacao || '',
                ordem: competency.ordem || 0,
            });
        } else {
            setFormData({
                codigo: '',
                nome: '',
                descricao: '',
                dominio_ids: [],
                medida_educativa: 'nenhuma',
                descricao_adaptacao: '',
                ordem: 0,
            });
        }
    }, [competency, isOpen]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleDomainChange = (domainId) => {
        setFormData(prev => {
            const newDominioIds = prev.dominio_ids.includes(domainId)
                ? prev.dominio_ids.filter(id => id !== domainId)
                : [...prev.dominio_ids, domainId];
            return { ...prev, dominio_ids: newDominioIds };
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        const competencyData = {
            ...formData,
            disciplina_id: disciplineId,
            criado_por_id: professorId,
        };

        try {
            if (competency) {
                await updateCompetency(competency.id, competencyData);
            } else {
                await createCompetency(competencyData);
            }
            onClose();
        } catch (err) {
            setError(err.message || 'Falha ao guardar a competência');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full" id="my-modal">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                <div className="mt-3 text-center">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">{competency ? 'Editar' : 'Adicionar'} Competência</h3>
                    <div className="mt-2 px-7 py-3">
                        <form onSubmit={handleSubmit} className="text-left">
                            <div className="mb-4">
                                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="codigo">
                                    Código
                                </label>
                                <input type="text" name="codigo" id="codigo" placeholder="Código da Competência" value={formData.codigo} onChange={handleChange} className="mb-2 w-full px-3 py-2 border border-gray-300 rounded-md" required />
                            </div>
                            <div className="mb-4">
                                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="nome">
                                    Nome
                                </label>
                                <input type="text" name="nome" id="nome" placeholder="Nome da Competência" value={formData.nome} onChange={handleChange} className="mb-2 w-full px-3 py-2 border border-gray-300 rounded-md" required />
                            </div>
                            <div className="mb-4">
                                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="descricao">
                                    Descrição
                                </label>
                                <textarea name="descricao" id="descricao" placeholder="Descrição detalhada da competência" value={formData.descricao} onChange={handleChange} className="mb-2 w-full px-3 py-2 border border-gray-300 rounded-md" />
                            </div>
                            <div className="mb-4">
                                <label className="block text-gray-700 text-sm font-bold mb-2">
                                    Domínios
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    {dominios.map(dom => (
                                        <div key={dom.id} className="flex items-center">
                                            <input
                                                type="checkbox"
                                                id={`dominio-${dom.id}`}
                                                checked={formData.dominio_ids.includes(dom.id)}
                                                onChange={() => handleDomainChange(dom.id)}
                                                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                            />
                                            <label htmlFor={`dominio-${dom.id}`} className="ml-2 text-sm text-gray-700">{dom.nome}</label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="mb-4">
                                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="medida_educativa">
                                    Medida Educativa
                                </label>
                                <select name="medida_educativa" id="medida_educativa" value={formData.medida_educativa} onChange={handleChange} className="mb-2 w-full px-3 py-2 border border-gray-300 rounded-md">
                                    <option value="nenhuma">Nenhuma</option>
                                    <option value="universal">Universal</option>
                                    <option value="seletiva">Seletiva</option>
                                    <option value="adicional">Adicional</option>
                                </select>
                            </div>
                            <div className="mb-4">
                                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="descricao_adaptacao">
                                    Descrição da Adaptação
                                </label>
                                <textarea name="descricao_adaptacao" id="descricao_adaptacao" placeholder="Descrição da Adaptação" value={formData.descricao_adaptacao} onChange={handleChange} className="mb-2 w-full px-3 py-2 border border-gray-300 rounded-md" />
                            </div>
                            <div className="mb-4">
                                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="ordem">
                                    Ordem
                                </label>
                                <input type="number" name="ordem" id="ordem" placeholder="Ordem de exibição" value={formData.ordem} onChange={handleChange} className="mb-2 w-full px-3 py-2 border border-gray-300 rounded-md" />
                            </div>
                            
                            {error && <p className="text-red-500 text-sm">{error}</p>}

                            <div className="items-center px-4 py-3">
                                <button type="submit" className="px-4 py-2 bg-blue-500 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
                                    Guardar
                                </button>
                            </div>
                        </form>
                    </div>
                    <div className="items-center px-4 py-3">
                        <button onClick={onClose} className="px-4 py-2 bg-gray-500 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500">
                            Fechar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CompetencyModal;
