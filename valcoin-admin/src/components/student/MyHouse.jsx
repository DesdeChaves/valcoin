import React, { useState, useEffect } from 'react';
import { getMyHouse, updateHouse, getUnassignedStudents, getStudentHouseHistory, manageHouseMembers } from '../../services/api';
import HouseCard from '../HouseCard';
import HouseModal from '../HouseModal';
import { toast } from 'react-toastify';

const MyHouse = ({ currentUser, onLogout }) => {
    const [house, setHouse] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isLeader, setIsLeader] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [allUsers, setAllUsers] = useState([]);
    const [houseHistory, setHouseHistory] = useState([]);

    const fetchHouseData = async () => {
        setLoading(true);
        try {
            const houseRes = await getMyHouse();
            if (houseRes && houseRes.house_id) {
                setHouse(houseRes);
                setIsLeader(houseRes.user_is_leader || false);
            } else {
                setHouse(null);
                setIsLeader(false);
            }
        } catch (error) {
            console.error("Error fetching house data:", error);
            toast.error("Could not fetch your house data.");
        } finally {
            setLoading(false);
        }
    };

    const fetchHouseHistory = async () => {
        try {
            const history = await getStudentHouseHistory();
            setHouseHistory(history);
        } catch (error) {
            console.error("Error fetching house history:", error);
        }
    };

    useEffect(() => {
        fetchHouseData();
        fetchHouseHistory();
    }, []); // No longer depends on currentUser

    const handleOpenModal = async () => {
        if (isLeader) {
            try {
                const unassignedStudents = await getUnassignedStudents();
                const currentMembers = house.members || [];
                const usersForModal = [...currentMembers, ...unassignedStudents];
                setAllUsers(usersForModal);
                setIsModalOpen(true);
            } catch (error) {
                toast.error("Could not load user data for editing.");
            }
        }
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
    };

    const handleUpdateHouse = async (formData) => {
        try {
            await updateHouse(house.house_id, formData);
            await fetchHouseData(); // Refresh data
            handleCloseModal();
            toast.success("House updated successfully!");
        } catch (error) {
            toast.error(error.message || "Failed to update house.");
        }
    };

    const handleManageHouseMembers = async (houseId, memberData) => {
        try {
            await manageHouseMembers(houseId, memberData);
            toast.success('House members updated successfully!');
            await fetchHouseData(); // Refresh data
            handleCloseModal();
        } catch (error) {
            toast.error(error.message || 'Failed to manage house members.');
        }
    };

    if (loading) {
        return <div className="p-6">Loading your house information...</div>;
    }

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">My House</h1>
            <div className="max-w-md mx-auto">
                {house ? (
                    <HouseCard 
                        house={house} 
                        onEdit={isLeader ? handleOpenModal : null} 
                    />
                ) : (
                    <div className="p-6 text-center text-gray-600">You are not currently a member of any house.</div>
                )}
            </div>

            {houseHistory.length > 0 && (
                <div className="mt-8">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">House History</h2>
                    <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        House
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Start Date
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        End Date
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {houseHistory.map((item, index) => (
                                    <tr key={index}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {item.nome}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {new Date(item.data_entrada).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {item.data_saida ? new Date(item.data_saida).toLocaleDateString() : 'Present'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {isLeader && (
                <HouseModal
                    isOpen={isModalOpen}
                    onClose={handleCloseModal}
                    onSuccess={handleUpdateHouse}
                    onManageMembers={handleManageHouseMembers}
                    houseData={house}
                    users={allUsers}
                    currentUser={currentUser} // Pass current user for permission checks
                />
            )}
        </div>
    );
};

export default MyHouse;