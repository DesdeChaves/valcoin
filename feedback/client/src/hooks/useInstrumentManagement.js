import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchProfessorInstruments, saveInstrument, updateInstrument, deleteInstrument } from '../utils/api';

const useInstrumentManagement = () => {
    const [instruments, setInstruments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingInstrument, setEditingInstrument] = useState(null);
    const [showInactive, setShowInactive] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDossier, setSelectedDossier] = useState('all');
    const navigate = useNavigate();
    
    const professorId = JSON.parse(localStorage.getItem('user'))?.id;

    const fetchInstruments = useCallback(async () => {
        if (!professorId) {
            setError('ID do professor não encontrado. Por favor, faça login novamente.');
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);
            const response = await fetchProfessorInstruments(professorId, showInactive);
            
            let instrumentsData;
            if (response && typeof response === 'object') {
                if ('data' in response) {
                    instrumentsData = response.data;
                } else {
                    instrumentsData = response;
                }
            } else {
                instrumentsData = [];
            }
            
            setInstruments(Array.isArray(instrumentsData) ? instrumentsData : []);
        } catch (err) {
            setError('Erro ao carregar instrumentos. Por favor, tente novamente.');
            console.error('Error fetching instruments:', err);
            setInstruments([]);
        } finally {
            setLoading(false);
        }
    }, [professorId, showInactive]);

    useEffect(() => {
        fetchInstruments();
    }, [fetchInstruments]);

    const openCreateModal = () => {
        setEditingInstrument(null);
        setIsModalOpen(true);
    };

    const openEditModal = (instrument) => {
        setEditingInstrument(instrument);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingInstrument(null);
    };

    const handleSaveInstrument = async (instrumentData) => {
        try {
            if (editingInstrument) {
                await updateInstrument(editingInstrument.id, instrumentData);
            } else {
                await saveInstrument(instrumentData);
            }
            closeModal();
            fetchInstruments();
        } catch (err) {
            console.error('Error saving instrument:', err);
            alert('Erro ao salvar instrumento.');
        }
    };

    const handleDeleteInstrument = async (instrumentId) => {
        if (window.confirm('Tem certeza que deseja apagar este instrumento?')) {
            try {
                await deleteInstrument(instrumentId);
                fetchInstruments();
            } catch (err) {
                console.error('Error deleting instrument:', err);
                alert('Erro ao apagar instrumento.');
            }
        }
    };

    // Get unique dossiers for filter
    const getUniqueDossiers = useCallback(() => {
        const dossierMap = new Map();
        
        if (!instruments || !Array.isArray(instruments)) {
            return [{ id: 'all', name: 'Todos os Dossiês' }];
        }

        instruments.forEach(criterion => {
            if (criterion.dossier_id && !dossierMap.has(criterion.dossier_id)) {
                dossierMap.set(criterion.dossier_id, {
                    id: criterion.dossier_id,
                    name: `${criterion.dossier_name} - ${criterion.subject_name}`
                });
            }
        });

        return [
            { id: 'all', name: 'Todos os Dossiês' },
            ...Array.from(dossierMap.values())
        ];
    }, [instruments]);

    const dossiers = getUniqueDossiers();

    return {
        instruments,
        loading,
        error,
        isModalOpen,
        editingInstrument,
        showInactive,
        setShowInactive,
        searchTerm,
        setSearchTerm,
        selectedDossier,
        setSelectedDossier,
        fetchInstruments,
        openCreateModal,
        openEditModal,
        closeModal,
        handleSaveInstrument,
        handleDeleteInstrument,
        navigate,
        professorId,
        dossiers, // Pass dossiers for the filter dropdown
    };
};

export default useInstrumentManagement;