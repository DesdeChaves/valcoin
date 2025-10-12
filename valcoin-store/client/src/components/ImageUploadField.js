import React, { useState, useRef } from 'react';
import { PhotoIcon, XMarkIcon, EyeIcon } from '@heroicons/react/24/outline';

const ImageUploadField = ({ image, setImage, error }) => {
  const [imagePreview, setImagePreview] = useState(image);
  const [uploadMethod, setUploadMethod] = useState('url'); // 'url' or 'file'
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  // Função para converter arquivo para Base64
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  };

  // Validar arquivo de imagem
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

  // Handle file upload
  const handleFileUpload = async (file) => {
    try {
      validateImageFile(file);
      const base64 = await fileToBase64(file);
      setImage(base64);
      setImagePreview(base64);
    } catch (err) {
      alert(err.message);
    }
  };

  // Handle drag and drop
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

  // Handle URL change
  const handleUrlChange = (url) => {
    setImage(url);
    setImagePreview(url);
  };

  // Clear image
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
          {/* Drag and Drop Zone */}
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

          {/* Hidden file input */}
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

      {/* Multiple images option */}
      <div className="text-xs text-gray-500">
        💡 <strong>Dica:</strong> Para melhor resultado, use imagens quadradas (1:1) com pelo menos 300x300 pixels.
      </div>
    </div>
  );
};

export default ImageUploadField;
