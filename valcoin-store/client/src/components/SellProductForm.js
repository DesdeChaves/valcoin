import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { PlusCircleIcon, XMarkIcon, PhotoIcon, EyeIcon } from '@heroicons/react/24/outline';

// Componente de Upload de Imagem
const ImageUploadField = ({ image, setImage }) => {
  const [imagePreview, setImagePreview] = useState(image);
  const [uploadMethod, setUploadMethod] = useState('url');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  // Atualiza preview quando image muda externamente
  useEffect(() => {
    setImagePreview(image);
  }, [image]);

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  };

  const compressImage = (file, maxWidth = 800, quality = 0.8) => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Calculate new dimensions
        let { width, height } = img;
        
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxWidth) {
            width = (width * maxWidth) / height;
            height = maxWidth;
          }
        }

        canvas.width = width;
        canvas.height = height;

        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);
        const compressedBase64 = canvas.toDataURL(file.type, quality);
        resolve(compressedBase64);
      };

      img.src = URL.createObjectURL(file);
    });
  };

  const validateImageFile = (file) => {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!validTypes.includes(file.type)) {
      throw new Error('Formato não suportado. Use JPEG, PNG, WEBP ou GIF.');
    }
    
    if (file.size > maxSize) {
      throw new Error('Imagem muito grande. Máximo 5MB.');
    }

    return true;
  };

  const handleFileUpload = async (file) => {
    try {
      validateImageFile(file);
      
      // Compress image before converting to Base64
      const compressedBase64 = await compressImage(file);
      
      // Check compressed size
      const sizeInMB = (compressedBase64.length * 3 / 4) / (1024 * 1024);
      if (sizeInMB > 10) {
        throw new Error('Imagem ainda muito grande após compressão. Tente uma imagem menor.');
      }
      
      setImage(compressedBase64);
      setImagePreview(compressedBase64);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleUrlChange = (url) => {
    setImage(url);
    setImagePreview(url);
  };

  const clearImage = () => {
    setImage('');
    setImagePreview('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-secondary">Imagem do Produto</label>
      
      {/* Method selector */}
      <div className="flex space-x-4 mb-4">
        <button
          type="button"
          onClick={() => setUploadMethod('url')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition ${
            uploadMethod === 'url' 
              ? 'bg-primary text-white' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          URL da Imagem
        </button>
        <button
          type="button"
          onClick={() => setUploadMethod('file')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition ${
            uploadMethod === 'file' 
              ? 'bg-primary text-white' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Upload de Arquivo
        </button>
      </div>

      {/* URL Input */}
      {uploadMethod === 'url' && (
        <div>
          <input
            type="url"
            value={image || ''}
            onChange={(e) => handleUrlChange(e.target.value)}
            className="w-full p-3 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary transition"
            placeholder="https://exemplo.com/imagem.jpg"
          />
        </div>
      )}

      {/* File Upload */}
      {uploadMethod === 'file' && (
        <div>
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
              dragOver 
                ? 'border-primary bg-blue-50' 
                : 'border-gray-300 hover:border-primary hover:bg-gray-50'
            }`}
            onClick={() => fileInputRef.current?.click()}
          >
            <PhotoIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">
              Arraste uma imagem aqui ou <span className="text-primary font-medium">clique para selecionar</span>
            </p>
            <p className="text-xs text-gray-500">
              JPEG, PNG, WEBP ou GIF até 5MB
            </p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
            onChange={(e) => e.target.files[0] && handleFileUpload(e.target.files[0])}
            className="hidden"
          />
        </div>
      )}

      {/* Image Preview */}
      {imagePreview && (
        <div className="relative">
          <div className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg">
            <img
              src={imagePreview}
              alt="Preview"
              className="w-20 h-20 object-cover rounded-lg border"
              onError={() => setImagePreview('')}
            />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">Imagem selecionada</p>
              <div className="flex space-x-2 mt-2">
                <button
                  type="button"
                  onClick={() => window.open(imagePreview, '_blank')}
                  className="text-xs text-primary hover:text-blue-700 flex items-center space-x-1"
                >
                  <EyeIcon className="h-3 w-3" />
                  <span>Visualizar</span>
                </button>
                <button
                  type="button"
                  onClick={clearImage}
                  className="text-xs text-red-600 hover:text-red-800 flex items-center space-x-1"
                >
                  <XMarkIcon className="h-3 w-3" />
                  <span>Remover</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="text-xs text-gray-500">
        💡 <strong>Dica:</strong> Imagens são automaticamente comprimidas para otimizar o carregamento. Tamanho máximo: 5MB.
      </div>
    </div>
  );
};

// Componente principal do formulário
const SellProductForm = ({ user, token }) => {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [description, setDescription] = useState('');
  const [promotion, setPromotion] = useState('');
  const [image, setImage] = useState('');
  const [taxaIvaRef, setTaxaIvaRef] = useState('isento');
  const [ivaRates, setIvaRates] = useState({});
  const [categories, setCategories] = useState([]);
  const [categoryId, setCategoryId] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) return;

    axios.get('http://localhost:3001/api/settings', { headers: { Authorization: `Bearer ${token}` } })
      .then(response => setIvaRates(response.data.taxasIVA || {}))
      .catch(error => console.error('Error fetching IVA rates!', error));

    axios.get('/api/store/categories')
      .then(response => {
          setCategories(response.data);
          if (response.data.length > 0) {
              setCategoryId(response.data[0].id);
          }
      })
      .catch(error => console.error('Error fetching categories!', error));
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const selectedCategory = categories.find(cat => cat.id === parseInt(categoryId));
      const isTicket = selectedCategory ? selectedCategory.name === 'Bilhetes' : false;

      const newProduct = {
        name,
        price: parseInt(price),
        quantity: parseInt(quantity),
        description,
        category_id: categoryId,
        promotion: parseFloat(promotion) || 0,
        image: image || null,
        taxa_iva_ref: taxaIvaRef,
        isTicket: isTicket
      };
      await axios.post('/api/store/products', 
        newProduct, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao adicionar produto');
    }
  };

  return (
    <div className="max-w-md mx-auto mt-12 bg-white p-8 rounded-xl shadow-lg">
      <h2 className="text-3xl font-bold text-primary mb-6">Vender um Produto</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-secondary">Nome do Produto</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full p-3 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary transition"
            placeholder="Digite o nome do produto"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-secondary">Preço (em ValCoins)</label>
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            min="0"
            required
            className="w-full p-3 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary transition"
            placeholder="Digite o preço"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-secondary">Quantidade</label>
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            min="0"
            required
            className="w-full p-3 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary transition"
            placeholder="Digite a quantidade"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-secondary">Descrição</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows="4"
            className="w-full p-3 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary transition"
            placeholder="Descreva o produto"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-secondary">Categoria</label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            required
            className="w-full p-3 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-white"
          >
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-secondary">Promoção (% de desconto)</label>
          <input
            type="number"
            value={promotion}
            onChange={(e) => setPromotion(e.target.value)}
            min="0"
            max="100"
            placeholder="0"
            className="w-full p-3 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary transition"
          />
        </div>

        {/* Campo de imagem substituído pelo componente personalizado */}
        <ImageUploadField image={image} setImage={setImage} />

        <div>
          <label className="block text-sm font-medium text-secondary">Taxa de IVA</label>
          <select
            value={taxaIvaRef}
            onChange={(e) => setTaxaIvaRef(e.target.value)}
            required
            className="w-full p-3 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-white"
          >
            {Object.entries(ivaRates).map(([key, value]) => (
              <option key={key} value={key}>{key} ({value}%)</option>
            ))}
          </select>
        </div>

        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
        
        <div className="flex space-x-4">
          <button
            type="submit"
            className="flex-1 p-3 bg-primary text-white rounded-md hover:bg-blue-700 transition flex items-center justify-center space-x-2"
          >
            <PlusCircleIcon className="h-5 w-5" />
            <span>Adicionar Produto</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex-1 p-3 bg-secondary text-white rounded-md hover:bg-gray-700 transition flex items-center justify-center space-x-2"
          >
            <XMarkIcon className="h-5 w-5" />
            <span>Cancelar</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default SellProductForm;
