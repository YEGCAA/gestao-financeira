
import React, { useState } from 'react';
import { LogIn, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface LoginProps {
    onLoginSuccess: () => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            // Verificar na tabela Logins se existe um usuário com esse email e senha
            const { data, error } = await supabase
                .from('Logins')
                .select('*')
                .eq('email', email)
                .eq('senha', password)
                .single();

            if (error || !data) {
                throw new Error('Email ou senha incorretos');
            }

            // Login bem-sucedido
            localStorage.setItem('isLoggedIn', 'true');
            localStorage.setItem('userEmail', email);
            onLoginSuccess();
        } catch (err: any) {
            setError(err.message || 'Erro ao fazer login');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-white flex items-center justify-center p-4 relative overflow-hidden">
            {/* Animated background circles */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-100/40 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute top-1/2 -right-40 w-96 h-96 bg-indigo-100/40 rounded-full blur-3xl animate-pulse delay-1000"></div>
                <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-cyan-100/40 rounded-full blur-3xl animate-pulse delay-2000"></div>
            </div>

            <div className="w-full max-w-md relative z-10 animate-fadeInUp">
                {/* Logo */}
                <div className="text-center mb-8">
                    <img src="https://i.ibb.co/gZcFGqVt/Brand-03.png" alt="Even Digital" className="h-16 w-auto mb-4 mx-auto" />
                    <h1 className="text-4xl font-bold text-blue-600 mb-2">Even Digital</h1>
                    <p className="text-blue-500 text-lg">Gestão Financeira</p>
                </div>

                {/* Login Form */}
                <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 rounded-3xl shadow-2xl p-8">
                    <h2 className="text-2xl font-bold text-white mb-6 text-center">Entrar na sua conta</h2>

                    {error && (
                        <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-xl text-white text-sm animate-slideInUp">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-5">
                        <div>
                            <label className="block text-white/90 text-sm font-medium mb-2">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50" size={20} />
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-transparent transition-all"
                                    placeholder="seu@email.com"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-white/90 text-sm font-medium mb-2">Senha</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50" size={20} />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-12 pr-12 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-transparent transition-all"
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors"
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-3 bg-white text-blue-600 rounded-xl font-bold text-lg hover:bg-blue-50 transition-all shadow-xl hover:shadow-2xl hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <div className="w-6 h-6 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                                <>
                                    <LogIn size={20} />
                                    Entrar
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-white/70 text-sm">
                            Esqueceu sua senha? <a href="#" className="text-white font-medium hover:underline">Recuperar</a>
                        </p>
                    </div>
                </div>

                <p className="text-center text-blue-400 text-sm mt-6">
                    © 2026 Even Digital. Todos os direitos reservados.
                </p>
            </div>

            <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fadeInUp {
          animation: fadeInUp 0.6s ease-out;
        }

        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-slideInUp {
          animation: slideInUp 0.3s ease-out;
        }

        .delay-1000 {
          animation-delay: 1s;
        }

        .delay-2000 {
          animation-delay: 2s;
        }
      `}</style>
        </div>
    );
};

export default Login;
