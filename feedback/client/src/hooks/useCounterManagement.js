import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchProfessorCounters, saveCounter, updateCounter, deleteCounter } from '../utils/api';

const useCounterManagement = () => {
    const [counters, setCounters] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCounter, setEditingCounter] = useState(null);
    const [showInactive, setShowInactive] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const navigate = useNavigate();

    const professorId = JSON.parse(localStorage.getItem('user'))?.id;

    const fetchCounters = useCallback(async () => {
        if (!professorId) {
            setError('Professor ID não encontrado. Por favor, faça login.');
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);
            const response = await fetchProfessorCounters(professorId, showInactive);
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
            setCounters(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Error fetching counters:', err);
            setError('Erro ao carregar contadores. Por favor, tente novamente.');
            setCounters([]);
        } finally {
            setLoading(false);
        }
    }, [professorId, showInactive]);

    useEffect(() => {
        fetchCounters();
    }, [fetchCounters]);

    const openCreateModal = () => {
        setEditingCounter(null);
        setIsModalOpen(true);
    };

    const openEditModal = (counter) => {
        setEditingCounter(counter);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingCounter(null);
    };

    const handleSaveCounter = async (counterData) => {
        try {
            if (editingCounter) {
                await updateCounter(editingCounter.id, counterData);
            } else {
                await saveCounter(counterData);
            }
            closeModal();
            fetchCounters();
        } catch (err) {
            console.error('Error saving counter:', err);
            alert('Erro ao salvar contador.');
        }
    };

    const handleDeleteCounter = async (counterId) => {
        if (window.confirm('Tem certeza que deseja apagar este contador?')) {
            try {
                await deleteCounter(counterId);
                fetchCounters();
            } catch (err) {
                console.error('Error deleting counter:', err);
                alert('Erro ao apagar contador.');
            }
        }
    };

    // Flatten counters for filtering
    const getAllCounters = useCallback(() => {
        if (!Array.isArray(counters)) return [];

        return counters.flatMap(disciplineGroup =>
            (Array.isArray(disciplineGroup.dossiers) ? disciplineGroup.dossiers : []).flatMap(dossierGroup =>
                (Array.isArray(dossierGroup.counters) ? dossierGroup.counters : []).map(counter => ({
                    ...counter,
                    subject_name: disciplineGroup.subject_name || '',
                    class_name: disciplineGroup.class_name || '',
                    dossier_name: dossierGroup.nome || '',
                    dossier_id: dossierGroup.id
                }))
            )
        );
    }, [counters]);

    const filteredCounters = getAllCounters().filter(counter =>
        (counter.shortname || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (counter.subject_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (counter.dossier_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (counter.tipo || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalCounters = filteredCounters.length;

    // Cálculo seguro de dossiês ativos
    const activeDossiersCount = Array.isArray(counters)
        ? counters.reduce((acc, d) => acc + (Array.isArray(d.dossiers) ? d.dossiers.length : 0), 0)
        : 0;

    const disciplinesCount = Array.isArray(counters) ? counters.length : 0;

    return {
        counters,
        loading,
        error,
        isModalOpen,
        editingCounter,
        showInactive,
        setShowInactive,
        searchTerm,
        setSearchTerm,
        fetchCounters,
        openCreateModal,
        openEditModal,
        closeModal,
        handleSaveCounter,
        handleDeleteCounter,
        navigate,
        professorId,
        filteredCounters,
        totalCounters,
        activeDossiersCount,
        disciplinesCount,
    };
};

export default useCounterManagement;