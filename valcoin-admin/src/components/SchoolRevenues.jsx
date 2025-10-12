import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { createSchoolRevenue, updateSchoolRevenue, deleteSchoolRevenue } from '../services';
import SchoolRevenueModal from './SchoolRevenueModal';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';

const SchoolRevenues = ({ schoolRevenues, setSchoolRevenues }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRevenue, setSelectedRevenue] = useState(null);

  const handleCreate = () => {
    setSelectedRevenue(null);
    setIsModalOpen(true);
  };

  const handleEdit = (revenue) => {
    setSelectedRevenue(revenue);
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    try {
      await deleteSchoolRevenue(id);
      setSchoolRevenues((prev) => prev.filter((revenue) => revenue.id !== id));
      toast.success('Receita excluída com sucesso!');
    } catch (error) {
      toast.error(error.message || 'Erro ao excluir receita.');
    }
  };

  const handleSave = async (revenue) => {
    try {
      if (revenue.id) {
        const updatedRevenue = await updateSchoolRevenue(revenue.id, revenue);
        setSchoolRevenues((prev) =>
          prev.map((r) => (r.id === revenue.id ? updatedRevenue : r))
        );
        toast.success('Receita atualizada com sucesso!');
      } else {
        const newRevenue = await createSchoolRevenue(revenue);
        setSchoolRevenues((prev) => [...prev, newRevenue]);
        toast.success('Receita criada com sucesso!');
      }
      setIsModalOpen(false);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erro ao salvar receita.');
    }
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Receitas Próprias</h1>
        <button
          onClick={handleCreate}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700 transition-colors"
        >
          <PlusCircle className="mr-2" size={20} />
          Adicionar Receita
        </button>
      </div>
      <div className="bg-white rounded-lg shadow-md overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                Origem
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                Montante
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                Data
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {schoolRevenues.map((revenue) => (
              <tr key={revenue.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {revenue.origem}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                  {revenue.montante}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                  {new Date(revenue.data).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={() => handleEdit(revenue)}
                    className="text-indigo-600 hover:text-indigo-900 mr-4"
                  >
                    <Edit size={20} />
                  </button>
                  <button
                    onClick={() => handleDelete(revenue.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    <Trash2 size={20} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {isModalOpen && (
        <SchoolRevenueModal
          revenue={selectedRevenue}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSave}
        />
      )}
    </div>
  );
};

export default SchoolRevenues;
