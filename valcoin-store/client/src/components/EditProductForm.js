import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const EditProductForm = ({ token }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [formData, setFormData] = useState({});
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    axios.get(`/api/store/products/${id}`)
      .then(response => {
        setProduct(response.data);
        setFormData(response.data);
      })
      .catch(error => console.error('Error fetching product!', error));

    axios.get('/api/store/categories')
      .then(response => {
        setCategories(response.data);
      })
      .catch(error => console.error('Error fetching categories!', error));
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Ensure category_id is a number if it exists
    if (formData.category_id) {
      formData.category_id = parseInt(formData.category_id, 10);
    }
    
    axios.put(`/api/store/products/${id}`, formData, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(() => {
      alert('Product updated successfully!');
      navigate('/');
    })
    .catch(error => {
      console.error('Error updating product!', error);
      alert(error.response?.data?.message || 'Failed to update product.');
    });
  };

  if (!product) return <div>Loading...</div>;

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-4">Edit Product</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label>Name</label>
          <input type="text" name="name" value={formData.name || ''} onChange={handleChange} className="w-full p-2 border rounded" />
        </div>
        <div>
          <label>Description</label>
          <textarea name="description" value={formData.description || ''} onChange={handleChange} className="w-full p-2 border rounded"></textarea>
        </div>
        <div>
          <label>Price</label>
          <input type="number" name="price" value={formData.price || 0} onChange={handleChange} className="w-full p-2 border rounded" />
        </div>
        <div>
          <label>Quantity</label>
          <input type="number" name="quantity" value={formData.quantity || 0} onChange={handleChange} className="w-full p-2 border rounded" />
        </div>
        <div>
          <label>Category</label>
          <select name="category_id" value={formData.category_id || ''} onChange={handleChange} className="w-full p-2 border rounded bg-white">
            <option value="">Select a category</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label>Promotion (%)</label>
          <input type="number" name="promotion" value={formData.promotion || 0} onChange={handleChange} className="w-full p-2 border rounded" />
        </div>
        <button type="submit" className="bg-primary text-white p-2 rounded">Save Changes</button>
      </form>
    </div>
  );
};

export default EditProductForm;
