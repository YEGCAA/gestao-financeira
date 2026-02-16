import React, { useState } from 'react';
import { LogIn, Eye, EyeOff, TrendingUp, Shield, Zap } from 'lucide-react';
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
            const { data, error } = await supabase
                .from('Logins')
                .select('*')
                .eq('email', email)
                .eq('senha', password)
                .single();

            if (error || !data) {
                throw new Error('Email ou senha incorretos');
            }

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
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 flex items-center justify-center p-4 relative overflow-hidden" style={{ fontFamily: "'Poppins', 'Inter', sans-serif" }}>
            {/* Google Fonts Import */}
            <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet" />

            {/* Background decoration */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-200/30 via-transparent to-transparent"></div>

            {/* Floating shapes */}
            <div className="absolute top-20 left-10 w-20 h-20 bg-blue-200/30 rounded-full blur-2xl animate-pulse"></div>
            <div className="absolute bottom-20 right-10 w-32 h-32 bg-blue-300/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
            <div className="absolute top-1/2 right-1/4 w-16 h-16 bg-blue-100/40 rounded-full blur-xl animate-pulse" style={{ animationDelay: '2s' }}></div>

            {/* Subtle pattern overlay */}
            <div className="absolute inset-0 opacity-5" style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%230ea5e9' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
            }}></div>

            {/* Login Card */}
            <div className="relative z-10 w-full max-w-md">
                <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-blue-100/50 p-8 relative overflow-hidden">
                    {/* Top accent bar */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-400 via-blue-500 to-blue-400"></div>

                    {/* Logo and Title */}
                    <div className="text-center mb-8">
                        <div className="flex justify-center mb-4">
                            <div className="relative">
                                <div className="absolute inset-0 bg-blue-400/20 rounded-2xl blur-xl"></div>
                                <img src="https://i.ibb.co/gZcFGqVt/Brand-03.png" alt="Even Digital" className="h-16 w-auto relative z-10" />
                            </div>
                        </div>
                        <h1 className="text-3xl font-bold mb-2">
                            <span className="text-gray-800">EVEN</span>
                            <span className="text-blue-500">DIGITAL</span>
                        </h1>
                        <p className="text-gray-500 text-sm font-medium tracking-wide">
                            Financial Management Center
                        </p>
                    </div>

                    {/* Features Pills */}
                    <div className="flex justify-center gap-2 mb-6">
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 rounded-full border border-blue-100">
                            <Shield size={14} className="text-blue-500" />
                            <span className="text-xs font-medium text-blue-600">Seguro</span>
                        </div>
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 rounded-full border border-blue-100">
                            <Zap size={14} className="text-blue-500" />
                            <span className="text-xs font-medium text-blue-600">Rápido</span>
                        </div>
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 rounded-full border border-blue-100">
                            <TrendingUp size={14} className="text-blue-500" />
                            <span className="text-xs font-medium text-blue-600">Inteligente</span>
                        </div>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-xl">
                            <p className="text-red-600 text-sm text-center font-medium">{error}</p>
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleLogin} className="space-y-5">
                        {/* Email Input */}
                        <div>
                            <label className="block text-gray-700 text-sm font-semibold mb-2">
                                Usuário
                            </label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3.5 bg-blue-50/50 border-2 border-blue-100 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all font-medium"
                                placeholder="Digite seu usuário"
                            />
                        </div>

                        {/* Password Input */}
                        <div>
                            <label className="block text-gray-700 text-sm font-semibold mb-2">
                                Senha
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-4 py-3.5 bg-blue-50/50 border-2 border-blue-100 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all pr-12 font-medium"
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                        </div>

                        {/* Remember me checkbox */}
                        <div className="flex items-center justify-between">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="w-4 h-4 rounded border-blue-300 text-blue-500 focus:ring-blue-400"
                                />
                                <span className="text-sm text-gray-600 font-medium">Lembrar-me</span>
                            </label>
                            <a href="#" className="text-sm text-blue-500 hover:text-blue-600 font-medium transition-colors">
                                Esqueceu a senha?
                            </a>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl font-semibold transition-all shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2 mt-6"
                        >
                            {isLoading ? (
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                                <>
                                    Acessar Dashboard
                                    <LogIn size={20} />
                                </>
                            )}
                        </button>
                    </form>

                    {/* Divider */}
                    <div className="flex items-center gap-3 my-6">
                        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-blue-200 to-transparent"></div>
                        <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-blue-200 to-transparent"></div>
                    </div>

                    {/* Footer */}
                    <div className="text-center">
                        <p className="text-gray-400 text-xs font-medium">
                            © 2026 Even Digital. Todos os direitos reservados.
                        </p>
                    </div>
                </div>

                {/* Bottom decoration */}
                <div className="mt-8 text-center">
                    <div className="flex justify-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-500 shadow-lg shadow-blue-500/50"></div>
                        <div className="w-2 h-2 rounded-full bg-blue-300"></div>
                        <div className="w-2 h-2 rounded-full bg-blue-200"></div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
