import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchProfessorCriteria, saveCriterion, updateCriterion, deleteCriterion } from '../utils/api';

const useCriterionManagement = () => {
    const [criteria, setCriteria] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCriterion, setEditingCriterion] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDossier, setSelectedDossier] = useState('all');
    const navigate = useNavigate();

    const professorId = JSON.parse(localStorage.getItem('user'))?.id;

    const fetchCriteria = useCallback(async () => {
        if (!professorId) {
            setError('ID do professor não encontrado. Por favor, faça login novamente.');
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);
            const response = await fetchProfessorCriteria(professorId);
            let data;
            if (response && typeof response === 'object') {
                if ('data' in response) {
                    data = response.data;
                } else {
                    data = response;
                }
            } else {
                data = [];
            }
            setCriteria(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Error fetching criteria:', err);
            setError('Erro ao carregar critérios. Por favor, tente novamente.');
            setCriteria([]);
        } finally {
            setLoading(false);
        }
    }, [professorId]);

    useEffect(() => {
        fetchCriteria();
    }, [fetchCriteria]);

    const openCreateModal = () => {
        setEditingCriterion(null);
        setIsModalOpen(true);
    };

    const openEditModal = (criterion) => {
        setEditingCriterion(criterion);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingCriterion(null);
    };

    const handleSaveCriterion = async (criterionData) => {
        try {
            if (editingCriterion) {
                await updateCriterion(editingCriterion.id, criterionData);
            } else {
                await saveCriterion(criterionData);
            }
            closeModal();
            fetchCriteria();
        } catch (err) {
            console.error('Error saving criterion:', err);
            alert('Erro ao salvar critério.');
        }
    };

    const handleDeleteCriterion = async (criterionId) => {
        if (window.confirm('Tem certeza que deseja apagar este critério?')) {
            try {
                await deleteCriterion(criterionId);
                fetchCriteria();
            } catch (err) {
                console.error('Error deleting criterion:', err);
                alert('Erro ao apagar critério.');
            }
        }
    };

    // Filtrar critérios com segurança
    const getFilteredCriteria = useCallback(() => {
        if (!Array.isArray(criteria)) return [];

        return criteria
            .map(dossierGroup => ({
                ...dossierGroup,
                criterios: Array.isArray(dossierGroup.criterios)
                    ? dossierGroup.criterios.filter(criterion => {
                          const matchesSearch =
                              (criterion.nome || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                              (dossierGroup.nome || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                              (dossierGroup.subject_name || '').toLowerCase().includes(searchTerm.toLowerCase());
                          const matchesDossier =
                              selectedDossier === 'all' || dossierGroup.id === selectedDossier;
                          return matchesSearch && matchesDossier;
                      })
                    : []
            }))
            .filter(dossierGroup => dossierGroup.criterios.length > 0);
    }, [criteria, searchTerm, selectedDossier]);

    const filteredCriteria = getFilteredCriteria();

    // Estatísticas seguras
    const totalCriteria = Array.isArray(criteria)
        ? criteria.reduce((acc, d) => acc + (Array.isArray(d.criterios) ? d.criterios.length : 0), 0)
        : 0;

    const totalDossiers = Array.isArray(criteria) ? criteria.length : 0;

    // Get unique dossiers for filter dropdown
    const getUniqueDossiersForFilter = useCallback(() => {
        const dossierMap = new Map();
        if (!Array.isArray(criteria)) return [{ id: 'all', name: 'Todos os Dossiês' }];

        criteria.forEach(d => {
            if (d.id && !dossierMap.has(d.id)) {
                dossierMap.set(d.id, { id: d.id, name: `${d.nome} - ${d.subject_name}` });
            }
        });
        return [
            { id: 'all', name: 'Todos os Dossiês' },
            ...Array.from(dossierMap.values())
        ];
    }, [criteria]);

    const dossiersForFilter = getUniqueDossiersForFilter();

    return {
        criteria,
        loading,
        error,
        isModalOpen,
        editingCriterion,
        searchTerm,
        setSearchTerm,
        selectedDossier,
        setSelectedDossier,
        fetchCriteria,
        openCreateModal,
        openEditModal,
        closeModal,
        handleSaveCriterion,
        handleDeleteCriterion,
        navigate,
        professorId,
        filteredCriteria,
        totalCriteria,
        totalDossiers,
        dossiersForFilter,
    };
};

export default useCriterionManagement;