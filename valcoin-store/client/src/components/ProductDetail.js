import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ShoppingCartIcon, ArrowLeftIcon, PrinterIcon } from '@heroicons/react/24/outline';

const ProductDetail = ({ user, token }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [seller, setSeller] = useState(null);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [hasPurchased, setHasPurchased] = useState(false);
  const [hasGivenFeedback, setHasGivenFeedback] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  useEffect(() => {
    axios.get(`/api/store/products/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(response => setProduct(response.data))
      .catch(error => {
        setError('Erro ao buscar detalhes do produto');
        console.error(error);
      });
  }, [id, token]);

  useEffect(() => {
    if (product) {
      axios.get(`/api/store/users/${product.seller_id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(response => setSeller(response.data))
        .catch(error => console.error('Error fetching seller details!', error));
    }
  }, [product, token]);

  useEffect(() => {
    if (product && user) {
      // Check if the user is the seller
      if (user.id === product.seller_id) {
        return;
      }

      axios.get(`/api/store/products/${id}/my-purchase`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(response => {
        const purchases = response.data;
        if (purchases.length > 0) {
          setHasPurchased(true);
          if (purchases[0].feedback) {
            setHasGivenFeedback(true);
          }
        }
      })
      .catch(error => {
        console.error('Error fetching purchases!', error)
      });
    }
  }, [product, user, id, token]);

  const handleBuy = () => {
    axios.post('/api/store/buy', 
      { productId: product.id, tipo_utilizador: user.tipo_utilizador }, 
      { headers: { Authorization: `Bearer ${token}` } }
    )
    .then(response => {
      alert(response.data.message);
      navigate('/');
    })
    .catch(error => {
      setError(error.response?.data?.message || 'Falha na compra do produto.');
    });
  };

  const handleFeedbackSubmit = (e) => {
    e.preventDefault();
    axios.post(`/api/store/products/${id}/feedback`, { feedback }, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(() => {
      alert('Feedback submitted successfully!');
      setHasGivenFeedback(true);
    })
    .catch(error => {
      console.error('Error submitting feedback!', error);
      alert(error.response?.data?.message || 'Failed to submit feedback.');
    });
  };

  const handlePrintTicket = async () => {
    setIsGeneratingPDF(true);
    try {
      const response = await axios.get(`/api/store/products/${id}/ticket-pdf`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob' // Importante para receber o PDF como blob
      });

      // Criar URL para o blob e fazer download
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `bilhete-${product.name.replace(/\s+/g, '-')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generating ticket PDF:', error);
      alert(error.response?.data?.message || 'Erro ao gerar PDF do bilhete');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  if (!product) {
    return <div className="text-center mt-12 text-secondary">{error || 'Carregando...'}</div>;
  }

  const isTicket = product.category === 'Bilhetes';
  const canPrintTicket = isTicket && hasPurchased && user.id !== product.seller_id;

  return (
    <div className="max-w-3xl mx-auto bg-white p-8 rounded-xl shadow-lg">
      <h2 className="text-3xl font-bold text-primary mb-6">{product.name}</h2>
      
      {/* Badge para bilhetes */}
      {isTicket && (
        <div className="mb-4">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            🎫 Bilhete Digital
          </span>
        </div>
      )}

      {product.image && (
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-80 object-cover rounded-md mb-6"
        />
      )}
      <p className="text-secondary mb-4"><strong>Descrição:</strong> {product.description || 'Sem descrição disponível'}</p>
      <p className="text-secondary mb-4"><strong>Categoria:</strong> {product.category}</p>
      <p className="mb-4">
        <strong>Preço:</strong>{' '}
        {product.promotion > 0 ? (
          <>
            <span className="line-through text-gray-400">{product.price} ValCoins</span>
            <span className="text-accent ml-2">{product.discountedPrice} ValCoins ({product.promotion}% off)</span>
          </>
        ) : (
          `${product.price} ValCoins`
        )}
      </p>
      <p className="text-secondary mb-4"><strong>Quantidade disponível:</strong> {product.quantity}</p>
      <p className="text-secondary mb-6"><strong>Vendido por:</strong> {seller ? `${seller.nome} (${seller.email})` : 'A carregar...'}</p>
      
      <div className="flex space-x-4 mb-6">
        {user && user.id !== product.seller_id && (
          <button
            onClick={handleBuy}
            disabled={product.quantity === 0}
            className={`flex-1 p-3 rounded-md text-white transition flex items-center justify-center space-x-2 ${
              product.quantity === 0 ? 'bg-gray-300 cursor-not-allowed' : 'bg-primary hover:bg-blue-700'
            }`}
          >
            <ShoppingCartIcon className="h-5 w-5" />
            <span>{product.quantity === 0 ? 'Esgotado' : 'Comprar'}</span>
          </button>
        )}
        <button
          onClick={() => navigate('/')}
          className="flex-1 p-3 bg-secondary text-white rounded-md hover:bg-gray-700 transition flex items-center justify-center space-x-2"
        >
          <ArrowLeftIcon className="h-5 w-5" />
          <span>Voltar</span>
        </button>
      </div>

      {/* Botão para imprimir bilhete */}
      {canPrintTicket && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">🎫 Seu Bilhete Digital</h3>
          <p className="text-yellow-700 mb-4">Você comprou este bilhete! Faça o download do PDF para apresentar na entrada.</p>
          <button
            onClick={handlePrintTicket}
            disabled={isGeneratingPDF}
            className={`w-full p-3 rounded-md text-white transition flex items-center justify-center space-x-2 ${
              isGeneratingPDF 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            <PrinterIcon className="h-5 w-5" />
            <span>{isGeneratingPDF ? 'Gerando PDF...' : 'Baixar Bilhete (PDF)'}</span>
          </button>
        </div>
      )}

      {error && <p className="text-red-500 mt-4 text-center">{error}</p>}

      {hasPurchased && !hasGivenFeedback && (
        <div className="mt-6">
          <h3 className="text-xl font-bold mb-2">Deixar Feedback</h3>
          <form onSubmit={handleFeedbackSubmit}>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              className="w-full p-2 border rounded"
              rows="4"
              placeholder="Compartilhe sua experiência com este produto..."
            ></textarea>
            <button type="submit" className="mt-2 bg-primary text-white p-2 rounded">Enviar Feedback</button>
          </form>
        </div>
      )}
      {hasPurchased && hasGivenFeedback && (
        <p className="mt-6 text-green-600">Você já enviou feedback para este produto.</p>
      )}
    </div>
  );
};

export default ProductDetail;
