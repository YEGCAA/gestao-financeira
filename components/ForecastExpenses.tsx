
import React, { useState } from 'react';
import { Plus, Trash2, Edit2, TrendingDown, Calendar, Search, MoreVertical } from 'lucide-react';
import { ForecastExpense } from '../types';
import { supabase } from '../lib/supabase';
import ConfirmModal from './ConfirmModal';

interface ForecastExpensesProps {
    forecasts: ForecastExpense[];
    setForecasts: React.Dispatch<React.SetStateAction<ForecastExpense[]>>;
}

const ForecastExpenses: React.FC<ForecastExpensesProps> = ({ forecasts, setForecasts }) => {
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
        recorrente: false,
        mes: new Date().toISOString().slice(0, 7)
    });

    const [searchTerm, setSearchTerm] = useState('');
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);

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

    // Filtrar pelo ano selecionado
    const yearForecasts = forecasts.filter(f => f.mes.startsWith(selectedYear.toString()));

    // Agrupar por descrição (item) e mês
    const itemsByDescription = yearForecasts.reduce((acc: any, forecast) => {
        if (!acc[forecast.description]) {
            acc[forecast.description] = {
                description: forecast.description,
                id: forecast.id,
                months: {}
            };
        }
        const month = parseInt(forecast.mes.split('-')[1]);
        acc[forecast.description].months[month] = {
            value: forecast.amount,
            id: forecast.id,
            recorrente: forecast.recorrente
        };
        return acc;
    }, {});

    let items = Object.values(itemsByDescription);

    // Filtrar por termo de busca
    if (searchTerm) {
        const search = searchTerm.toLowerCase();
        items = items.filter((item: any) => {
            const description = item.description.toLowerCase();
            // Também busca por mês (ex: "janeiro", "01", etc.)
            const monthNames = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
                'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
            const itemMonths = Object.keys(item.months).map(m => monthNames[parseInt(m) - 1]);

            return description.includes(search) ||
                itemMonths.some(monthName => monthName.includes(search));
        });
    }

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

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900">Previsão de Despesas</h1>
                <div className="flex gap-3">
                    <div className="relative w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar..."
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
                            setEditingId(null);
                            setFormData({ description: '', amount: '', recorrente: false, mes: `${selectedYear}-01` });
                            setIsModalOpen(true);
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                        <Plus size={18} />
                        Nova Previsão
                    </button>
                </div>
            </div>

            {/* DRE Anual - Tabela */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="bg-gray-800 px-6 py-3">
                    <h2 className="text-base font-semibold text-white">
                        DRE Anual - {selectedYear}
                    </h2>
                </div>

                <div className="overflow-x-auto overflow-y-visible">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase sticky left-0 bg-gray-50 z-10 min-w-[250px]">
                                    Descrição
                                </th>
                                {months.map((month, index) => (
                                    <th key={index} className="px-4 py-4 text-right text-xs font-semibold text-gray-700 uppercase min-w-[100px]">
                                        {month}
                                    </th>
                                ))}
                                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-900 uppercase bg-gray-100 min-w-[120px]">
                                    Total Anual
                                </th>
                                <th className="px-4 py-4 text-center text-xs font-semibold text-gray-700 uppercase min-w-[90px]">
                                    Ações
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {/* Seção de Despesas */}
                            <tr className="bg-gray-50">
                                <td colSpan={15} className="px-6 py-3 font-semibold text-gray-700 text-sm flex items-center gap-2">
                                    <TrendingDown size={14} />
                                    DESPESAS PREVISTAS
                                </td>
                            </tr>
                            {items.length > 0 ? (
                                items.map((item: any) => {
                                    const rowTotal = Object.values(item.months).reduce((sum: number, m: any) => sum + m.value, 0);
                                    return (
                                        <tr key={item.id} className="hover:bg-gray-50 transition-colors group">
                                            <td className="px-6 py-4 font-medium text-gray-900 sticky left-0 bg-white group-hover:bg-gray-50 text-sm">
                                                <div className="flex items-center justify-between gap-2">
                                                    <span>{item.description}</span>
                                                    <div>
                                                        <button
                                                            onClick={(e) => {
                                                                if (openMenuId === item.id) {
                                                                    setOpenMenuId(null);
                                                                    setMenuPosition(null);
                                                                } else {
                                                                    const rect = e.currentTarget.getBoundingClientRect();
                                                                    setMenuPosition({
                                                                        top: rect.bottom + 4,
                                                                        left: rect.left - 130
                                                                    });
                                                                    setOpenMenuId(item.id);
                                                                }
                                                            }}
                                                            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                                                            title="Opções"
                                                        >
                                                            <MoreVertical size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </td>
                                            {months.map((_, index) => {
                                                const monthData = item.months[index + 1];
                                                return (
                                                    <td key={index} className="px-3 py-4 text-right text-gray-700 text-xs">
                                                        {monthData ? (
                                                            <span className={monthData.recorrente ? 'font-semibold text-gray-900 bg-gray-100 px-1.5 py-0.5 rounded text-xs' : 'text-xs'}>
                                                                {monthData.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                            </span>
                                                        ) : (
                                                            <span className="text-gray-300">-</span>
                                                        )}
                                                    </td>
                                                );
                                            })}
                                            <td className="px-6 py-4 text-right font-semibold text-gray-900 bg-gray-100 text-xs">
                                                {rowTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                <div className="opacity-0 group-hover:opacity-100 flex justify-center gap-1 transition-opacity">
                                                    <button
                                                        onClick={() => {
                                                            const firstMonth = Object.keys(item.months)[0];
                                                            const forecast = yearForecasts.find(f =>
                                                                f.description === item.description &&
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
                                        Nenhuma despesa prevista para {selectedYear}
                                    </td>
                                </tr>
                            )}

                            {/* Total de Despesas */}
                            <tr className="bg-gray-100 font-semibold border-t-2 border-gray-300">
                                <td className="px-6 py-4 text-gray-900 sticky left-0 bg-gray-100 text-sm">
                                    TOTAL DE DESPESAS
                                </td>
                                {monthlyTotals.map((total, index) => (
                                    <td key={index} className="px-3 py-4 text-right text-gray-900 text-xs">
                                        {total > 0 ? total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
                                    </td>
                                ))}
                                <td className="px-6 py-4 text-right text-gray-900 bg-gray-200 font-bold text-xs">
                                    {annualTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                                <td></td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
                    <div className="flex items-center gap-4 text-xs text-gray-600">
                        <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 bg-gray-400 rounded"></div>
                            <span>Valores destacados = Despesas recorrentes</span>
                        </div>
                        <div className="flex items-center gap-2 ml-auto">
                            <span className="text-gray-700">Total de itens:</span>
                            <span className="bg-gray-700 text-white px-2 py-0.5 rounded text-xs font-semibold">{items.length}</span>
                        </div>
                    </div>
                </div>
            </div>

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
                                const item = items.find((i: any) => i.id === openMenuId) as any;
                                if (item) {
                                    const firstMonth = Object.keys(item.months)[0];
                                    const forecast = yearForecasts.find(f =>
                                        f.description === item.description &&
                                        parseInt(f.mes.split('-')[1]) === parseInt(firstMonth)
                                    );
                                    if (forecast) handleEdit(forecast);
                                }
                                setOpenMenuId(null);
                                setMenuPosition(null);
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 rounded-t-lg transition-colors"
                        >
                            <Edit2 size={14} />
                            Editar
                        </button>
                        <button
                            onClick={() => {
                                const item = items.find((i: any) => i.id === openMenuId) as any;
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
                            className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 rounded-b-lg transition-colors border-t border-gray-100"
                        >
                            <Trash2 size={14} />
                            Excluir
                        </button>
                    </div>
                </>
            )}
        </div>
    );
};

export default ForecastExpenses;
