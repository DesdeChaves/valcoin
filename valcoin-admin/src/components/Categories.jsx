import React, { useState, useEffect } from 'react';
import { getAllCategories, createCategory, updateCategory, deleteCategory } from '../services/api';
import CategoryModal from './CategoryModal';
import ValCoinIcon from './icons/ValCoinIcon';

const Categories = () => {
    const [categories, setCategories] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState(null);

    const fetchCategories = async () => {
        try {
            const data = await getAllCategories();
            setCategories(data);
        } catch (error) {
            console.error('Error fetching categories:', error);
        }
    };

    useEffect(() => {
        fetchCategories();
    }, []);

    const handleSave = async (categoryData) => {
        try {
            if (selectedCategory) {
                await updateCategory(selectedCategory.id, categoryData);
            } else {
                await createCategory(categoryData);
            }
            fetchCategories();
            setIsModalOpen(false);
            setSelectedCategory(null);
        } catch (error) {
            console.error('Error saving category:', error);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Tem a certeza que quer apagar esta categoria?')) {
            try {
                await deleteCategory(id);
                fetchCategories();
            } catch (error) {
                console.error('Error deleting category:', error);
                alert('Erro ao apagar a categoria. Pode estar a ser usada por algum produto.');
            }
        }
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-semibold">Gerir Categorias</h2>
                <button 
                    onClick={() => { setSelectedCategory(null); setIsModalOpen(true); }}
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700"
                >
                    Adicionar Categoria
                </button>
            </div>
            <div className="overflow-x-auto bg-white rounded shadow">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dedutível</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dedução Máxima</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {categories.map((cat) => (
                            <tr key={cat.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{cat.name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{cat.is_deductible ? 'Sim' : 'Não'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {cat.is_deductible ? 
                                        <span className="flex items-center">{cat.max_deduction_value} <ValCoinIcon className="w-4 h-4 ml-1" /></span> : 'N/A'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <button 
                                        onClick={() => { setSelectedCategory(cat); setIsModalOpen(true); }}
                                        className="text-indigo-600 hover:text-indigo-900 mr-4"
                                    >
                                        Editar
                                    </button>
                                    <button 
                                        onClick={() => handleDelete(cat.id)}
                                        className="text-red-600 hover:text-red-900"
                                    >
                                        Apagar
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <CategoryModal 
                isOpen={isModalOpen} 
                onClose={() => { setIsModalOpen(false); setSelectedCategory(null); }} 
                onSave={handleSave} 
                category={selectedCategory} 
            />
        </div>
    );
};

export default Categories;