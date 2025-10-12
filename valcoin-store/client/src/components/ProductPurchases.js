import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

const ProductPurchases = ({ token }) => {
  const { id } = useParams();
  const [purchases, setPurchases] = useState([]);
  const [product, setProduct] = useState(null);

  useEffect(() => {
    axios.get(`/api/store/products/${id}`)
      .then(response => setProduct(response.data))
      .catch(error => console.error('Error fetching product!', error));

    axios.get(`/api/store/products/${id}/purchases`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(response => setPurchases(response.data))
    .catch(error => console.error('Error fetching purchases!', error));
  }, [id, token]);

  if (!product) return <div>Loading...</div>;

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-4">Purchases for {product.name}</h2>
      {purchases.length === 0 ? (
        <p>No purchases for this product yet.</p>
      ) : (
        <ul className="space-y-4">
          {purchases.map((purchase, index) => (
            <li key={index} className="p-4 border rounded">
              <p><strong>Buyer:</strong> {purchase.buyer_name} ({purchase.buyer_email})</p>
              <p><strong>Feedback:</strong> {purchase.feedback || 'No feedback yet.'}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ProductPurchases;
