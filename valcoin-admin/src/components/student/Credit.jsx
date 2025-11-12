import React, { useState, useEffect } from 'react';
import { Landmark, PlusCircle } from 'lucide-react';
import { getSettings, getCreditProducts, applyForStudentLoan } from '../../services/api';
import LoanApplicationModal from './LoanApplicationModal';
import StudentLoanList from './StudentLoanList';

const Credit = ({ student }) => {
    const [creditSystemEnabled, setCreditSystemEnabled] = useState(false);
    const [creditProducts, setCreditProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const settings = await getSettings();
                setCreditSystemEnabled(settings.creditSystemEnabled === 'true' || settings.creditSystemEnabled === true || settings.creditSystemEnabled === '"true"');

                if (settings.creditSystemEnabled === 'true' || settings.creditSystemEnabled === true || settings.creditSystemEnabled === '"true"') {
                    const products = await getCreditProducts();
                    setCreditProducts(products.filter(p => p.is_active));
                }
            } catch (error) {
                console.error('Error fetching credit data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchInitialData();
    }, []);

    const handleOpenModal = (product) => {
        setSelectedProduct(product);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setSelectedProduct(null);
        setIsModalOpen(false);
    };

    const handleSaveLoan = async (loanData) => {
        try {
            await applyForStudentLoan(loanData);
            alert('Pedido de empréstimo enviado com sucesso!');
            handleCloseModal();
        } catch (error) {
            console.error('Error applying for loan:', error);
            alert('Erro ao enviar o pedido de empréstimo.');
        }
    };

    if (loading) {
        return <div>A carregar...</div>;
    }

    if (!creditSystemEnabled) {
        return null; // Or a message saying the system is disabled
    }

    return (
        <div className="p-6 bg-gray-50 min-h-full">
            <div className="max-w-7xl mx-auto">
                <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 mb-6">
                    <h1 className="text-3xl font-bold text-gray-800 mb-2 flex items-center"><Landmark className="w-8 h-8 mr-3 text-indigo-600"/>Crédito</h1>
                    <p className="text-gray-600">Peça um empréstimo para os seus projetos.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2">
                        <h2 className="text-2xl font-semibold text-gray-700 mb-4">Produtos de Crédito</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {creditProducts.map(product => (
                                <div key={product.id} className="bg-white p-5 rounded-xl shadow-md border border-gray-200">
                                    <h3 className="text-xl font-semibold mb-2">{product.name}</h3>
                                    <p className="text-gray-600">Taxa de Juro: {product.interest_rate}%</p>
                                    <p className="text-gray-600">Montante Máximo: {product.max_amount} VC</p>
                                    <p className="text-gray-600">Prazo: {product.term_months} meses</p>
                                    <button 
                                        onClick={() => handleOpenModal(product)}
                                        className="mt-4 w-full bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 flex items-center justify-center"
                                    >
                                        <PlusCircle className="w-5 h-5 mr-2" />
                                        Pedir Empréstimo
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="lg:col-span-1">
                        <StudentLoanList />
                    </div>
                </div>

                <LoanApplicationModal 
                    isOpen={isModalOpen}
                    onClose={handleCloseModal}
                    onSave={handleSaveLoan}
                    product={selectedProduct}
                />
            </div>
        </div>
    );
};

export default Credit;
