import React, { useState, useEffect } from 'react';
import { getAvailableStudentsForHouse } from '../../services/api';
import Modal from '../Modal';

const ManageMembersModal = ({ isOpen, onClose, onSuccess, house }) => {
    const [allStudents, setAllStudents] = useState([]);
    const [houseMembers, setHouseMembers] = useState([]);
    const [membersToAdd, setMembersToAdd] = useState([]);
    const [membersToRemove, setMembersToRemove] = useState([]);
    const [newLeaderId, setNewLeaderId] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchStudents = async () => {
            try {
                const data = await getAvailableStudentsForHouse();
                setAllStudents(data);
                setHouseMembers(house.members.filter(m => m.tipo_utilizador === 'ALUNO'));
                const currentLeader = house.members.find(m => m.role === 'lider');
                if (currentLeader) {
                    setNewLeaderId(currentLeader.id);
                }
            } catch (err) {
                console.error("Failed to fetch students", err);
            }
        };
        if (isOpen) {
            fetchStudents();
        }
    }, [isOpen, house]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            await api.post(`/api/houses/${house.house_id}/members`, {
                members_to_add: membersToAdd,
                members_to_remove: membersToRemove,
                new_leader_id: newLeaderId,
            });
            onSuccess();
        } catch (err) {
            setError(err.response?.data?.error || 'An error occurred.');
            console.error("Failed to manage members", err);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Manage Members for ${house.nome}`}>
            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label htmlFor="new_leader_id" className="block text-sm font-medium text-gray-700">House Leader</label>
                    <select 
                        name="new_leader_id" 
                        id="new_leader_id" 
                        value={newLeaderId}
                        onChange={(e) => setNewLeaderId(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                    >
                        {houseMembers.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                    </select>
                </div>

                <div>
                    <label htmlFor="members_to_add" className="block text-sm font-medium text-gray-700">Add Students</label>
                    <select 
                        name="members_to_add" 
                        id="members_to_add" 
                        multiple 
                        value={membersToAdd}
                        onChange={(e) => setMembersToAdd(Array.from(e.target.selectedOptions, option => option.value))}
                        className="mt-1 block w-full h-32 rounded-md border-gray-300 shadow-sm"
                    >
                        {allStudents.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                    </select>
                </div>

                <div>
                    <label htmlFor="members_to_remove" className="block text-sm font-medium text-gray-700">Remove Students</label>
                    <select 
                        name="members_to_remove" 
                        id="members_to_remove" 
                        multiple 
                        value={membersToRemove}
                        onChange={(e) => setMembersToRemove(Array.from(e.target.selectedOptions, option => option.value))}
                        className="mt-1 block w-full h-32 rounded-md border-gray-300 shadow-sm"
                    >
                        {houseMembers.filter(m => m.id !== newLeaderId).map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                    </select>
                </div>

                {error && <p className="text-sm text-red-600">{error}</p>}

                <div className="flex justify-end gap-4 pt-4">
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Cancel</button>
                    <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Save Changes</button>
                </div>
            </form>
        </Modal>
    );
};

export default ManageMembersModal;
