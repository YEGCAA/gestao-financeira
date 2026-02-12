
import React, { useState } from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area
} from 'recharts';
import { TrendingUp, TrendingDown, Wallet, BarChart3, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { Transaction, Investment, Bill } from '../types';

// Função auxiliar para formatar datas sem problemas de timezone
const formatDateBR = (dateString: string): string => {
    if (!dateString) return '';
    // Extrair apenas a parte da data (YYYY-MM-DD) ignorando hora e timezone
    const datePart = dateString.split('T')[0];
    const [year, month, day] = datePart.split('-');
    return `${day}/${month}/${year}`;
};

interface DashboardProps {
    transactions: Transaction[];
    investments: Investment[];
    bills: Bill[];
}

const Dashboard: React.FC<DashboardProps> = ({ transactions, investments, bills }) => {
    // Filtrar transações para excluir investimentos do fluxo de caixa (consistente com Transactions.tsx)
    const filteredTransactions = transactions.filter(t => !t.description.includes('[INVESTIMENTO]'));

    const totalIncome = filteredTransactions.filter(t => t.type === 'INCOME').reduce((acc, t) => acc + t.amount, 0);
    const totalExpense = filteredTransactions.filter(t => t.type === 'EXPENSE').reduce((acc, t) => acc + t.amount, 0);
    const netBalance = totalIncome - totalExpense;

    // Calcular investimentos corretamente (entradas - saídas)
    const investmentIncome = investments.filter(inv => inv.type === 'INCOME').reduce((acc, inv) => acc + inv.amount, 0);
    const investmentExpense = investments.filter(inv => inv.type === 'EXPENSE').reduce((acc, inv) => acc + inv.amount, 0);
    const investmentBalance = investmentIncome - investmentExpense;

    // Calcular contas a pagar e receber
    const contasAReceber = bills.reduce((acc, bill) => acc + bill.entrada, 0);
    const contasAPagar = bills.reduce((acc, bill) => acc + bill.saida, 0);

    // Agrupar transações por mês para o gráfico
    const monthlyData = filteredTransactions.reduce((acc: any[], transaction) => {
        const date = new Date(transaction.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const monthName = date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });

        let existing = acc.find(item => item.month === monthKey);
        if (!existing) {
            existing = { month: monthKey, name: monthName, income: 0, expense: 0 };
            acc.push(existing);
        }

        if (transaction.type === 'INCOME') {
            existing.income += transaction.amount;
        } else {
            existing.expense += transaction.amount;
        }

        return acc;
    }, []);

    // Ordenar por mês e pegar os últimos 4
    const sortedMonthlyData = monthlyData
        .sort((a, b) => a.month.localeCompare(b.month))
        .slice(-4);

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <SummaryCard
                    title="Saldo Atual"
                    value={netBalance}
                    icon={<Wallet size={16} className="text-blue-500" />}
                    trend="+12%"
                    trendPositive={true}
                    iconBg="bg-blue-50"
                />
                <SummaryCard
                    title="Entradas (Mês)"
                    value={totalIncome}
                    icon={<ArrowUpCircle size={16} className="text-emerald-500" />}
                    trend="+5%"
                    trendPositive={true}
                    iconBg="bg-emerald-50"
                />
                <SummaryCard
                    title="Saídas (Mês)"
                    value={totalExpense}
                    icon={<ArrowDownCircle size={16} className="text-rose-500" />}
                    trend="+2%"
                    trendPositive={false}
                    iconBg="bg-rose-50"
                />
                <SummaryCard
                    title="Contas a Receber"
                    value={contasAReceber}
                    icon={<TrendingUp size={16} className="text-green-600" />}
                    trend="A Receber"
                    trendPositive={true}
                    iconBg="bg-green-50"
                />
                <SummaryCard
                    title="Contas a Pagar"
                    value={contasAPagar}
                    icon={<TrendingDown size={16} className="text-orange-600" />}
                    trend="A Pagar"
                    trendPositive={false}
                    iconBg="bg-orange-50"
                />
            </div>


            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Main Chart */}
                <div className="bg-white p-5 rounded-xl border border-gray-200 hover-lift">
                    <h3 className="text-sm font-semibold text-gray-800 mb-4">Fluxo de Caixa (Últimos Meses)</h3>
                    <div className="h-[280px]">
                        {sortedMonthlyData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={sortedMonthlyData}>
                                    <defs>
                                        <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                    <XAxis
                                        dataKey="name"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#9ca3af', fontSize: 12 }}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#9ca3af', fontSize: 12 }}
                                        tickFormatter={(value) => `R$${(value / 1000).toFixed(0)}k`}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            borderRadius: '8px',
                                            border: '1px solid #e5e7eb',
                                            boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                                            fontSize: '12px'
                                        }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="income"
                                        stroke="#10b981"
                                        strokeWidth={2}
                                        fillOpacity={1}
                                        fill="url(#colorIncome)"
                                        name="Receitas"
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="expense"
                                        stroke="#ef4444"
                                        strokeWidth={2}
                                        fillOpacity={1}
                                        fill="url(#colorExpense)"
                                        name="Despesas"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-full text-gray-400">
                                <p>Nenhuma transação registrada</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Últimas Movimentações */}
                <div className="bg-white p-5 rounded-xl border border-gray-200 hover-lift">
                    <h3 className="text-sm font-semibold text-gray-800 mb-4">Últimas Movimentações</h3>
                    <div className="space-y-3">
                        {filteredTransactions
                            .sort((a, b) => {
                                // Ordenar por data (mais recente primeiro)
                                const dateA = new Date(a.date).getTime();
                                const dateB = new Date(b.date).getTime();
                                return dateB - dateA;
                            })
                            .slice(0, 4)
                            .map((transaction, index) => (
                                <TransactionItem
                                    key={index}
                                    name={transaction.description}
                                    date={formatDateBR(transaction.date)}
                                    category={transaction.categoryId || 'Geral'}
                                    amount={transaction.amount}
                                    type={transaction.type === 'INCOME' ? 'income' : 'expense'}
                                />
                            ))}
                        {filteredTransactions.length === 0 && (
                            <p className="text-sm text-gray-400 text-center py-8">Nenhuma transação registrada</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};



// Função para resumir valores
const formatValue = (value: number): string => {
    const absValue = Math.abs(value);

    if (absValue >= 1000000) {
        return (value / 1000000).toFixed(2).replace('.', ',') + ' Mi';
    } else if (absValue >= 1000) {
        return (value / 1000).toFixed(1).replace('.', ',') + ' mil';
    }
    return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const SummaryCard: React.FC<{
    title: string,
    value: number,
    icon: React.ReactNode,
    trend: string,
    trendPositive: boolean | null,
    iconBg: string
}> = ({ title, value, icon, trend, trendPositive, iconBg }) => {
    const [showModal, setShowModal] = useState(false);

    return (
        <>
            <div
                className="bg-white p-4 rounded-xl border border-gray-200 cursor-pointer transition-all hover:shadow-md"
                onClick={() => setShowModal(true)}
                title="Clique para ver detalhes"
            >
                <div className="flex items-start justify-between mb-3">
                    <div className={`${iconBg} p-2 rounded-lg`}>
                        {icon}
                    </div>
                    {trendPositive !== null && (
                        <span className={`text-xs font-medium ${trendPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {trend}
                        </span>
                    )}
                    {trendPositive === null && (
                        <span className="text-xs font-medium text-gray-500">{trend}</span>
                    )}
                </div>
                <div>
                    <p className="text-xs text-gray-500 mb-1">{title}</p>
                    <h4 className="text-2xl font-bold text-gray-900">
                        R$ {formatValue(value)}
                    </h4>
                </div>
            </div>

            {/* Modal em tela cheia */}
            {showModal && (
                <div
                    className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in"
                    onClick={() => setShowModal(false)}
                >
                    <div
                        className="bg-white rounded-3xl p-12 max-w-2xl w-full shadow-2xl animate-in zoom-in"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="text-center">
                            <div className={`${iconBg} p-6 rounded-2xl inline-block mb-6`}>
                                {React.cloneElement(icon as React.ReactElement, { size: 48 })}
                            </div>
                            <h2 className="text-2xl font-bold text-gray-700 mb-2">{title}</h2>
                            <h1 className="text-6xl font-bold text-gray-900 mb-4">
                                R$ {value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </h1>
                            {trendPositive !== null && (
                                <p className={`text-lg font-medium ${trendPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {trend}
                                </p>
                            )}
                            <button
                                onClick={() => setShowModal(false)}
                                className="mt-8 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};



const TransactionItem: React.FC<{
    name: string,
    date: string,
    category: string,
    amount: number,
    type: 'income' | 'expense'
}> = ({ name, date, category, amount, type }) => (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
        <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${type === 'income' ? 'bg-emerald-50' : 'bg-rose-50'}`}>
                {type === 'income' ? (
                    <ArrowUpCircle size={14} className="text-emerald-500" />
                ) : (
                    <ArrowDownCircle size={14} className="text-rose-500" />
                )}
            </div>
            <div>
                <p className="text-sm font-medium text-gray-900">{name}</p>
                <p className="text-xs text-gray-500">{date} • {category}</p>
            </div>
        </div>
        <p className={`text-sm font-bold ${type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
            R$ {amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </p>
    </div>
);

export default Dashboard;
