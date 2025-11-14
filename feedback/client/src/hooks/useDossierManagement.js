import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchProfessorDossiers, saveDossier, updateDossier, deleteDossier } from '../utils/api';

const useDossierManagement = () => {
    const [dossiers, setDossiers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingDossier, setEditingDossier] = useState(null);
    const [showInactive, setShowInactive] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDiscipline, setSelectedDiscipline] = useState('all');
    const navigate = useNavigate();

    const professorId = JSON.parse(localStorage.getItem('user'))?.id;

    const fetchDossiers = useCallback(async () => {
        if (!professorId) {
            setError('ID do professor não encontrado. Por favor, faça login novamente.');
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);
            const response = await fetchProfessorDossiers(professorId, showInactive);
            console.log('fetchProfessorDossiers response:', response); // Debug
            setDossiers(Array.isArray(response) ? response : []);
        } catch (err) {
            console.error('Error fetching dossiers:', err);
            setError('Erro ao carregar dossiês. Por favor, tente novamente.');
            setDossiers([]);
        } finally {
            setLoading(false);
        }
    }, [professorId, showInactive]);

    useEffect(() => {
        fetchDossiers();
    }, [fetchDossiers]);

    const openCreateModal = () => {
        setEditingDossier(null);
        setIsModalOpen(true);
    };

    const openEditModal = (dossier) => {
        setEditingDossier(dossier);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingDossier(null);
    };

    const handleSaveDossier = async (dossierData) => {
        try {
            if (editingDossier) {
                await updateDossier(editingDossier.id, dossierData);
            } else {
                await saveDossier(dossierData);
            }
            closeModal();
            fetchDossiers();
        } catch (err) {
            console.error('Error saving dossier:', err);
            alert('Erro ao salvar dossiê.');
        }
    };

    const handleDeleteDossier = async (dossierId) => {
        if (window.confirm('Tem certeza que deseja apagar este dossiê? Esta ação não pode ser desfeita.')) {
            try {
                await deleteDossier(dossierId);
                fetchDossiers();
            } catch (err) {
                console.error('Error deleting dossier:', err);
                alert('Erro ao apagar dossiê.');
            }
        }
    };

    return {
        dossiers,
        loading,
        error,
        isModalOpen,
        editingDossier,
        showInactive,
        setShowInactive,
        searchTerm,
        setSearchTerm,
        selectedDiscipline,
        setSelectedDiscipline,
        fetchDossiers,
        openCreateModal,
        openEditModal,
        closeModal,
        handleSaveDossier,
        handleDeleteDossier,
        navigate, // navigate is still needed for internal routing
        professorId, // professorId is still needed for DossierForm
    };
};

export default useDossierManagement;