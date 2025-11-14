import { useState, useEffect } from 'react';

const useAuth = () => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);

  useEffect(() => {
    const storedToken = localStorage.getItem('authToken'); // Changed from 'token'
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const login = (data) => {
    localStorage.setItem('authToken', data.accessToken); // Changed from 'token'
    localStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);
    setToken(data.accessToken);
  };

  const logout = () => {
    localStorage.removeItem('authToken'); // Changed from 'token'
    localStorage.removeItem('user');
    setUser(null);
    setToken(null);
    window.location.replace('http://localhost');
  };

  return { user, token, login, logout };
};

export default useAuth;
