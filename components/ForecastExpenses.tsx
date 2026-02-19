import React, { useState } from 'react';
import { Plus, Trash2, Edit2, TrendingDown, Calendar, Search, MoreVertical, TrendingUp, Wallet } from 'lucide-react';
import { ForecastExpense, Transaction, Category } from '../types';
import { supabase } from '../lib/supabase';
import ConfirmModal from './ConfirmModal';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useMemo } from 'react';

interface ForecastExpensesProps {
    forecasts: ForecastExpense[];
    setForecasts: React.Dispatch<React.SetStateAction<ForecastExpense[]>>;
    transactions: Transaction[];
    categories: Category[];
}

const ForecastExpenses: React.FC<ForecastExpensesProps> = ({ forecasts, setForecasts, transactions, categories }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; ids: string[]; description: string }>({
        isOpen: false,
        ids: [],
        description: ''
    });
    const [formData, setFormData] = useState({
        description: '',
        amount: '',
        type: 'EXPENSE' as 'INCOME' | 'EXPENSE',
        recorrente: false,
        mes: new Date().toISOString().slice(0, 7),
        endMonth: new Date().toISOString().slice(0, 7),
        categoryId: '',
        subCategoryId: ''
    });

    const [searchTerm, setSearchTerm] = useState('');
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);

    // Dados para gráfico Previsto x Realizado
    const comparisonData = useMemo(() => {
        const monthsList = [];
        const now = new Date();
        for (let i = 0; i < 6; i++) { // Updated: Loop from current month forward
            const d = new Date(now.getFullYear(), now.getMonth() + i, 1); // Updated: Get months ahead
            monthsList.push({
                monthKey: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
                monthLabel: d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''),
                previsto: 0,
                realizado: 0
            });
        }

        monthsList.forEach(m => {
            // Realizado (Transactions)
            const transInMonth = transactions.filter(t => {
                const d = new Date(t.date);
                const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                return k === m.monthKey;
            });
            m.realizado = transInMonth.reduce((sum, t) => t.type === 'INCOME' ? sum + t.amount : sum - t.amount, 0);

            // Previsto (Forecasts)
            const forecastInMonth = forecasts.filter(f => {
                const monthKey = m.monthKey;
                const start = f.mes;
                const end = f.endMonth || f.mes;
                return monthKey >= start && monthKey <= end;
            });
            m.previsto = forecastInMonth.reduce((sum, f) => f.type === 'INCOME' ? sum + f.amount : sum - f.amount, 0);
        });

        return monthsList.map(m => {
            const variancia = m.realizado - m.previsto;
            const eficiencia = m.previsto !== 0 ? (m.realizado / m.previsto) * 100 : 0;
            return {
                name: m.monthLabel,
                'Previsto': m.previsto,
                'Realizado': m.realizado,
                variancia,
                eficiencia: Math.min(eficiencia, 200)
            };
        });
    }, [transactions, forecasts]);

    const handleEdit = (forecast: ForecastExpense) => {
        setEditingId(forecast.id);
        setFormData({
            description: forecast.description,
            amount: forecast.amount.toString(),
            type: forecast.type,
            recorrente: forecast.recorrente,
            mes: forecast.mes,
            endMonth: forecast.endMonth || '',
            categoryId: forecast.categoryId || '',
            subCategoryId: forecast.subCategoryId || ''
        });
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const forecastData = {
            descrição: formData.description,
            valor: parseFloat(formData.amount),
            entrada_saida: formData.type,
            'recorrente?': formData.recorrente ? 'sim' : 'nao',
            mes: formData.mes,
            fim_periodo: formData.endMonth || null,
            categoria: formData.categoryId || null,
            subcategoria: formData.subCategoryId || null
        };

        try {
            if (editingId) {
                const { data, error } = await supabase
                    .from('previsao_despesa')
                    .update(forecastData)
                    .eq('id', editingId)
                    .select();

                if (error) throw error;

                const updated: ForecastExpense = {
                    id: data[0].id,
                    description: data[0].descrição,
                    amount: data[0].valor,
                    type: data[0].entrada_saida as 'INCOME' | 'EXPENSE',
                    recorrente: data[0]['recorrente?'] === 'sim',
                    mes: data[0].mes,
                    endMonth: data[0].fim_periodo,
                    categoryId: data[0].categoria,
                    subCategoryId: data[0].subcategoria
                };
                setForecasts(prev => prev.map(f => f.id === editingId ? updated : f));
            } else {
                const { data, error } = await supabase
                    .from('previsao_despesa')
                    .insert([forecastData])
                    .select();

                if (error) throw error;

                const inserted: ForecastExpense = {
                    id: data[0].id,
                    description: data[0].descrição,
                    amount: data[0].valor,
                    type: data[0].entrada_saida as 'INCOME' | 'EXPENSE',
                    recorrente: data[0]['recorrente?'] === 'sim',
                    mes: data[0].mes,
                    endMonth: data[0].fim_periodo,
                    categoryId: data[0].categoria,
                    subCategoryId: data[0].subcategoria
                };
                setForecasts(prev => [inserted, ...prev]);
            }

            setIsModalOpen(false);
            setEditingId(null);
            setFormData({ description: '', amount: '', type: 'EXPENSE', recorrente: false, mes: `${selectedYear}-01`, endMonth: '', categoryId: '', subCategoryId: '' });
        } catch (error: any) {
            console.error("❌ Erro ao salvar:", error);
            alert(`Erro ao salvar: ${error.message || 'Erro desconhecido'}`);
        }
    };

    const handleDelete = async () => {
        try {
            for (const id of confirmDelete.ids) {
                const { error } = await supabase.from('previsao_despesa').delete().eq('id', id);
                if (error) throw error;
                setForecasts(prev => prev.filter(f => f.id !== id));
            }
            setConfirmDelete({ isOpen: false, ids: [], description: '' });
        } catch (error) {
            alert("Erro ao remover previsão.");
        }
    };

    // Filtrar pelo ano selecionado - Considerar o range
    const yearForecasts = forecasts.filter(f => {
        const startYear = parseInt(f.mes.split('-')[0]);
        const endYear = f.endMonth ? parseInt(f.endMonth.split('-')[0]) : startYear;
        return selectedYear >= startYear && selectedYear <= endYear;
    });

    // Agrupar por tipo, descrição e mês
    const groupedItems = yearForecasts.reduce((acc: any, forecast) => {
        const type = forecast.type || 'EXPENSE';
        if (!acc[type]) acc[type] = {};

        if (!acc[type][forecast.description]) {
            acc[type][forecast.description] = {
                description: forecast.description,
                id: forecast.id,
                type: type,
                months: {}
            };
        }

        const startMonth = forecast.mes;
        const endMonth = forecast.endMonth || forecast.mes;

        for (let m = 1; m <= 12; m++) {
            const currentMonthStr = `${selectedYear}-${String(m).padStart(2, '0')}`;
            if (currentMonthStr >= startMonth && currentMonthStr <= endMonth) {
                acc[type][forecast.description].months[m] = {
                    value: forecast.amount,
                    id: forecast.id,
                    recorrente: forecast.recorrente
                };
            }
        }
        return acc;
    }, { INCOME: {}, EXPENSE: {} });

    const incomeItems = Object.values(groupedItems.INCOME);
    const expenseItems = Object.values(groupedItems.EXPENSE);

    // Calcular totais por mês e tipo
    const monthlyIncomeTotals = Array(12).fill(0).map((_, index) => {
        const month = index + 1;
        const monthStr = `${selectedYear}-${String(month).padStart(2, '0')}`;
        return yearForecasts
            .filter(f => f.type === 'INCOME' && monthStr >= f.mes && monthStr <= (f.endMonth || f.mes))
            .reduce((sum, f) => sum + f.amount, 0);
    });

    const monthlyExpenseTotals = Array(12).fill(0).map((_, index) => {
        const month = index + 1;
        const monthStr = `${selectedYear}-${String(month).padStart(2, '0')}`;
        return yearForecasts
            .filter(f => (f.type === 'EXPENSE' || !f.type) && monthStr >= f.mes && monthStr <= (f.endMonth || f.mes))
            .reduce((sum, f) => sum + f.amount, 0);
    });

    const monthlyNetResults = monthlyIncomeTotals.map((income, i) => income - monthlyExpenseTotals[i]);

    const annualIncomeTotal = monthlyIncomeTotals.reduce((sum, val) => sum + val, 0);
    const annualExpenseTotal = monthlyExpenseTotals.reduce((sum, val) => sum + val, 0);
    const annualNetResult = annualIncomeTotal - annualExpenseTotal;

    // Anos disponíveis
    const availableYears = [...new Set(forecasts.map(f => parseInt(f.mes.split('-')[0])))].sort();
    if (availableYears.length === 0) {
        availableYears.push(new Date().getFullYear());
    }

    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

    const combinedItems = [...incomeItems, ...expenseItems];

    const filteredIncomeItems = (incomeItems as any[]).filter(item =>
        searchTerm === '' || item.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
    const filteredExpenseItems = (expenseItems as any[]).filter(item =>
        searchTerm === '' || item.description.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const renderRows = (items: any[], sectionTitle: string, icon: React.ReactNode, bgColor: string, dotColor: string, textColor: string) => (
        <>
            <tr className={`${bgColor} border-y border-slate-100`}>
                <td colSpan={15} className={`px-8 py-4 font-black ${textColor} text-[11px] uppercase tracking-widest flex items-center gap-3`}>
                    <div className={`p-1.5 rounded-lg bg-white shadow-sm ring-1 ring-slate-200/50`}>
                        {icon}
                    </div>
                    {sectionTitle}
                </td>
            </tr>
            {items.length > 0 ? (
                items.map((item: any) => {
                    const rowTotal = Number(Object.values(item.months).reduce((sum: number, m: any) => sum + (m.value || 0), 0));
                    return (
                        <tr key={`${item.type}-${item.description}`} className="hover:bg-slate-50/80 transition-all group border-b border-slate-50">
                            <td className="px-8 py-4 font-bold text-slate-700 sticky left-0 bg-white group-hover:bg-slate-50 transition-colors text-[13px] z-20 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.05)]">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-1.5 h-1.5 rounded-full ${dotColor} shadow-sm`}></div>
                                        <span className="truncate max-w-[180px]">{item.description}</span>
                                    </div>
                                    <button
                                        onClick={(e) => {
                                            const rect = e.currentTarget.getBoundingClientRect();
                                            setMenuPosition({
                                                top: rect.bottom + 4,
                                                left: rect.left - 130
                                            });
                                            setOpenMenuId(item.id);
                                        }}
                                        className="p-1 text-slate-300 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                    >
                                        <MoreVertical size={14} />
                                    </button>
                                </div>
                            </td>
                            {months.map((_, index) => {
                                const monthData = item.months[index + 1];
                                return (
                                    <td key={index} className="px-4 py-4 text-right text-slate-500 text-[12px] font-medium tabular-nums">
                                        {monthData ? (
                                            <span className={monthData.recorrente ? 'font-bold text-slate-900 bg-blue-50/50 px-2 py-1 rounded-md' : ''}>
                                                {monthData.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </span>
                                        ) : (
                                            <span className="text-slate-200">···</span>
                                        )}
                                    </td>
                                );
                            })}
                            <td className="px-8 py-4 text-right font-black text-slate-900 bg-slate-50/50 text-[12px] tabular-nums border-x border-slate-100/50">
                                {rowTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-4 py-4 text-center">
                                <div className="opacity-0 group-hover:opacity-100 flex justify-center gap-1">
                                    <button
                                        onClick={() => {
                                            const firstMonth = Object.keys(item.months)[0];
                                            const forecast = yearForecasts.find(f =>
                                                f.description === item.description &&
                                                f.type === item.type &&
                                                parseInt(f.mes.split('-')[1]) === parseInt(firstMonth)
                                            );
                                            if (forecast) handleEdit(forecast);
                                        }}
                                        className="text-gray-600 hover:bg-gray-100 p-1.5 rounded"
                                    >
                                        <Edit2 size={14} />
                                    </button>
                                    <button
                                        onClick={() => {
                                            const ids = Object.values(item.months).map((m: any) => m.id);
                                            setConfirmDelete({
                                                isOpen: true,
                                                ids,
                                                description: item.description
                                            });
                                        }}
                                        className="text-red-600 hover:bg-red-50 p-1.5 rounded"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    );
                })
            ) : (
                <tr>
                    <td colSpan={15} className="px-6 py-8 text-center text-gray-400 text-sm">
                        Nenhum item em {sectionTitle} para {selectedYear}
                    </td>
                </tr>
            )}
        </>
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900">Previsão e DRE de Caixa</h1>
                <div className="flex gap-3">
                    <div className="relative w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar no DRE..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                        className="px-4 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-gray-700"
                    >
                        {availableYears.map(year => (
                            <option key={year} value={year}>{year}</option>
                        ))}
                    </select>
                    <button
                        onClick={() => {
                            const currentMonth = new Date().toISOString().slice(0, 7);
                            setEditingId(null);
                            setFormData({ description: '', amount: '', type: 'INCOME', recorrente: false, mes: currentMonth, endMonth: currentMonth, categoryId: '', subCategoryId: '' });
                            setIsModalOpen(true);
                        }}
                        className="flex items-center gap-2 px-5 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all font-bold shadow-lg shadow-emerald-100"
                    >
                        <Plus size={18} />
                        Nova Receita
                    </button>
                    <button
                        onClick={() => {
                            const currentMonth = new Date().toISOString().slice(0, 7);
                            setEditingId(null);
                            setFormData({ description: '', amount: '', type: 'EXPENSE', recorrente: false, mes: currentMonth, endMonth: currentMonth, categoryId: '', subCategoryId: '' });
                            setIsModalOpen(true);
                        }}
                        className="flex items-center gap-2 px-5 py-2 bg-rose-600 text-white rounded-xl hover:bg-rose-700 transition-all font-bold shadow-lg shadow-rose-100"
                    >
                        <Plus size={18} />
                        Nova Despesa
                    </button>
                </div>
            </div>

            {/* Sumário do DRE Anual */}
            <div className="mb-12">
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
                    <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-100">
                                <TrendingUp size={24} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-slate-800">Performance: Previsto x Realizado</h3>
                                <p className="text-sm text-slate-500 font-medium">Análise de aderência ao planejamento financeiro</p>
                            </div>
                        </div>
                    </div>

                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={comparisonData} margin={{ top: 20, right: 30, left: 10, bottom: 5 }} barGap={12}>
                                <defs>
                                    <linearGradient id="barGradientPrevisto" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#fcd34d" stopOpacity={0.8} />
                                        <stop offset="100%" stopColor="#f59e0b" stopOpacity={1} />
                                    </linearGradient>
                                    <linearGradient id="barGradientRealizado" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#818cf8" stopOpacity={1} />
                                        <stop offset="100%" stopColor="#4f46e5" stopOpacity={1} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis
                                    dataKey="name"
                                    axisLine={false}
                                    tickLine={false}
                                    style={{ fontSize: '13px', fontWeight: '800', fill: '#1e293b' }}
                                    dy={15}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    style={{ fontSize: '11px', fontWeight: '700', fill: '#94a3b8' }}
                                    tickFormatter={(value) => `R$${(value / 1000).toFixed(0)}k`}
                                />
                                <Tooltip
                                    cursor={{ fill: '#f8fafc', radius: 12 }}
                                    content={({ active, payload, label }) => {
                                        if (active && payload && payload.length) {
                                            const data = payload[0].payload;
                                            return (
                                                <div className="bg-white p-6 rounded-2xl shadow-2xl border border-slate-100 min-w-[220px] animate-in fade-in zoom-in duration-200">
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">{label} - Resumo Performance</p>

                                                    <div className="space-y-3">
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-xs font-bold text-slate-500">Planejado:</span>
                                                            <span className="text-sm font-black text-slate-700">R$ {data.Previsto.toLocaleString('pt-BR')}</span>
                                                        </div>
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-xs font-bold text-slate-500">Executado:</span>
                                                            <span className="text-sm font-black text-indigo-600">R$ {data.Realizado.toLocaleString('pt-BR')}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                                <Legend
                                    verticalAlign="top"
                                    align="right"
                                    iconType="rect"
                                    wrapperStyle={{ paddingBottom: '30px', fontSize: '12px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em' }}
                                />
                                <Bar
                                    dataKey="Previsto"
                                    fill="url(#barGradientPrevisto)"
                                    radius={[10, 10, 0, 0]}
                                    barSize={28}
                                    animationDuration={1800}
                                    animationBegin={200}
                                />
                                <Bar
                                    dataKey="Realizado"
                                    fill="url(#barGradientRealizado)"
                                    radius={[10, 10, 0, 0]}
                                    barSize={28}
                                    animationDuration={1800}
                                    animationBegin={400}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Receita Projetada {selectedYear}</span>
                        <div className="p-2 bg-emerald-50 rounded-xl">
                            <TrendingUp size={16} className="text-emerald-600" />
                        </div>
                    </div>
                    <p className="text-2xl font-black text-slate-900">
                        R$ {Number(annualIncomeTotal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Despesa Projetada {selectedYear}</span>
                        <div className="p-2 bg-rose-50 rounded-xl">
                            <TrendingDown size={16} className="text-rose-600" />
                        </div>
                    </div>
                    <p className="text-2xl font-black text-slate-900">
                        R$ {Number(annualExpenseTotal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                </div>
                <div className={`p-6 rounded-3xl border shadow-sm transition-all hover:shadow-lg ${annualNetResult >= 0 ? 'bg-slate-900 border-slate-800' : 'bg-rose-900 border-rose-800'}`}>
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-black text-slate-300 uppercase tracking-widest">Resultado Final {selectedYear}</span>
                        <div className={`p-2 rounded-xl ${annualNetResult >= 0 ? 'bg-emerald-500/10' : 'bg-white/10'}`}>
                            {annualNetResult >= 0 ? <TrendingUp size={16} className="text-emerald-400" /> : <TrendingDown size={16} className="text-rose-400" />}
                        </div>
                    </div>
                    <p className="text-2xl font-black text-white">
                        R$ {Number(annualNetResult).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">
                        {annualNetResult >= 0 ? 'Lucro Projetado' : 'Prejuízo Projetado'}
                    </p>
                </div>
            </div>

            {/* DRE Anual - Tabela */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="bg-slate-900 px-8 py-5 flex justify-between items-center">
                    <h2 className="text-lg font-black text-white">
                        DRE Projetado - Fluxo de Caixa {selectedYear}
                    </h2>
                    <div className="flex items-center gap-6">
                        <div className="text-right">
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Resultado Anual</p>
                            <p className={`text-xl font-black ${annualNetResult >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                R$ {annualNetResult.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto overflow-y-visible">
                    <table className="w-full scrollbar-thin scrollbar-thumb-slate-200">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                                <th className="px-8 py-5 text-left text-[11px] font-black text-slate-500 uppercase tracking-widest sticky left-0 bg-slate-50 z-10 min-w-[280px]">
                                    Descrição da Conta
                                </th>
                                {months.map((month, index) => (
                                    <th key={index} className="px-4 py-5 text-right text-[11px] font-black text-slate-500 uppercase min-w-[100px]">
                                        {month}
                                    </th>
                                ))}
                                <th className="px-8 py-5 text-right text-[11px] font-black text-slate-900 uppercase bg-slate-100 min-w-[130px]">
                                    Total Anual
                                </th>
                                <th className="px-4 py-5 text-center text-[11px] font-black text-slate-500 uppercase min-w-[90px]">
                                    Ações
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {/* Seção de Receitas */}
                            {renderRows(filteredIncomeItems, "Receitas & Entradas de Caixa", <TrendingUp size={14} className="text-emerald-500" />, "bg-emerald-50/30", "bg-emerald-400", "text-emerald-800")}

                            {/* Total de Receitas */}
                            <tr className="bg-emerald-50/20 font-black border-y border-emerald-100/50 group">
                                <td className="px-8 py-5 text-emerald-800 sticky left-0 bg-emerald-50/20 text-[11px] uppercase tracking-widest z-20 shadow-[4px_0_8px_-4px_rgba(16,185,129,0.1)]">
                                    Total de Entradas
                                </td>
                                {monthlyIncomeTotals.map((total, index) => (
                                    <td key={index} className="px-4 py-5 text-right text-emerald-700 text-[12px] tabular-nums font-bold">
                                        {total > 0 ? total.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '—'}
                                    </td>
                                ))}
                                <td className="px-8 py-5 text-right text-emerald-900 bg-emerald-100/30 font-black text-[13px] tabular-nums border-x border-emerald-200/20">
                                    {annualIncomeTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="bg-emerald-50/20 text-center">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mx-auto opacity-20"></div>
                                </td>
                            </tr>

                            {/* Espaçamento sutil */}
                            <tr className="h-4 bg-slate-50/30"></tr>

                            {/* Seção de Despesas */}
                            {renderRows(filteredExpenseItems, "Despesas & Projetos de Saída", <TrendingDown size={14} className="text-rose-500" />, "bg-rose-50/30", "bg-rose-400", "text-rose-800")}

                            {/* Total de Despesas */}
                            <tr className="bg-rose-50/20 font-black border-y border-rose-100/50 group">
                                <td className="px-8 py-5 text-rose-800 sticky left-0 bg-rose-50/20 text-[11px] uppercase tracking-widest z-20 shadow-[4px_0_8px_-4px_rgba(244,63,94,0.1)]">
                                    Total de Saídas
                                </td>
                                {monthlyExpenseTotals.map((total, index) => (
                                    <td key={index} className="px-4 py-5 text-right text-rose-700 text-[12px] tabular-nums font-bold">
                                        {total > 0 ? total.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '—'}
                                    </td>
                                ))}
                                <td className="px-8 py-5 text-right text-rose-900 bg-rose-100/30 font-black text-[13px] tabular-nums border-x border-rose-200/20">
                                    {annualExpenseTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="bg-rose-50/20 text-center">
                                    <div className="w-1.5 h-1.5 rounded-full bg-rose-400 mx-auto opacity-20"></div>
                                </td>
                            </tr>

                            {/* RESULTADO FINAL (LUCRO/PREJUÍZO) */}
                            <tr className="bg-slate-900 text-white font-black border-t-2 border-slate-800">
                                <td className="px-8 py-7 sticky left-0 bg-slate-900 text-[12px] uppercase tracking-[0.2em] z-30 flex items-center gap-4">
                                    <div className={`p-2 rounded-xl ${annualNetResult >= 0 ? 'bg-emerald-500/20' : 'bg-rose-500/20'}`}>
                                        <TrendingUp size={18} className={annualNetResult >= 0 ? 'text-emerald-400' : 'text-rose-400'} />
                                    </div>
                                    Resultado Líquido
                                </td>
                                {monthlyNetResults.map((result, index) => (
                                    <td key={index} className={`px-4 py-7 text-right text-[13px] tabular-nums ${result >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                        {result.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </td>
                                ))}
                                <td className={`px-8 py-7 text-right bg-black font-black text-[15px] tabular-nums border-l border-slate-800 ${annualNetResult >= 0 ? 'text-emerald-400 font-black' : 'text-rose-400'}`}>
                                    {annualNetResult.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="bg-slate-900"></td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div className="px-8 py-4 bg-slate-50 border-t border-slate-100">
                    <div className="flex items-center gap-4 text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                        <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 bg-slate-300 rounded"></div>
                            <span>Itens Recorrentes destacados</span>
                        </div>
                        <div className="flex items-center gap-2 ml-auto">
                            <span className="text-slate-400">Total de itens:</span>
                            <span className="bg-slate-900 text-white px-2 py-0.5 rounded text-[10px] font-black">{combinedItems.length}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl p-8 animate-in fade-in zoom-in duration-200 max-h-[95vh] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-2xl font-black text-slate-900">
                                {editingId ? 'Editar Lançamento' : 'Novo Lançamento'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <Plus size={24} className="rotate-45" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl mb-4">
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, type: 'EXPENSE' })}
                                    className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${formData.type === 'EXPENSE' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    Saída (Despesa)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, type: 'INCOME' })}
                                    className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${formData.type === 'INCOME' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    Entrada (Receita)
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="md:col-span-2">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Descrição</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.description}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                        className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-slate-900 font-bold text-slate-800"
                                        placeholder="Ex: Aluguel, Vendas, Salários"
                                    />
                                </div>
                                <div className="md:col-span-1">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Valor (R$)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        required
                                        value={formData.amount}
                                        onChange={e => setFormData({ ...formData, amount: e.target.value })}
                                        className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-slate-900 font-bold text-slate-800"
                                        placeholder="0,00"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Mês Início</label>
                                    <input
                                        type="month"
                                        required
                                        value={formData.mes}
                                        onChange={e => {
                                            const newMes = e.target.value;
                                            setFormData(prev => {
                                                // Se o mês fim era igual ao mês início anterior, atualiza ele também
                                                if (prev.endMonth === prev.mes || !prev.endMonth) {
                                                    return { ...prev, mes: newMes, endMonth: newMes };
                                                }
                                                return { ...prev, mes: newMes };
                                            });
                                        }}
                                        className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-slate-900 font-bold text-slate-800"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Mês Fim</label>
                                    <input
                                        type="month"
                                        required
                                        value={formData.endMonth}
                                        onChange={e => setFormData({ ...formData, endMonth: e.target.value })}
                                        className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-slate-900 font-bold text-slate-800"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Categoria</label>
                                    <select
                                        required
                                        value={formData.categoryId}
                                        onChange={e => setFormData({ ...formData, categoryId: e.target.value, subCategoryId: '' })}
                                        className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-slate-900 font-bold text-slate-800"
                                    >
                                        <option value="">Selecione...</option>
                                        {categories.filter(c => c.type === formData.type).map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Subcategoria</label>
                                    <select
                                        value={formData.subCategoryId}
                                        onChange={e => setFormData({ ...formData, subCategoryId: e.target.value })}
                                        className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-slate-900 font-bold text-slate-800"
                                        disabled={!formData.categoryId || !categories.find(c => String(c.id) === String(formData.categoryId))?.subCategories?.length}
                                    >
                                        <option value="">Nenhuma</option>
                                        {categories.find(c => String(c.id) === String(formData.categoryId))?.subCategories?.map(sub => (
                                            <option key={sub.id} value={sub.id}>{sub.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="flex items-center p-4 bg-slate-50 rounded-2xl">
                                <input
                                    type="checkbox"
                                    id="recorrente"
                                    checked={formData.recorrente}
                                    onChange={e => setFormData({ ...formData, recorrente: e.target.checked })}
                                    className="w-5 h-5 text-slate-900 border-slate-300 rounded-lg focus:ring-slate-900"
                                />
                                <label htmlFor="recorrente" className="ml-3 text-sm font-bold text-slate-700">
                                    Lançamento recorrente
                                </label>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsModalOpen(false);
                                        setEditingId(null);
                                        setFormData({ description: '', amount: '', type: 'EXPENSE', recorrente: false, mes: new Date().toISOString().slice(0, 7), endMonth: '', categoryId: '', subCategoryId: '' });
                                    }}
                                    className="flex-1 py-4 text-slate-500 font-bold hover:bg-slate-50 rounded-2xl transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-4 bg-slate-900 text-white font-black rounded-2xl hover:bg-slate-800 transition-all shadow-xl shadow-slate-200"
                                >
                                    {editingId ? 'Atualizar' : 'Salvar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal de Confirmação */}
            <ConfirmModal
                isOpen={confirmDelete.isOpen}
                title="Excluir Previsões"
                message={`Tem certeza que deseja excluir todas as previsões de "${confirmDelete.description}"? Esta ação não pode ser desfeita.`}
                confirmText="Excluir"
                cancelText="Cancelar"
                onConfirm={handleDelete}
                onCancel={() => setConfirmDelete({ isOpen: false, ids: [], description: '' })}
            />

            {/* Menu Dropdown com posicionamento fixo */}
            {openMenuId && menuPosition && (
                <>
                    {/* Overlay para fechar o menu ao clicar fora */}
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => {
                            setOpenMenuId(null);
                            setMenuPosition(null);
                        }}
                    />
                    {/* Menu dropdown */}
                    <div
                        className="fixed bg-white border border-gray-200 rounded-lg shadow-xl z-50 min-w-[150px]"
                        style={{
                            top: `${menuPosition.top}px`,
                            left: `${menuPosition.left}px`
                        }}
                    >
                        <button
                            onClick={() => {
                                const item = combinedItems.find((i: any) => i.id === openMenuId) as any;
                                if (item) {
                                    const firstMonth = Object.keys(item.months)[0];
                                    const forecast = yearForecasts.find(f =>
                                        f.description === item.description &&
                                        f.type === item.type &&
                                        parseInt(f.mes.split('-')[1]) === parseInt(firstMonth)
                                    );
                                    if (forecast) handleEdit(forecast);
                                }
                                setOpenMenuId(null);
                                setMenuPosition(null);
                            }}
                            className="w-full px-4 py-3 text-left text-sm font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-3 rounded-xl transition-all"
                        >
                            <Edit2 size={16} />
                            Editar Tudo
                        </button>
                        <button
                            onClick={() => {
                                const item = combinedItems.find((i: any) => i.id === openMenuId) as any;
                                if (item) {
                                    const ids = Object.values(item.months).map((m: any) => m.id);
                                    setConfirmDelete({
                                        isOpen: true,
                                        ids,
                                        description: item.description
                                    });
                                }
                                setOpenMenuId(null);
                                setMenuPosition(null);
                            }}
                            className="w-full px-4 py-3 text-left text-sm font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-3 rounded-xl transition-all"
                        >
                            <Trash2 size={16} />
                            Excluir Tudo
                        </button>
                    </div>
                </>
            )}
        </div>
    );
};

export default ForecastExpenses;
