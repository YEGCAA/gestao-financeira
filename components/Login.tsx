
import React, { useState } from 'react';
import { LogIn, Mail, Lock, Eye, EyeOff, TrendingUp, DollarSign, PieChart } from 'lucide-react';
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
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
            {/* Animated background elements */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-float"></div>
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-float-delayed"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-3xl"></div>
            </div>

            {/* Grid pattern overlay */}
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjAzIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-40"></div>

            <div className="w-full max-w-6xl relative z-10 grid lg:grid-cols-2 gap-8 items-center">
                {/* Left side - Branding & Features */}
                <div className="hidden lg:block space-y-8 animate-fadeInLeft">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 mb-6">
                            <img src="https://i.ibb.co/gZcFGqVt/Brand-03.png" alt="Even Digital" className="h-12 w-auto" />
                            <div>
                                <h1 className="text-4xl font-bold text-white">Even Digital</h1>
                                <p className="text-blue-300 text-lg">Gestão Financeira Inteligente</p>
                            </div>
                        </div>

                        <p className="text-white/80 text-lg leading-relaxed">
                            Controle total das suas finanças em um só lugar. Simplifique sua gestão financeira com ferramentas poderosas e intuitivas.
                        </p>
                    </div>

                    {/* Features */}
                    <div className="space-y-4">
                        <div className="flex items-start gap-4 p-4 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 hover:bg-white/10 transition-all">
                            <div className="p-3 bg-blue-500/20 rounded-xl">
                                <TrendingUp className="text-blue-400" size={24} />
                            </div>
                            <div>
                                <h3 className="text-white font-semibold mb-1">Análise em Tempo Real</h3>
                                <p className="text-white/60 text-sm">Acompanhe suas receitas e despesas instantaneamente</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4 p-4 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 hover:bg-white/10 transition-all">
                            <div className="p-3 bg-indigo-500/20 rounded-xl">
                                <PieChart className="text-indigo-400" size={24} />
                            </div>
                            <div>
                                <h3 className="text-white font-semibold mb-1">Relatórios Detalhados</h3>
                                <p className="text-white/60 text-sm">Visualize gráficos e dashboards personalizados</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4 p-4 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 hover:bg-white/10 transition-all">
                            <div className="p-3 bg-cyan-500/20 rounded-xl">
                                <DollarSign className="text-cyan-400" size={24} />
                            </div>
                            <div>
                                <h3 className="text-white font-semibold mb-1">Previsão de Gastos</h3>
                                <p className="text-white/60 text-sm">Planeje seu futuro financeiro com precisão</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right side - Login Form */}
                <div className="w-full animate-fadeInRight">
                    {/* Mobile logo */}
                    <div className="lg:hidden text-center mb-8">
                        <img src="https://i.ibb.co/gZcFGqVt/Brand-03.png" alt="Even Digital" className="h-12 w-auto mb-3 mx-auto" />
                        <h1 className="text-3xl font-bold text-white mb-1">Even Digital</h1>
                        <p className="text-blue-300">Gestão Financeira</p>
                    </div>

                    <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/20">
                        <div className="mb-8">
                            <h2 className="text-3xl font-bold text-white mb-2">Bem-vindo de volta!</h2>
                            <p className="text-white/60">Entre com suas credenciais para continuar</p>
                        </div>

                        {error && (
                            <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-xl text-white text-sm flex items-center gap-2 animate-shake">
                                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleLogin} className="space-y-5">
                            <div>
                                <label className="block text-white/90 text-sm font-medium mb-2">Email</label>
                                <div className="relative group">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-blue-400 transition-colors" size={20} />
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full pl-12 pr-4 py-3.5 bg-white/5 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 focus:bg-white/10 transition-all"
                                        placeholder="seu@email.com"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-white/90 text-sm font-medium mb-2">Senha</label>
                                <div className="relative group">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-blue-400 transition-colors" size={20} />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full pl-12 pr-12 py-3.5 bg-white/5 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 focus:bg-white/10 transition-all"
                                        placeholder="••••••••"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                                    >
                                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center justify-between text-sm">
                                <label className="flex items-center gap-2 text-white/70 cursor-pointer group">
                                    <input type="checkbox" className="w-4 h-4 rounded border-white/20 bg-white/5 text-blue-500 focus:ring-2 focus:ring-blue-500/50" />
                                    <span className="group-hover:text-white transition-colors">Lembrar-me</span>
                                </label>
                                <a href="#" className="text-blue-400 hover:text-blue-300 transition-colors font-medium">
                                    Esqueceu a senha?
                                </a>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-3.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-bold text-lg hover:from-blue-600 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl hover:shadow-blue-500/50 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
                            >
                                {isLoading ? (
                                    <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                    <>
                                        <LogIn size={20} />
                                        Entrar
                                    </>
                                )}
                            </button>
                        </form>

                        <div className="mt-6 pt-6 border-t border-white/10 text-center">
                            <p className="text-white/60 text-sm">
                                Não tem uma conta? <a href="#" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">Criar conta</a>
                            </p>
                        </div>
                    </div>

                    <p className="text-center text-white/40 text-sm mt-6">
                        © 2026 Even Digital. Todos os direitos reservados.
                    </p>
                </div>
            </div>

            <style>{`
        @keyframes fadeInLeft {
          from {
            opacity: 0;
            transform: translateX(-30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes fadeInRight {
          from {
            opacity: 0;
            transform: translateX(30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-20px);
          }
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }

        .animate-fadeInLeft {
          animation: fadeInLeft 0.8s ease-out;
        }

        .animate-fadeInRight {
          animation: fadeInRight 0.8s ease-out;
        }

        .animate-float {
          animation: float 6s ease-in-out infinite;
        }

        .animate-float-delayed {
          animation: float 6s ease-in-out infinite;
          animation-delay: 3s;
        }

        .animate-shake {
          animation: shake 0.4s ease-out;
        }
      `}</style>
        </div>
    );
};

export default Login;
