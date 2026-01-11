import { useState, useEffect } from 'react';

const useAuth = () => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true); // New loading state

  useEffect(() => {
    const storedToken = localStorage.getItem('authToken'); // Use authToken as per portal
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    setLoading(false); // Set loading to false after checking auth
  }, []);

  const login = (newToken, newUser) => {
    localStorage.setItem('authToken', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    setUser(newUser);
    setToken(newToken);
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    setUser(null);
    setToken(null);
    window.location.replace(window.location.origin); // Redirect to the root of the current origin
  };

  const isCoordinator = user?.roles?.includes('coordenador_departamento') || false;
  const enhancedUser = user ? { ...user, isCoordinator } : null;

  return { user: enhancedUser, token, login, logout, loading };
};

export default useAuth;
