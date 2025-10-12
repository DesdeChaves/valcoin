import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { ShoppingCartIcon } from '@heroicons/react/24/outline';

const ProductList = ({ user, token }) => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [loading, setLoading] = useState(false);

  const fetchProducts = useCallback(async () => {
    if (!token) return;

    setLoading(true);
    const headers = { Authorization: `Bearer ${token}` };
    let url;

    try {
      if (selectedFilter === 'All') {
        const params = new URLSearchParams();
        if (selectedCategory !== 'All') {
          params.append('category', selectedCategory);
        }
        url = `/api/store/products?${params.toString()}`;
      } else {
        switch (selectedFilter) {
          case 'most-sold':
            url = '/api/store/products/most-sold';
            break;
          case 'my-purchases':
            url = '/api/store/products/my-purchases';
            break;
          case 'my-sales':
            url = '/api/store/products/my-sales';
            break;
          default:
            url = '/api/store/products';
            break;
        }
      }

      console.log('Fetching from URL:', url); // Para debug
      
      const response = await axios.get(url, { headers });
      console.log('Response data:', response.data); // Para debug
      
      // Tratamento mais robusto da resposta
      let productsArray = [];
      
      if (response.data) {
        if (Array.isArray(response.data)) {
          productsArray = response.data;
        } else if (response.data.products && Array.isArray(response.data.products)) {
          productsArray = response.data.products;
        } else if (response.data.rows && Array.isArray(response.data.rows)) {
          // Para respostas diretas do PostgreSQL que retornam {command, rowCount, rows, ...}
          productsArray = response.data.rows;
        } else if (response.data.data && Array.isArray(response.data.data)) {
          productsArray = response.data.data;
        } else if (typeof response.data === 'object' && response.data.length !== undefined) {
          // Caso seja um objeto que parece um array
          productsArray = Object.values(response.data);
        }
      }
      
      console.log('Products array:', productsArray); // Para debug
      setProducts(productsArray);
      
    } catch (error) {
      console.error('Error fetching products:', error);
      console.error('Error response:', error.response?.data); // Para debug
      
      // Verifica se é um erro 404 (endpoint não encontrado)
      if (error.response?.status === 404) {
        console.warn(`Endpoint ${url} not found. Using fallback logic.`);
        
        // Fallback: buscar todos os produtos e filtrar no frontend
        try {
          const fallbackResponse = await axios.get('/api/store/products', { headers });
          let allProducts = Array.isArray(fallbackResponse.data) 
            ? fallbackResponse.data 
            : (fallbackResponse.data.products || []);
          
          // Aplicar filtros no frontend como fallback
          let filteredProducts = allProducts;
          
          if (selectedFilter === 'my-sales' && user?.id) {
            filteredProducts = allProducts.filter(product => product.seller_id === user.id);
          } else if (selectedFilter === 'my-purchases' && user?.id) {
            // Este filtro precisaria de lógica adicional baseada em dados de compras
            // Por agora, mantemos array vazio até implementar no backend
            filteredProducts = [];
          } else if (selectedFilter === 'most-sold') {
            // Ordenar por quantidade vendida (se disponível) ou por menor estoque
            filteredProducts = allProducts.sort((a, b) => {
              if (a.sold_quantity && b.sold_quantity) {
                return b.sold_quantity - a.sold_quantity;
              }
              // Fallback: produtos com menor estoque podem ser mais vendidos
              return a.quantity - b.quantity;
            });
          }
          
          setProducts(filteredProducts);
        } catch (fallbackError) {
          console.error('Fallback request also failed:', fallbackError);
          setProducts([]);
        }
      } else {
        setProducts([]);
      }
    } finally {
      setLoading(false);
    }
  }, [token, selectedFilter, selectedCategory, user?.id]);

  useEffect(() => {
    fetchProducts();

    // Buscar categorias apenas quando necessário
    if (selectedFilter === 'All' && categories.length === 0) {
      axios.get('/api/store/categories')
        .then(response => {
          console.log('Categories response:', response.data); // Para debug
          setCategories(Array.isArray(response.data) ? response.data : []);
        })
        .catch(error => {
          console.error('Error fetching categories:', error);
          setCategories([]);
        });
    } else if (selectedFilter !== 'All') {
      setSelectedCategory('All');
    }
  }, [fetchProducts, selectedFilter, categories.length]);

  const handleBuy = async (productId) => {
    if (!productId || isNaN(productId)) {
      console.error('Invalid product ID:', productId);
      alert('Invalid product ID. Please try again.');
      return;
    }

    try {
      const response = await axios.post('/api/store/buy', 
        { productId: parseInt(productId) }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      alert(response.data.message);
      fetchProducts(); // Refetch products after buying
    } catch (error) {
      console.error('Error buying product:', error);
      alert(error.response?.data?.message || 'Falha na compra do produto.');
    }
  };

  const safeProducts = Array.isArray(products) ? products : [];

  return (
    <div>
      <h2 className="text-3xl font-bold text-primary mb-4">Produtos à Venda</h2>
      <p className="text-secondary mb-6">Bem-vindo, {user.nome} ({user.tipo_utilizador})!</p>
      
      <div className="mb-6 flex items-center space-x-4">
        <label className="text-sm font-medium text-secondary">Filtrar por:</label>
        <select
          value={selectedFilter}
          onChange={(e) => setSelectedFilter(e.target.value)}
          className="p-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-white"
          disabled={loading}
        >
          <option value="All">Todos</option>
          <option value="most-sold">Mais vendidos</option>
          <option value="my-purchases">Minhas compras</option>
          <option value="my-sales">Minhas vendas</option>
        </select>

        {selectedFilter === 'All' && (
          <>
            <label className="text-sm font-medium text-secondary">Filtrar por categoria:</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="p-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-white"
              disabled={loading}
            >
              <option value="All">Todas</option>
              {categories.map(category => (
                <option key={category.id} value={category.name}>{category.name}</option>
              ))}
            </select>
          </>
        )}
      </div>
      
      {loading ? (
        <div className="text-center py-8">
          <p className="text-gray-500">Carregando produtos...</p>
        </div>
      ) : safeProducts.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">
            {selectedFilter === 'my-purchases' ? 'Você ainda não fez nenhuma compra.' :
             selectedFilter === 'my-sales' ? 'Você ainda não tem produtos à venda.' :
             selectedFilter === 'most-sold' ? 'Nenhum produto vendido encontrado.' :
             'Nenhum produto encontrado.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {safeProducts.map(product => (
            <div key={product.id} className="bg-white p-6 rounded-xl shadow-md hover:shadow-xl transition">
              {product.image && (
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-48 object-cover rounded-md mb-4"
                />
              )}
              <h3 className="text-lg font-semibold text-primary">
                <Link to={`/product/${product.id}`} className="hover:underline">{product.name}</Link>
              </h3>
              <p className="text-secondary text-sm mb-2 line-clamp-2">{product.description}</p>
              <p className="text-secondary text-sm mb-2">Categoria: {product.category_name}</p>
              <p className="mb-2">
                <span className="font-medium">Preço: </span>
                {product.promotion > 0 ? (
                  <>
                    <span className="line-through text-gray-400">{product.price} ValCoins</span>
                    <span className="text-accent ml-2">{product.discountedPrice} ValCoins ({product.promotion}% off)</span>
                  </>
                ) : (
                  `${product.price} ValCoins`
                )}
              </p>
              <p className="text-secondary text-sm mb-4">Quantidade: {product.quantity}</p>
              <div className="flex items-center space-x-2">
                {user && user.id !== product.seller_id && (
                  <button
                    onClick={() => handleBuy(product.id)}
                    disabled={product.quantity === 0 || loading}
                    className={`w-full p-3 rounded-md text-white transition flex items-center justify-center space-x-2 ${
                      product.quantity === 0 ? 'bg-gray-300 cursor-not-allowed' : 'bg-primary hover:bg-blue-700'
                    }`}
                  >
                    <ShoppingCartIcon className="h-5 w-5" />
                    <span>{product.quantity === 0 ? 'Esgotado' : 'Comprar'}</span>
                  </button>
                )}
                {user && user.id === product.seller_id && (
                  <>
                    <Link to={`/product/${product.id}/edit`} className="w-full p-3 rounded-md text-white bg-secondary hover:bg-gray-600 transition flex items-center justify-center">
                      Edit
                    </Link>
                    <Link to={`/product/${product.id}/purchases`} className="w-full p-3 rounded-md text-white bg-info hover:bg-blue-400 transition flex items-center justify-center">
                      Purchases
                    </Link>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductList;
