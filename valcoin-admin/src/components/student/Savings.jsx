import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { PiggyBank, Landmark, Calendar, Percent, PlusCircle, Eye } from 'lucide-react';
import { getSavingsProducts, getStudentSavingsAccounts, createStudentSavingsAccount } from '../../services/api';
import ValCoinIcon from '../icons/ValCoinIcon';

const Savings = ({ student }) => {
    const [products, setProducts] = useState([]);
    const [accounts, setAccounts] = useState([]);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [depositAmount, setDepositAmount] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const fetchSavingsData = async () => {
        setIsLoading(true);
        try {
            const [productsData, accountsData] = await Promise.all([
                getSavingsProducts(),
                getStudentSavingsAccounts(),
            ]);
            setProducts(productsData.filter(p => p.is_active));
            setAccounts(accountsData);
        } catch (error) {
            toast.error('Erro ao carregar dados de poupança.');
            console.error('Error fetching savings data:', error);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        fetchSavingsData();
    }, []);

    const handleSubscribe = async () => {
        if (!selectedProduct || !depositAmount) {
            toast.warn('Por favor, selecione um produto e insira um montante.');
            return;
        }

        setIsLoading(true);
        try {
            await createStudentSavingsAccount({ product_id: selectedProduct.id, deposit_amount: parseFloat(depositAmount) });
            toast.success('Subscrição de conta poupança realizada com sucesso!');
            setDepositAmount('');
            setSelectedProduct(null);
            fetchSavingsData(); // Refresh data
        } catch (error) {
            toast.error(error.response?.data?.error || 'Erro ao subscrever conta poupança.');
            console.error('Error creating savings account:', error);
        }
        setIsLoading(false);
    };

    return (
        <div className="p-6 bg-gray-50 min-h-full">
            <div className="max-w-7xl mx-auto">
                <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 mb-6">
                    <h1 className="text-3xl font-bold text-gray-800 mb-2 flex items-center"><PiggyBank className="w-8 h-8 mr-3 text-indigo-600"/>Contas Poupança</h1>
                    <p className="text-gray-600">Faça o seu dinheiro crescer. Explore os nossos produtos de poupança.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2">
                        <h2 className="text-2xl font-semibold text-gray-700 mb-4">As Minhas Poupanças</h2>
                        {accounts.length > 0 ? (
                            <div className="space-y-4">
                                {accounts.map(acc => (
                                    <div key={acc.id} className="bg-white p-5 rounded-xl shadow-md border border-gray-200">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-bold text-lg text-indigo-700">{acc.product_name}</p>
                                                <p className="text-sm text-gray-500">Maturidade: {new Date(acc.maturity_date).toLocaleDateString('pt-PT')}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold text-2xl text-gray-800 flex items-center">{parseFloat(acc.balance).toFixed(2)} <ValCoinIcon className="w-6 h-6 ml-2" /></p>
                                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${acc.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                                    {acc.status}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-gray-500">Ainda não tem contas poupança.</p>
                        )}
                    </div>

                    <div className="lg:col-span-1">
                        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
                            <h2 className="text-2xl font-semibold text-gray-700 mb-4">Subscrever Produto</h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Produto de Poupança</label>
                                    <select onChange={(e) => setSelectedProduct(products.find(p => p.id === e.target.value))} className="mt-1 block w-full p-2 border-gray-300 rounded-md shadow-sm">
                                        <option value="">Selecione um produto</option>
                                        {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.interest_rate}%)</option>)}
                                    </select>
                                </div>
                                {selectedProduct && (
                                    <div className="p-4 border rounded-md bg-gray-50">
                                        <p className="text-sm text-gray-600">{selectedProduct.description}</p>
                                        <p className="text-sm mt-2"><b>Prazo:</b> {selectedProduct.term_months} meses</p>
                                        <p className="text-sm"><b>Depósito Mínimo:</b> {selectedProduct.min_deposit}</p>
                                    </div>
                                )}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Montante a Depositar</label>
                                    <input type="number" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} placeholder="0.00" className="mt-1 block w-full p-2 border-gray-300 rounded-md shadow-sm" />
                                </div>
                                <button onClick={handleSubscribe} disabled={isLoading} className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 disabled:bg-indigo-400 flex items-center justify-center">
                                    <PlusCircle className="w-5 h-5 mr-2" />
                                    {isLoading ? 'A subscrever...' : 'Subscrever e Depositar'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Savings;
