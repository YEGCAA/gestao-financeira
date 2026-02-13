import React, { useState, useEffect } from 'react';
import App from './App';
import Login from './components/Login';

const AuthWrapper: React.FC = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [checkingAuth, setCheckingAuth] = useState(true);

    useEffect(() => {
        // Verificar se já está logado (localStorage)
        const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
        setIsAuthenticated(isLoggedIn);
        setCheckingAuth(false);
    }, []);

    if (checkingAuth) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-white border-t-transparent"></div>
                    <p className="text-white text-lg font-medium">Carregando...</p>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Login onLoginSuccess={() => setIsAuthenticated(true)} />;
    }

    return <App />;
};

export default AuthWrapper;
