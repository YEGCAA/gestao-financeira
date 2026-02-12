
import React, { useState } from 'react';
import { Plus, Trash2, Edit2, TrendingDown, Calendar, Search, MoreVertical, X } from 'lucide-react';
import { ForecastExpense } from '../types';
import { supabase } from '../lib/supabase';
import ConfirmDialog from './ConfirmDialog';

interface ForecastExpensesProps {
    forecasts: ForecastExpense[];
    setForecasts: React.Dispatch<React.SetStateAction<ForecastExpense[]>>;
}

const ForecastExpenses: React.FC<ForecastExpensesProps> = ({ forecasts, setForecasts }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; forecastId: string | null }>({ isOpen: false, forecastId: null });
    const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
    const [formData, setFormData] = useState({
        description: '',
        amount: '',
        recorrente: false,
        mes: new Date().toISOString().slice(0, 7)
    });

    const [activePopover, setActivePopover] = useState<{ id: string, x: number, y: number } | null>(null);

    const [searchTerm, setSearchTerm] = useState('');

    const handleEdit = (forecast: ForecastExpense) => {
        setEditingId(forecast.id);
        setFormData({
            description: forecast.description,
            amount: forecast.amount.toString(),
            recorrente: forecast.recorrente,
            mes: forecast.mes
        });
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const forecastData = {
            descrição: formData.description,
            valor: parseFloat(formData.amount),
            'recorrente?': formData.recorrente ? 'sim' : 'nao',
            mes: formData.mes
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
                    recorrente: data[0]['recorrente?'] === 'sim',
                    mes: data[0].mes
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
                    recorrente: data[0]['recorrente?'] === 'sim',
                    mes: data[0].mes
                };
                setForecasts(prev => [inserted, ...prev]);
            }

            setIsModalOpen(false);
            setEditingId(null);
            setFormData({ description: '', amount: '', recorrente: false, mes: new Date().toISOString().slice(0, 7) });
        } catch (error: any) {
            console.error("❌ Erro ao salvar:", error);
            alert(`Erro ao salvar: ${error.message || 'Erro desconhecido'}`);
        }
    };

    const handleDelete = async (id: string) => {
        setDeleteConfirm({ isOpen: true, forecastId: id });
    };

    const confirmDelete = async () => {
        if (!deleteConfirm.forecastId) return;

        try {
            const { error } = await supabase.from('previsao_despesa').delete().eq('id', deleteConfirm.forecastId);
            if (error) throw error;
            setForecasts(prev => prev.filter(f => f.id !== deleteConfirm.forecastId));
        } catch (error) {
            alert("Erro ao remover previsão.");
        }
    };

    // Filtrar pelo ano selecionado
    const yearForecasts = forecasts.filter(f => f.mes.startsWith(selectedYear.toString()));

    // Listar itens individuais sem agrupar por descrição (para não "tocar" um no outro)
    let displayItems = yearForecasts.map(f => ({
        description: f.description,
        id: f.id,
        amount: f.amount,
        recorrente: f.recorrente,
        month: parseInt(f.mes.split('-')[1])
    }));

    // Filtrar por termo de busca
    if (searchTerm) {
        const search = searchTerm.toLowerCase();
        displayItems = displayItems.filter(item => {
            const description = item.description.toLowerCase();
            const monthNames = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
                'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
            const monthName = monthNames[item.month - 1];

            return description.includes(search) || monthName.includes(search);
        });
    }

    // Ordenar por mês e depois por descrição
    displayItems.sort((a, b) => a.month - b.month || a.description.localeCompare(b.description));

    // Calcular totais por mês
    const monthlyTotals = Array(12).fill(0).map((_, index) => {
        const month = index + 1;
        return yearForecasts
            .filter(f => parseInt(f.mes.split('-')[1]) === month)
            .reduce((sum, f) => sum + f.amount, 0);
    });

    const annualTotal = monthlyTotals.reduce((sum, val) => sum + val, 0);

    // Anos disponíveis
    const availableYears = [...new Set(forecasts.map(f => parseInt(f.mes.split('-')[0])))].sort();
    if (availableYears.length === 0) {
        availableYears.push(new Date().getFullYear());
    }

    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

    const handleCellClick = (e: React.MouseEvent, id: string) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setActivePopover({
            id,
            x: rect.left + window.scrollX,
            y: rect.top + window.scrollY
        });
    };

    return (
        <div className="space-y-6">
            {/* Header Section */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
                        <div className="p-2 bg-indigo-100 rounded-xl">
                            <Calendar className="text-indigo-600" size={24} />
                        </div>
                        PREVISÃO DE GASTOS
                    </h1>
                    <p className="text-slate-500 text-sm mt-1 font-medium">Gestão e Planejamento do Resultado Anual (DRE)</p>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                    <div className="relative flex-1 lg:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar despesa ou mês..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm shadow-sm"
                        />
                    </div>

                    <div className="flex items-center gap-2 bg-white border border-slate-200 p-1 rounded-xl shadow-sm">
                        {availableYears.map(year => (
                            <button
                                key={year}
                                onClick={() => setSelectedYear(year)}
                                className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${selectedYear === year
                                    ? 'bg-indigo-600 text-white shadow-md'
                                    : 'text-slate-500 hover:bg-slate-50'
                                    }`}
                            >
                                {year}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setBulkDeleteConfirm(true)}
                            className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all border border-transparent hover:border-red-100"
                            title="Limpar Ano"
                        >
                            <Trash2 size={20} />
                        </button>
                        <button
                            onClick={() => {
                                setEditingId(null);
                                setFormData({ description: '', amount: '', recorrente: false, mes: `${selectedYear}-01` });
                                setIsModalOpen(true);
                            }}
                            className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all font-bold shadow-lg shadow-slate-200"
                        >
                            <Plus size={18} />
                            Novo Lançamento
                        </button>
                    </div>
                </div>
            </div>

            {/* Total Cards Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Previsto no Ano</p>
                    <p className="text-3xl font-black text-slate-900">
                        R$ {annualTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Média Mensal</p>
                        <p className="text-2xl font-black text-indigo-600">
                            R$ {(annualTotal / 12).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                    </div>
                    <TrendingDown className="text-indigo-200" size={32} />
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Categorias Ativas</p>
                    <p className="text-2xl font-black text-slate-700">
                        {new Set(displayItems.map(i => i.description)).size} <span className="text-sm font-bold text-slate-400">ítens</span>
                    </p>
                </div>
            </div>

            {/* Combined Table Card */}
            <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xl shadow-slate-100/50">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50">
                                <th className="px-8 py-6 text-left font-black text-slate-400 sticky left-0 bg-slate-50 z-20 min-w-[280px] border-b border-slate-200 uppercase tracking-widest text-[9px]">
                                    Categoria da Despesa
                                </th>
                                {months.map((month, index) => (
                                    <th key={index} className="px-4 py-6 text-right font-black text-slate-400 min-w-[110px] border-b border-slate-200 uppercase tracking-widest text-[9px]">
                                        {month}
                                    </th>
                                ))}
                                <th className="px-8 py-6 text-right font-black text-slate-900 bg-slate-100/50 min-w-[140px] border-b border-slate-200 uppercase tracking-widest text-[9px]">
                                    Total Anual
                                </th>
                                <th className="px-4 py-6 border-b border-slate-200 bg-slate-50"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {displayItems.length > 0 ? (
                                displayItems.map((item) => {
                                    return (
                                        <tr key={item.id} className="hover:bg-indigo-50/30 group transition-all duration-200">
                                            <td className="px-8 py-4 font-bold text-slate-700 sticky left-0 bg-white group-hover:bg-slate-50/80 z-10 border-r border-slate-100">
                                                <div className="flex items-center gap-2">
                                                    {item.recorrente && (
                                                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-sm shadow-indigo-200" title="Recorrente"></div>
                                                    )}
                                                    {item.description}
                                                </div>
                                            </td>
                                            {months.map((_, index) => {
                                                const isCurrentMonth = item.month === index + 1;
                                                return (
                                                    <td key={index} className="px-2 py-4 text-right">
                                                        {isCurrentMonth ? (
                                                            <div
                                                                onClick={(e) => handleCellClick(e, item.id)}
                                                                className={`
                                                                    ${item.recorrente ? 'text-indigo-600 bg-indigo-50/50 border-indigo-100' : 'text-slate-600 bg-slate-50 border-slate-100'} 
                                                                    text-[12px] font-black px-3 py-2 rounded-xl transition-all cursor-pointer border hover:scale-105 hover:shadow-sm active:scale-95
                                                                `}
                                                            >
                                                                {item.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                            </div>
                                                        ) : (
                                                            <span className="text-slate-200/50 font-black">---</span>
                                                        )}
                                                    </td>
                                                );
                                            })}
                                            <td className="px-8 py-4 text-right font-black text-slate-400 italic bg-slate-50/30">
                                                {item.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="px-4 py-4 text-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleDelete(item.id)}
                                                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={15} className="px-8 py-20 text-center text-slate-300 font-bold italic tracking-tight">
                                        Nenhuma previsão cadastrada para {selectedYear}
                                    </td>
                                </tr>
                            )}

                            {/* Footer Total Row */}
                            <tr className="bg-slate-900 font-black text-white">
                                <td className="px-8 py-6 sticky left-0 bg-slate-900 border-t border-slate-800 uppercase tracking-widest text-[10px]">
                                    TOTAL DE SAÍDAS PREVISTAS
                                </td>
                                {monthlyTotals.map((total, index) => (
                                    <td key={index} className="px-4 py-6 text-right border-t border-slate-800 tabular-nums">
                                        {total > 0 ? total.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '-'}
                                    </td>
                                ))}
                                <td className="px-8 py-6 text-right text-indigo-400 text-base border-t border-slate-800 tabular-nums">
                                    R$ {annualTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="bg-slate-900 border-t border-slate-800"></td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div className="px-8 py-4 bg-slate-50/50 flex items-center gap-6 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full shadow-sm shadow-indigo-100"></div>
                        <span className="text-[9px] uppercase font-black text-slate-400 tracking-widest">Recorrência Mensal</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 bg-slate-300 rounded-full shadow-sm"></div>
                        <span className="text-[9px] uppercase font-black text-slate-400 tracking-widest">Gasto Eventual</span>
                    </div>
                    <div className="ml-auto flex items-center gap-4 text-[9px] uppercase font-black text-slate-400 tracking-widest">
                        <span>{displayItems.length} previsões</span>
                        <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                        <span>DRE {selectedYear}</span>
                    </div>
                </div>
            </div>

            {/* Popover de Ações do Dado */}
            {activePopover && (
                <div
                    className="fixed z-[100] bg-white rounded-xl shadow-2xl border border-gray-100 p-2 min-w-[140px] animate-in fade-in zoom-in duration-200"
                    style={{ left: `${activePopover.x}px`, top: `${activePopover.y - 50}px` }}
                >
                    <div className="flex gap-1">
                        <button
                            onClick={() => {
                                const forecast = forecasts.find(f => f.id === activePopover.id);
                                if (forecast) handleEdit(forecast);
                                setActivePopover(null);
                            }}
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 hover:bg-slate-50 rounded-lg text-indigo-600 font-bold text-xs"
                        >
                            <Edit2 size={12} /> Editar
                        </button>
                        <button
                            onClick={() => {
                                handleDelete(activePopover.id);
                                setActivePopover(null);
                            }}
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 hover:bg-red-50 rounded-lg text-red-600 font-bold text-xs"
                        >
                            <Trash2 size={12} /> Excluir
                        </button>
                        <button
                            onClick={() => setActivePopover(null)}
                            className="p-2 hover:bg-slate-100 rounded-lg text-slate-400"
                        >
                            <X size={12} />
                        </button>
                    </div>
                </div>
            )}

            {/* Overlay para fechar popover */}
            {activePopover && (
                <div className="fixed inset-0 z-[90]" onClick={() => setActivePopover(null)} />
            )}

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white w-full max-w-md rounded-2xl shadow-xl p-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-6">
                            {editingId ? 'Editar Previsão' : 'Nova Previsão'}
                        </h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder="Ex: Aluguel, Salários, Energia"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Valor (R$)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    required
                                    value={formData.amount}
                                    onChange={e => setFormData({ ...formData, amount: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder="0,00"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Mês de Referência</label>
                                <input
                                    type="month"
                                    required
                                    value={formData.mes}
                                    onChange={e => setFormData({ ...formData, mes: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>

                            <div className="flex items-center pt-2">
                                <input
                                    type="checkbox"
                                    id="recorrente"
                                    checked={formData.recorrente}
                                    onChange={e => setFormData({ ...formData, recorrente: e.target.checked })}
                                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                />
                                <label htmlFor="recorrente" className="ml-2 text-sm font-medium text-gray-700">
                                    Despesa recorrente (aparece em azul)
                                </label>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsModalOpen(false);
                                        setEditingId(null);
                                        setFormData({ description: '', amount: '', recorrente: false, mes: `${selectedYear}-01` });
                                    }}
                                    className="flex-1 py-2 text-gray-600 font-medium hover:bg-gray-50 rounded-lg transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-colors"
                                >
                                    {editingId ? 'Atualizar' : 'Salvar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Confirm Delete Dialog */}
            <ConfirmDialog
                isOpen={deleteConfirm.isOpen}
                title="Excluir Previsão"
                message="Tem certeza que deseja excluir esta previsão de despesa? Esta ação não pode ser desfeita."
                confirmText="Excluir"
                cancelText="Cancelar"
                type="danger"
                onConfirm={confirmDelete}
                onCancel={() => setDeleteConfirm({ isOpen: false, forecastId: null })}
            />

            {/* Confirm Bulk Delete Dialog */}
            <ConfirmDialog
                isOpen={bulkDeleteConfirm}
                title="Excluir Todas as Previsões do Ano"
                message={`⚠️ ATENÇÃO: Deseja excluir TODAS as previsões do ano de ${selectedYear}? Esta ação não pode ser desfeita e removerá todos os registros permanentemente.`}
                confirmText="Excluir Tudo"
                cancelText="Cancelar"
                type="danger"
                onConfirm={async () => {
                    try {
                        const { error } = await supabase
                            .from('previsao_despesa')
                            .delete()
                            .filter('mes', 'like', `${selectedYear}-%`);

                        if (error) throw error;
                        setForecasts(prev => prev.filter(f => !f.mes.startsWith(selectedYear.toString())));
                    } catch (error) {
                        alert("Erro ao remover todas as previsões.");
                    }
                }}
                onCancel={() => setBulkDeleteConfirm(false)}
            />
        </div>
    );
};

export default ForecastExpenses;
