import React, { useMemo, useState } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Calendar, ArrowUpCircle, ArrowDownCircle, Wallet, Eye, CreditCard, Tags, Filter, ChevronDown, Search, Clock, CalendarDays, BarChart3, ListFilter } from 'lucide-react';
import { Transaction, Investment, Bill, ForecastExpense, Category } from '../types';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, Legend, PieChart, Pie } from 'recharts';

interface DashboardProps {
    transactions: Transaction[];
    investments: Investment[];
    bills: Bill[];
    forecasts: ForecastExpense[];
    categories: Category[];
}

const Dashboard: React.FC<DashboardProps> = ({ transactions, investments, bills, forecasts, categories }) => {
    const [dateRange, setDateRange] = useState<'all' | 'today' | '7days' | '30days' | 'thisMonth' | 'lastMonth' | 'custom'>('all');
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');

    // Função para filtrar dados por data
    const filterByDate = (dateStr: string) => {
        if (dateRange === 'all') return true;

        const date = new Date(dateStr);
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        switch (dateRange) {
            case 'today':
                return date >= startOfToday;
            case '7days': {
                const sevenDaysAgo = new Date(startOfToday);
                sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                return date >= sevenDaysAgo;
            }
            case '30days': {
                const thirtyDaysAgo = new Date(startOfToday);
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                return date >= thirtyDaysAgo;
            }
            case 'thisMonth': {
                const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                return date >= startOfMonth;
            }
            case 'lastMonth': {
                const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
                return date >= startOfLastMonth && date <= endOfLastMonth;
            }
            case 'custom': {
                if (!customStartDate || !customEndDate) return true;
                const start = new Date(customStartDate);
                const end = new Date(customEndDate);
                end.setHours(23, 59, 59);
                return date >= start && date <= end;
            }
            default:
                return true;
        }
    };

    // Dados Filtrados
    const filteredTransactions = useMemo(() => transactions.filter(t => filterByDate(t.date)), [transactions, dateRange, customStartDate, customEndDate]);
    const filteredInvestments = useMemo(() => investments.filter(i => filterByDate(i.date_lancamento)), [investments, dateRange, customStartDate, customEndDate]);
    const filteredBills = useMemo(() => bills.filter(b => filterByDate(b.data)), [bills, dateRange, customStartDate, customEndDate]);

    // Calcular métricas principais
    const metrics = useMemo(() => {
        const totalIncome = filteredTransactions
            .filter(t => t.type === 'INCOME')
            .reduce((sum, t) => sum + t.amount, 0);

        const totalExpense = filteredTransactions
            .filter(t => t.type === 'EXPENSE')
            .reduce((sum, t) => sum + t.amount, 0);

        const balance = totalIncome - totalExpense;

        // Calcular contas a receber e a pagar
        const contasReceber = filteredBills
            .filter(b => b.entrada > 0)
            .reduce((sum, b) => sum + b.entrada, 0);

        const contasPagar = filteredBills
            .filter(b => b.saida > 0)
            .reduce((sum, b) => sum + b.saida, 0);

        const investmentBalance = filteredInvestments.reduce((sum, i) => i.type === 'INCOME' ? sum + i.amount : sum - i.amount, 0);

        return {
            totalIncome,
            totalExpense,
            balance,
            contasReceber,
            contasPagar,
            investmentBalance,
            transactionCount: filteredTransactions.length
        };
    }, [filteredTransactions, filteredBills, filteredInvestments]);

    // Dados para gráfico de área (Fluxo de Caixa - Últimos Meses)
    const cashFlowData = useMemo(() => {
        const monthsMap: { [key: string]: { income: number; expense: number; date: Date } } = {};

        filteredTransactions.forEach(t => {
            if (t.date) {
                const date = new Date(t.date);
                const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

                if (!monthsMap[monthKey]) {
                    monthsMap[monthKey] = { income: 0, expense: 0, date };
                }

                if (t.type === 'INCOME') {
                    monthsMap[monthKey].income += t.amount;
                } else {
                    monthsMap[monthKey].expense += t.amount;
                }
            }
        });

        return Object.entries(monthsMap)
            .sort(([a], [b]) => a.localeCompare(b))
            .slice(-6)
            .map(([key, data]) => ({
                month: data.date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''),
                Entradas: data.income,
                Saídas: data.expense
            }));
    }, [filteredTransactions]);



    // Dados para gráfico de barras (Gastos por Tag)
    const tagsData = useMemo(() => {
        const tagsMap: { [key: string]: number } = {};

        filteredTransactions
            .filter(t => {
                const isExpense = t.type === 'EXPENSE' || (t.type !== 'INCOME' && t.amount < 0);
                return isExpense && t.tags && Array.isArray(t.tags) && t.tags.length > 0;
            })
            .forEach(t => {
                t.tags?.forEach(tag => {
                    const cleanTag = tag.trim();
                    if (cleanTag) {
                        tagsMap[cleanTag] = (tagsMap[cleanTag] || 0) + Math.abs(t.amount);
                    }
                });
            });

        return Object.entries(tagsMap)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 10); // Mostrar top 10 tags
    }, [transactions]);

    // Dados para gráficos de pizza (Entradas e Saídas por Categoria)
    const categoryChartsData = useMemo(() => {
        const incomeMap: { [key: string]: number } = {};
        const expenseMap: { [key: string]: number } = {};

        filteredTransactions.forEach(t => {
            const category = categories.find(c => String(c.id) === String(t.categoryId));
            const categoryName = category?.name || 'Sem Categoria';

            if (t.type === 'INCOME') {
                incomeMap[categoryName] = (incomeMap[categoryName] || 0) + t.amount;
            } else {
                expenseMap[categoryName] = (expenseMap[categoryName] || 0) + t.amount;
            }
        });

        const incomeData = Object.entries(incomeMap).map(([name, value]) => {
            const category = categories.find(c => c.name === name);
            return { name, value, color: category?.color || '#10b981' };
        }).sort((a, b) => b.value - a.value);

        const expenseData = Object.entries(expenseMap).map(([name, value]) => {
            const category = categories.find(c => c.name === name);
            return { name, value, color: category?.color || '#ef4444' };
        }).sort((a, b) => b.value - a.value);

        return { incomeData, expenseData };
    }, [filteredTransactions, categories]);

    const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#14b8a6', '#475569'];

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header com Filtros de Data Redesenhado - Visão Executiva */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-100/50">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                    <div className="space-y-1">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-200">
                                <BarChart3 size={20} />
                            </div>
                            <h2 className="text-3xl font-black text-slate-800 tracking-tight">Painel Executivo</h2>
                        </div>
                        <p className="text-slate-500 text-sm font-semibold pl-[3.25rem]">Inteligência financeira em tempo real</p>
                    </div>

                    <div className="flex flex-col gap-4">
                        <div className="flex flex-wrap items-center gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-100">
                            <DateFilterPill
                                active={dateRange === 'all'}
                                label="Histórico"
                                icon={<ListFilter size={14} />}
                                onClick={() => setDateRange('all')}
                            />
                            <DateFilterPill
                                active={dateRange === 'thisMonth'}
                                label="Este Mês"
                                icon={<CalendarDays size={14} />}
                                onClick={() => setDateRange('thisMonth')}
                            />
                            <DateFilterPill
                                active={dateRange === '30days'}
                                label="30 Dias"
                                icon={<Clock size={14} />}
                                onClick={() => setDateRange('30days')}
                            />
                            <DateFilterPill
                                active={dateRange === 'lastMonth'}
                                label="Anterior"
                                icon={<Calendar size={14} />}
                                onClick={() => setDateRange('lastMonth')}
                            />
                            <DateFilterPill
                                active={dateRange === 'custom'}
                                label="Personalizado"
                                icon={<Filter size={14} />}
                                onClick={() => setDateRange('custom')}
                            />
                        </div>

                        {dateRange === 'custom' && (
                            <div className="flex items-center gap-3 bg-indigo-50/50 p-2.5 rounded-2xl border border-indigo-100/50 animate-in slide-in-from-top-2 duration-300">
                                <div className="flex items-center gap-3">
                                    <div className="flex flex-col">
                                        <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-1 ml-1">Início</span>
                                        <input
                                            type="date"
                                            value={customStartDate}
                                            onChange={(e) => setCustomStartDate(e.target.value)}
                                            className="bg-white border border-indigo-100 text-slate-700 text-[11px] font-black rounded-xl px-3 py-2 shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                        />
                                    </div>
                                    <div className="mt-4 text-indigo-200 text-xl font-light">-</div>
                                    <div className="flex flex-col">
                                        <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-1 ml-1">Fim</span>
                                        <input
                                            type="date"
                                            value={customEndDate}
                                            onChange={(e) => setCustomEndDate(e.target.value)}
                                            className="bg-white border border-indigo-100 text-slate-700 text-[11px] font-black rounded-xl px-3 py-2 shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Cards de métricas - Organizados em 3 por linha */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <MetricCard
                    title="Saldo Atual"
                    value={metrics.balance}
                    icon={<Wallet size={24} />}
                    iconBg="bg-blue-100"
                    iconColor="text-blue-600"
                    trend="+12%"
                    trendPositive={true}
                />
                <MetricCard
                    title="Entradas (Mês)"
                    value={metrics.totalIncome}
                    icon={<Eye size={24} />}
                    iconBg="bg-emerald-100"
                    iconColor="text-emerald-600"
                    trend="+5%"
                    trendPositive={true}
                />
                <MetricCard
                    title="Saídas (Mês)"
                    value={metrics.totalExpense}
                    icon={<ArrowDownCircle size={24} />}
                    iconBg="bg-rose-100"
                    iconColor="text-rose-600"
                    trend="+2%"
                    trendPositive={false}
                />

                {/* Segunda Linha */}
                <MetricCard
                    title="Contas a Receber"
                    value={metrics.contasReceber}
                    icon={<TrendingUp size={24} />}
                    iconBg="bg-cyan-100"
                    iconColor="text-cyan-600"
                    label="Valores pendentes"
                />
                <MetricCard
                    title="Contas a Pagar"
                    value={metrics.contasPagar}
                    icon={<CreditCard size={24} />}
                    iconBg="bg-orange-100"
                    iconColor="text-orange-600"
                    label="Compromissos do mês"
                />
                <MetricCard
                    title="Investimentos"
                    value={metrics.investmentBalance}
                    icon={<TrendingUp size={24} />}
                    iconBg="bg-indigo-100"
                    iconColor="text-indigo-600"
                    label="Saldo total aplicado"
                />
            </div>

            {/* Grid com Gráfico de Área e Últimas Movimentações */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Gráfico de Fluxo de Caixa */}
                <div className="lg:col-span-2 bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
                    <div className="mb-6 flex items-center justify-between">
                        <div>
                            <h3 className="text-xl font-bold text-slate-800">Fluxo de Caixa</h3>
                            <p className="text-sm text-slate-500">Histórico dos últimos 6 meses</p>
                        </div>
                    </div>

                    <ResponsiveContainer width="100%" height={320}>
                        <AreaChart data={cashFlowData}>
                            <defs>
                                <linearGradient id="colorEntradas" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
                                </linearGradient>
                                <linearGradient id="colorSaidas" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.25} />
                                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.05} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                            <XAxis
                                dataKey="month"
                                stroke="#94a3b8"
                                style={{ fontSize: '11px', fontWeight: '600' }}
                                tickLine={false}
                                axisLine={false}
                                dy={10}
                            />
                            <YAxis
                                stroke="#94a3b8"
                                style={{ fontSize: '11px', fontWeight: '600' }}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(value) => `R$${(value / 1000).toFixed(0)}k`}
                            />
                            <Tooltip
                                formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                                contentStyle={{
                                    borderRadius: '16px',
                                    border: 'none',
                                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
                                    fontSize: '13px',
                                    padding: '12px'
                                }}
                            />
                            <Area
                                type="monotone"
                                dataKey="Entradas"
                                stroke="#10b981"
                                strokeWidth={3}
                                fill="url(#colorEntradas)"
                                animationDuration={1000}
                            />
                            <Area
                                type="monotone"
                                dataKey="Saídas"
                                stroke="#ef4444"
                                strokeWidth={3}
                                fill="url(#colorSaidas)"
                                animationDuration={1000}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* Últimas Movimentações */}
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
                    <h3 className="text-xl font-bold text-slate-800 mb-6">Últimas Atividades</h3>
                    <div className="space-y-4 max-h-[340px] overflow-y-auto pr-2 custom-scrollbar">
                        {filteredTransactions.length > 0 ? (
                            filteredTransactions
                                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                .slice(0, 10)
                                .map((transaction) => (
                                    <div key={transaction.id} className="flex items-center gap-4 p-3 rounded-2xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                                        <div className={`p-3 rounded-xl ${transaction.type === 'INCOME' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                            {transaction.type === 'INCOME' ? (
                                                <ArrowUpCircle size={20} />
                                            ) : (
                                                <ArrowDownCircle size={20} />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-slate-800 text-sm truncate">{transaction.description}</p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <Calendar size={12} className="text-slate-400" />
                                                <p className="text-[11px] font-medium text-slate-500 uppercase">
                                                    {(() => {
                                                        const cleanDate = transaction.date.split('T')[0].split(' ')[0];
                                                        const parts = cleanDate.split('-');
                                                        return parts.length === 3 ? `${parts[2]}/${parts[1]}` : transaction.date;
                                                    })()}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className={`font-black text-sm ${transaction.type === 'INCOME' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                {transaction.type === 'INCOME' ? '+' : '-'} R$ {transaction.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </p>
                                        </div>
                                    </div>
                                ))
                        ) : (
                            <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                                <Search size={40} className="mb-3 opacity-20" />
                                <p className="font-medium">Nenhuma transação no período</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Novos Gráficos: Entradas e Saídas por Categoria (Vindo do Fluxo de Caixa) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Gráfico de Entradas */}
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600">
                            <ArrowUpCircle size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-800">Origem de Entradas</h3>
                            <p className="text-sm text-slate-500">Distribuição por categoria</p>
                        </div>
                    </div>

                    <div className="h-[300px] w-full">
                        {categoryChartsData.incomeData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={categoryChartsData.incomeData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={100}
                                        paddingAngle={5}
                                        dataKey="value"
                                        animationDuration={1500}
                                    >
                                        {categoryChartsData.incomeData.map((entry, index) => (
                                            <Cell key={`cell-income-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        content={({ active, payload }) => {
                                            if (active && payload && payload.length) {
                                                const data = payload[0].payload;
                                                return (
                                                    <div className="bg-white p-4 rounded-2xl shadow-xl border border-slate-100">
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{data.name}</p>
                                                        <p className="text-sm font-black text-emerald-600">R$ {data.value.toLocaleString('pt-BR')}</p>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }}
                                    />
                                    <Legend verticalAlign="bottom" height={36} />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-full text-slate-400 font-medium italic">Nenhuma entrada no período</div>
                        )}
                    </div>
                </div>

                {/* Gráfico de Saídas */}
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="p-3 bg-rose-50 rounded-2xl text-rose-600">
                            <ArrowDownCircle size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-800">Destino de Saídas</h3>
                            <p className="text-sm text-slate-500">Distribuição por categoria</p>
                        </div>
                    </div>

                    <div className="h-[300px] w-full">
                        {categoryChartsData.expenseData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={categoryChartsData.expenseData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={100}
                                        paddingAngle={5}
                                        dataKey="value"
                                        animationDuration={1500}
                                    >
                                        {categoryChartsData.expenseData.map((entry, index) => (
                                            <Cell key={`cell-expense-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        content={({ active, payload }) => {
                                            if (active && payload && payload.length) {
                                                const data = payload[0].payload;
                                                return (
                                                    <div className="bg-white p-4 rounded-2xl shadow-xl border border-slate-100">
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{data.name}</p>
                                                        <p className="text-sm font-black text-rose-600">R$ {data.value.toLocaleString('pt-BR')}</p>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }}
                                    />
                                    <Legend verticalAlign="bottom" height={36} />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-full text-slate-400 font-medium italic">Nenhuma saída no período</div>
                        )}
                    </div>
                </div>
            </div>

            {/* Novo Gráfico: Gastos por Tags - Ampliado e Mais Organizado */}
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
                <div className="mb-8 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600 shadow-sm">
                            <Tags size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-800">Gastos por Etiquetas</h3>
                            <p className="text-sm text-slate-500">Análise automática de despesas por tag</p>
                        </div>
                    </div>
                    {tagsData.length > 0 && (
                        <div className="text-right">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Categorizado</p>
                            <p className="text-xl font-black text-indigo-600">
                                R$ {tagsData.reduce((acc, curr) => acc + curr.value, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                        </div>
                    )}
                </div>

                <div className="h-[350px] w-full">
                    {tagsData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={tagsData}
                                layout="vertical"
                                margin={{ top: 5, right: 120, left: 20, bottom: 5 }}
                                barSize={24}
                            >
                                <defs>
                                    <linearGradient id="tagGradient" x1="0" y1="0" x2="1" y2="0">
                                        <stop offset="0%" stopColor="#818cf8" />
                                        <stop offset="100%" stopColor="#4f46e5" />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} vertical={false} stroke="#f1f5f9" />
                                <XAxis type="number" hide />
                                <YAxis
                                    dataKey="name"
                                    type="category"
                                    width={120}
                                    style={{ fontSize: '12px', fontWeight: '900', fill: '#475569' }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <Tooltip
                                    cursor={{ fill: '#f8fafc', radius: 12 }}
                                    content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                            const data = payload[0].payload;
                                            return (
                                                <div className="bg-white p-4 rounded-2xl shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-200">
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{data.name}</p>
                                                    <p className="text-sm font-black text-indigo-600">
                                                        R$ {data.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                    </p>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                                <Bar
                                    dataKey="value"
                                    fill="url(#tagGradient)"
                                    radius={[0, 8, 8, 0]}
                                    animationDuration={1500}
                                    label={{
                                        position: 'right',
                                        formatter: (value: number) => `R$ ${value >= 1000 ? (value / 1000).toFixed(1) + 'k' : value.toFixed(0)}`,
                                        fill: '#64748b',
                                        fontSize: 11,
                                        fontWeight: 900,
                                        dx: 10
                                    }}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400 bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-200">
                            <div className="p-6 bg-white rounded-full shadow-sm mb-4">
                                <Tags size={56} className="opacity-20 text-indigo-600" />
                            </div>
                            <p className="text-xl font-black text-slate-800">Nenhuma tag detectada</p>
                            <p className="text-sm max-w-xs text-center mt-2 leading-relaxed text-slate-500">
                                Adicione etiquetas em suas despesas no Fluxo de Caixa para ativar este painel informativo.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

interface MetricCardProps {
    title: string;
    value: number;
    icon: React.ReactNode;
    iconBg: string;
    iconColor: string;
    trend?: string;
    trendPositive?: boolean;
    label?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, icon, iconBg, iconColor, trend, trendPositive, label }) => {
    return (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-start justify-between mb-3">
                <div className={`p-2.5 rounded-xl ${iconBg}`}>
                    <div className={iconColor}>{icon}</div>
                </div>
                {trend && (
                    <span className={`text-xs font-semibold px-2 py-1 rounded-md ${trendPositive ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                        {trend}
                    </span>
                )}
            </div>
            <p className="text-xs font-medium text-slate-500 mb-1">{title}</p>
            <p className="text-2xl font-bold text-slate-900 mb-1">
                {value >= 1000 ? `R$ ${(value / 1000).toFixed(1)} mil` : `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            </p>
            {label && (
                <p className="text-xs font-medium text-slate-400">{label}</p>
            )}
        </div>
    );
};

const DateFilterPill: React.FC<{ active: boolean, label: string, icon: React.ReactNode, onClick: () => void }> = ({ active, label, icon, onClick }) => (
    <button
        onClick={onClick}
        className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-[11px] font-black transition-all duration-300 ${active
            ? 'bg-white text-indigo-700 shadow-md shadow-indigo-100 scale-105 active:scale-95'
            : 'text-slate-500 hover:text-slate-900 hover:bg-white/70'
            }`}
    >
        <span className={active ? 'text-indigo-600' : 'text-slate-400'}>{icon}</span>
        <span className="uppercase tracking-widest">{label}</span>
    </button>
);

export default Dashboard;
