import React, { useState, useEffect } from 'react';
import { getCreditProducts, createCreditProduct, updateCreditProduct, deleteCreditProduct } from '../services/api';
import CreditProductModal from './CreditProductModal';
import { Plus, Edit, Trash, CheckCircle, XCircle } from 'lucide-react';

const CreditProducts = () => {
    const [products, setProducts] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);

    const fetchProducts = async () => {
        try {
            const data = await getCreditProducts();
            setProducts(data);
        } catch (error) {
            console.error('Error fetching credit products:', error);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, []);

    const handleSave = async (productData) => {
        try {
            if (selectedProduct) {
                await updateCreditProduct(selectedProduct.id, productData);
            } else {
                await createCreditProduct(productData);
            }
            fetchProducts();
            setIsModalOpen(false);
            setSelectedProduct(null);
        } catch (error) {
            console.error('Error saving credit product:', error);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Tem a certeza que quer apagar este produto de crédito?')) {
            try {
                await deleteCreditProduct(id);
                fetchProducts();
            } catch (error) {
                console.error('Error deleting credit product:', error);
                alert('Erro ao apagar o produto de crédito.');
            }
        }
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-semibold">Produtos de Crédito</h2>
                <button 
                    onClick={() => { setSelectedProduct(null); setIsModalOpen(true); }}
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 flex items-center"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Novo Produto
                </button>
            </div>
            <div className="overflow-x-auto bg-white rounded shadow">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Taxa de Juro</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Montante Máximo</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prazo</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ativo</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {products.map((product) => (
                            <tr key={product.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{product.name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.interest_rate}%</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.max_amount}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.term_months} meses</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {product.is_active ? <CheckCircle className="w-5 h-5 text-green-500" /> : <XCircle className="w-5 h-5 text-red-500" />}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <button 
                                        onClick={() => { setSelectedProduct(product); setIsModalOpen(true); }}
                                        className="text-indigo-600 hover:text-indigo-900 mr-4"
                                    >
                                        <Edit className="w-4 h-4" />
                                    </button>
                                    <button 
                                        onClick={() => handleDelete(product.id)}
                                        className="text-red-600 hover:text-red-900"
                                    >
                                        <Trash className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <CreditProductModal 
                isOpen={isModalOpen} 
                onClose={() => { setIsModalOpen(false); setSelectedProduct(null); }} 
                onSave={handleSave} 
                product={selectedProduct} 
            />
        </div>
    );
};

export default CreditProducts;
