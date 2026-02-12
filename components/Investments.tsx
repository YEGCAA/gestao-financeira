
import React, { useState } from 'react';
import { Plus, Trash2, Edit2, Search, ArrowUp, ArrowDown, Loader2, CheckCircle, AlertTriangle, ArrowDownToLine } from 'lucide-react';
import { Investment, TransactionType, Transaction } from '../types';
import { supabase } from '../lib/supabase';
import ConfirmDialog from './ConfirmDialog';

// Função auxiliar para formatar datas sem problemas de timezone
const formatDateBR = (dateString: string): string => {
    if (!dateString) return '';
    // Extrair apenas a parte da data (YYYY-MM-DD) ignorando hora e timezone
    const datePart = dateString.split('T')[0];
    const [year, month, day] = datePart.split('-');
    return `${day}/${month}/${year}`;
};

interface InvestmentsProps {
    investments: Investment[];
    setInvestments: React.Dispatch<React.SetStateAction<Investment[]>>;
    setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
}

const Investments: React.FC<InvestmentsProps> = ({ investments, setInvestments, setTransactions }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; investment: Investment | null }>({ isOpen: false, investment: null });
    const [formData, setFormData] = useState({
        description: '',
        amount: '',
        type: 'INCOME' as TransactionType,
        date_lancamento: new Date().toISOString().split('T')[0]
    });

    const [searchTerm, setSearchTerm] = useState('');

    const handleEdit = (investment: Investment) => {
        setEditingId(investment.id);
        setFormData({
            description: investment.description,
            amount: investment.amount.toString(),
            type: investment.type,
            date_lancamento: investment.date_lancamento
        });
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingId(null);
        setFormData({
            description: '',
            amount: '',
            type: 'INCOME',
            date_lancamento: new Date().toISOString().split('T')[0]
        });
        setSyncStatus('idle');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setSyncStatus('syncing');

        try {
            const amount = parseFloat(formData.amount);
            const investmentData = {
                descrição: formData.description,
                entrada: formData.type === 'INCOME' ? amount : 0,
                saída: formData.type === 'EXPENSE' ? amount : 0,
                data_lancamento: formData.date_lancamento
            };

            if (editingId) {
                const { data, error } = await supabase
                    .from('investimento')
                    .update(investmentData)
                    .eq('id', editingId)
                    .select();

                if (error) throw error;

                const updated: Investment = {
                    id: data[0].id,
                    description: data[0].descrição,
                    amount: data[0].entrada || data[0].saída || 0,
                    type: data[0].entrada ? 'INCOME' : 'EXPENSE',
                    date_lancamento: data[0].data_lancamento
                };
                setInvestments(prev => prev.map(i => i.id === editingId ? updated : i));
            } else {
                const { data, error } = await supabase
                    .from('investimento')
                    .insert([investmentData])
                    .select();

                if (error) throw error;

                const inserted: Investment = {
                    id: data[0].id,
                    description: data[0].descrição,
                    amount: data[0].entrada || data[0].saída || 0,
                    type: data[0].entrada ? 'INCOME' : 'EXPENSE',
                    date_lancamento: data[0].data_lancamento
                };
                setInvestments(prev => [inserted, ...prev]);
            }
            setSyncStatus('success');
            setTimeout(() => handleCloseModal(), 1000);
        } catch (error: any) {
            console.error("❌ Erro ao salvar:", error);
            setSyncStatus('error');
            alert(`Erro: ${error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        const investment = investments.find(i => i.id === id);
        if (!investment) return;
        setDeleteConfirm({ isOpen: true, investment });
    };

    const confirmDelete = async () => {
        if (!deleteConfirm.investment) return;

        try {
            const cashDesc = `[INVESTIMENTO] ${deleteConfirm.investment.description}`;

            // 1. Remover do Fluxo de Caixa
            const { error: cashError } = await supabase
                .from('Fluxo de caixa')
                .delete()
                .eq('Descrição', cashDesc);

            if (cashError) throw cashError;

            // 2. Remover da tabela de investimentos
            const { error } = await supabase.from('investimento').delete().eq('id', deleteConfirm.investment.id);
            if (error) throw error;

            // 3. Atualizar estados locais
            setInvestments(prev => prev.filter(i => i.id !== deleteConfirm.investment!.id));
            setTransactions(prev => prev.filter(t => t.description !== cashDesc));
        } catch (error: any) {
            console.error("Erro ao deletar:", error);
            alert(`Erro ao remover: ${error.message}`);
        }
    };

    const handleDeleteAll = async () => {
        const confirmMessage = `⚠️ ATENÇÃO! Esta ação irá EXCLUIR TODOS OS ${investments.length} INVESTIMENTOS da tabela "investimento" no Supabase.\\n\\nEsta ação é IRREVERSÍVEL!\\n\\nDigite "EXCLUIR TUDO" para confirmar:`;

        const userInput = prompt(confirmMessage);

        if (userInput === 'EXCLUIR TUDO') {
            try {
                const { error } = await supabase
                    .from('investimento')
                    .delete()
                    .neq('id', 0);

                if (error) throw error;

                setInvestments([]);
                alert(`✅ Sucesso! Todos os ${investments.length} investimentos foram excluídos do Supabase.`);
            } catch (error: any) {
                console.error("Erro ao excluir tudo:", error);
                alert(`Erro: ${error.message}`);
            }
        } else {
            alert('❌ Operação cancelada. Digite exatamente "EXCLUIR TUDO" para confirmar.');
        }
    };

    const totalIncome = investments.filter(i => i.type === 'INCOME').reduce((acc, i) => acc + i.amount, 0);
    const totalExpense = investments.filter(i => i.type === 'EXPENSE').reduce((acc, i) => acc + i.amount, 0);
    const netBalance = totalIncome - totalExpense;

    const filteredInvestments = investments.filter(inv =>
        inv.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.amount.toString().includes(searchTerm) ||
        inv.date_lancamento.includes(searchTerm)
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Investimentos</h2>
                    <p className="text-sm text-gray-500 mt-1">Gerencie suas entradas e saídas de investimentos</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleDeleteAll}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                    >
                        <Trash2 size={16} />
                        Excluir Tudo
                    </button>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                        <Plus size={16} />
                        Novo Investimento
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-xl border border-green-200">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-green-700">Entradas</span>
                        <ArrowUp className="text-green-600" size={20} />
                    </div>
                    <p className="text-2xl font-bold text-green-900">
                        R$ {totalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                </div>

                <div className="bg-gradient-to-br from-red-50 to-rose-50 p-6 rounded-xl border border-red-200">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-red-700">Saídas</span>
                        <ArrowDown className="text-red-600" size={20} />
                    </div>
                    <p className="text-2xl font-bold text-red-900">
                        R$ {totalExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                </div>

                <div className={`bg-gradient-to-br ${netBalance >= 0 ? 'from-blue-50 to-indigo-50 border-blue-200' : 'from-orange-50 to-amber-50 border-orange-200'} p-6 rounded-xl border`}>
                    <div className="flex items-center justify-between mb-2">
                        <span className={`text-sm font-medium ${netBalance >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>Saldo</span>
                        <ArrowDownToLine className={netBalance >= 0 ? 'text-blue-600' : 'text-orange-600'} size={20} />
                    </div>
                    <p className={`text-2xl font-bold ${netBalance >= 0 ? 'text-blue-900' : 'text-orange-900'}`}>
                        R$ {netBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                </div>
            </div>

            {/* Search Bar */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                    type="text"
                    placeholder="Buscar por descrição, valor ou data..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descrição</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Valor</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {filteredInvestments.map((investment) => (
                                <tr key={investment.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {formatDateBR(investment.date_lancamento)}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-900">{investment.description}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${investment.type === 'INCOME'
                                            ? 'bg-green-100 text-green-800'
                                            : 'bg-red-100 text-red-800'
                                            }`}>
                                            {investment.type === 'INCOME' ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                                            {investment.type === 'INCOME' ? 'Entrada' : 'Saída'}
                                        </span>
                                    </td>
                                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold text-right ${investment.type === 'INCOME' ? 'text-green-600' : 'text-red-600'
                                        }`}>
                                        R$ {investment.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <button
                                                onClick={() => handleEdit(investment)}
                                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                title="Editar"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(investment.id)}
                                                className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Excluir"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredInvestments.length === 0 && (
                        <div className="text-center py-12 text-gray-500">
                            <p>Nenhum investimento encontrado</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
                        <h3 className="text-xl font-bold text-gray-900 mb-4">
                            {editingId ? 'Editar Investimento' : 'Novo Investimento'}
                        </h3>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="Ex: Ações da Petrobras"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, type: 'INCOME' })}
                                        className={`px-4 py-2 rounded-lg font-medium transition-all ${formData.type === 'INCOME'
                                            ? 'bg-green-600 text-white'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                            }`}
                                    >
                                        <ArrowUp size={16} className="inline mr-1" />
                                        Entrada
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, type: 'EXPENSE' })}
                                        className={`px-4 py-2 rounded-lg font-medium transition-all ${formData.type === 'EXPENSE'
                                            ? 'bg-red-600 text-white'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                            }`}
                                    >
                                        <ArrowDown size={16} className="inline mr-1" />
                                        Saída
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Valor</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    required
                                    value={formData.amount}
                                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="0,00"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Data de Lançamento</label>
                                <input
                                    type="date"
                                    required
                                    value={formData.date_lancamento}
                                    onChange={(e) => setFormData({ ...formData, date_lancamento: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>

                            {/* Status Indicator */}
                            {syncStatus !== 'idle' && (
                                <div className={`flex items-center gap-2 p-3 rounded-lg ${syncStatus === 'syncing' ? 'bg-blue-50 text-blue-700' :
                                    syncStatus === 'success' ? 'bg-green-50 text-green-700' :
                                        'bg-red-50 text-red-700'
                                    }`}>
                                    {syncStatus === 'syncing' && <Loader2 size={16} className="animate-spin" />}
                                    {syncStatus === 'success' && <CheckCircle size={16} />}
                                    {syncStatus === 'error' && <AlertTriangle size={16} />}
                                    <span className="text-sm font-medium">
                                        {syncStatus === 'syncing' && 'Salvando...'}
                                        {syncStatus === 'success' && 'Salvo com sucesso!'}
                                        {syncStatus === 'error' && 'Erro ao salvar'}
                                    </span>
                                </div>
                            )}

                            <div className="flex gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                                    disabled={isSubmitting}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 size={16} className="animate-spin" />
                                            Salvando...
                                        </>
                                    ) : (
                                        editingId ? 'Atualizar' : 'Salvar'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Confirm Delete Dialog */}
            <ConfirmDialog
                isOpen={deleteConfirm.isOpen}
                title="Excluir Investimento"
                message={`Deseja realmente excluir o investimento "${deleteConfirm.investment?.description}"? Isso também removerá o lançamento correspondente no Fluxo de Caixa. Esta ação não pode ser desfeita.`}
                confirmText="Excluir"
                cancelText="Cancelar"
                type="danger"
                onConfirm={confirmDelete}
                onCancel={() => setDeleteConfirm({ isOpen: false, investment: null })}
            />
        </div>
    );
};

export default Investments;
