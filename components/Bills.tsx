import React, { useState } from 'react';
import { Plus, Trash2, Edit2, FileText, ArrowUpCircle, ArrowDownCircle, Search, Check } from 'lucide-react';
import { Bill, Transaction } from '../types';
import { supabase } from '../lib/supabase';
import ConfirmDialog from './ConfirmDialog';

// Função auxiliar para formatar datas sem problemas de timezone
const formatDateBR = (dateString: string): string => {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('T')[0].split('-');
    return `${day}/${month}/${year}`;
};

interface BillsProps {
    bills: Bill[];
    setBills: React.Dispatch<React.SetStateAction<Bill[]>>;
    setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
}

const Bills: React.FC<BillsProps> = ({ bills, setBills, setTransactions }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; billId: string | null }>({ isOpen: false, billId: null });
    const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
    const [paymentConfirm, setPaymentConfirm] = useState<{ isOpen: boolean; bill: Bill | null }>({ isOpen: false, bill: null });
    const [formData, setFormData] = useState({
        data: new Date().toISOString().split('T')[0],
        nome_cliente: '',
        descricao: '',
        entrada: '',
        saida: ''
    });

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedMonth, setSelectedMonth] = useState<string>(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    });

    const handleEdit = (bill: Bill) => {
        setEditingId(bill.id);
        setFormData({
            data: bill.data,
            nome_cliente: bill.nome_cliente || '',
            descricao: bill.descricao,
            entrada: bill.entrada.toString(),
            saida: bill.saida.toString()
        });
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const entradaValue = parseFloat(formData.entrada) || 0;
        const saidaValue = parseFloat(formData.saida) || 0;

        // Validação: precisa preencher pelo menos um
        if (entradaValue === 0 && saidaValue === 0) {
            alert('Preencha pelo menos um dos campos: A Receber ou A Pagar');
            return;
        }

        const billData = {
            data: formData.data,
            nome_cliente: formData.nome_cliente,
            descricao: formData.descricao,
            entrada: entradaValue,
            'saída': saidaValue
        };

        console.log('📤 Tentando salvar:', billData);

        try {
            if (editingId) {
                const { data, error } = await supabase
                    .from('contas_pagar_receber')
                    .update(billData)
                    .eq('id', editingId)
                    .select();

                if (error) throw error;

                const updated: Bill = {
                    id: data[0].id,
                    data: data[0].data,
                    nome_cliente: data[0].nome_cliente,
                    descricao: data[0].descricao,
                    entrada: data[0].entrada,
                    saida: data[0]['saída']
                };
                setBills(prev => prev.map(b => b.id === editingId ? updated : b));
            } else {
                const { data, error } = await supabase
                    .from('contas_pagar_receber')
                    .insert([billData])
                    .select();

                if (error) throw error;

                const inserted: Bill = {
                    id: data[0].id,
                    data: data[0].data,
                    nome_cliente: data[0].nome_cliente,
                    descricao: data[0].descricao,
                    entrada: data[0].entrada,
                    saida: data[0]['saída']
                };
                setBills(prev => [inserted, ...prev]);
            }

            setIsModalOpen(false);
            setEditingId(null);
            setFormData({ data: new Date().toISOString().split('T')[0], nome_cliente: '', descricao: '', entrada: '', saida: '' });
        } catch (error: any) {
            console.error("❌ Erro completo ao salvar:", error);
            console.error("📋 Detalhes do erro:", {
                message: error.message,
                details: error.details,
                hint: error.hint,
                code: error.code
            });
            alert(`Falha ao sincronizar: ${error.message || 'Erro desconhecido'}\n\nVerifique o console para mais detalhes.`);
        }
    };

    const handleDelete = async (id: string) => {
        setDeleteConfirm({ isOpen: true, billId: id });
    };

    const confirmDelete = async () => {
        if (!deleteConfirm.billId) return;

        try {
            const { error } = await supabase.from('contas_pagar_receber').delete().eq('id', deleteConfirm.billId);
            if (error) throw error;
            setBills(prev => prev.filter(b => b.id !== deleteConfirm.billId));
        } catch (error) {
            alert('Erro ao deletar conta');
        }
    };

    const handlePay = async (bill: Bill) => {
        setPaymentConfirm({ isOpen: true, bill });
    };

    const confirmPayment = async () => {
        if (!paymentConfirm.bill) return;
        const bill = paymentConfirm.bill;

        try {
            const isEntrada = bill.entrada > 0;
            const amount = isEntrada ? bill.entrada : bill.saida;

            // 1. Inserir no Fluxo de Caixa
            const { data: cashData, error: cashError } = await supabase
                .from('Fluxo de caixa')
                .insert([{
                    Data: new Date().toISOString().split('T')[0],
                    'Descrição': `[PAGO] ${bill.nome_cliente ? bill.nome_cliente + ' - ' : ''}${bill.descricao}`,
                    Valor: isEntrada ? amount : -amount,
                    tipo: (isEntrada ? amount : -amount) >= 0 ? 'INCOME' : 'EXPENSE',
                    Saldo: 0
                }])
                .select();

            if (cashError) throw cashError;

            // Atualizar estado local do fluxo de caixa
            const newTrans: Transaction = {
                id: cashData[0].id,
                date: cashData[0].Data,
                description: cashData[0]['Descrição'],
                amount: Math.abs(cashData[0].Valor),
                balance: cashData[0].Saldo,
                type: cashData[0].Valor >= 0 ? 'INCOME' : 'EXPENSE',
                categoryId: '',
                subCategoryId: ''
            };
            setTransactions(prev => [newTrans, ...prev]);

            // 2. Remover de Contas a Pagar/Receber ou marcar como pago? 
            // Por padrão, vamos remover para não poluir, ou você pode manter.
            const { error: deleteError } = await supabase.from('contas_pagar_receber').delete().eq('id', bill.id);
            if (deleteError) throw deleteError;

            setBills(prev => prev.filter(b => b.id !== bill.id));

            alert('Pagamento registrado com sucesso!');
        } catch (error: any) {
            console.error("Erro ao registrar pagamento:", error);
            alert(`Erro: ${error.message}`);
        }
    };

    // Filtrar contas
    const filteredBills = bills.filter(bill => {
        // Filtro por Mês/Ano
        if (selectedMonth) {
            const [selYear, selMonth] = selectedMonth.split('-');
            const [billYear, billMonth] = bill.data.split('-');
            if (selYear !== billYear || selMonth !== billMonth) return false;
        }

        if (!searchTerm) return true;

        const search = searchTerm.toLowerCase();
        const date = formatDateBR(bill.data);
        const description = bill.descricao.toLowerCase();
        const cliente = (bill.nome_cliente || '').toLowerCase();
        const entrada = bill.entrada.toString();
        const saida = bill.saida.toString();

        return date.includes(search) ||
            description.includes(search) ||
            cliente.includes(search) ||
            entrada.includes(search) ||
            saida.includes(search);
    });

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-2 shadow-sm hover:border-blue-400 transition-colors group">
                        <div className="flex flex-col">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-tighter leading-none mb-1">Período de Referência</label>
                            <input
                                type="month"
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(e.target.value)}
                                className="bg-transparent border-none focus:outline-none text-sm font-bold text-gray-700 cursor-pointer"
                            />
                        </div>
                    </div>
                    <div className="relative w-80 group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar por descrição, cliente..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-sm transition-all"
                        />
                    </div>
                    <button
                        onClick={() => {
                            setEditingId(null);
                            setFormData({ data: new Date().toISOString().split('T')[0], descricao: '', entrada: '', saida: '' });
                            setIsModalOpen(true);
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                        <Plus size={18} />
                        Nova Conta
                    </button>
                    <button
                        onClick={() => setBulkDeleteConfirm(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition-colors font-medium shadow-sm"
                    >
                        <Trash2 size={18} />
                        Excluir Tudo
                    </button>
                </div>
            </div>

            {/* Tabela */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Data</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Cliente</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Descrição</th>
                                <th className="px-6 py-3 text-right text-xs font-semibold text-green-700 uppercase">A Receber</th>
                                <th className="px-6 py-3 text-right text-xs font-semibold text-red-700 uppercase">A Pagar</th>
                                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {filteredBills.map(bill => (
                                <tr key={bill.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 text-sm text-gray-600">
                                        {formatDateBR(bill.data)}
                                    </td>
                                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{bill.nome_cliente || '-'}</td>
                                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{bill.descricao}</td>
                                    <td className="px-6 py-4 text-right">
                                        {bill.entrada > 0 ? (
                                            <span className="text-sm font-bold text-green-600 flex items-center justify-end gap-1">
                                                <ArrowUpCircle size={14} />
                                                R$ {bill.entrada.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </span>
                                        ) : (
                                            <span className="text-gray-300">-</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {bill.saida > 0 ? (
                                            <span className="text-sm font-bold text-red-600 flex items-center justify-end gap-1">
                                                <ArrowDownCircle size={14} />
                                                R$ {bill.saida.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </span>
                                        ) : (
                                            <span className="text-gray-300">-</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <button
                                                onClick={() => handlePay(bill)}
                                                title="Marcar como pago"
                                                className="text-emerald-600 hover:bg-emerald-50 p-1 rounded"
                                            >
                                                <Check size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleEdit(bill)}
                                                className="text-blue-600 hover:bg-blue-50 p-1 rounded"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(bill.id)}
                                                className="text-red-600 hover:bg-red-50 p-1 rounded"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}

                            {bills.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                                        Nenhuma conta cadastrada
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white w-full max-w-md rounded-2xl shadow-xl p-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-6">
                            {editingId ? 'Editar Conta' : 'Nova Conta'}
                        </h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
                                <input
                                    type="date"
                                    required
                                    value={formData.data}
                                    onChange={e => setFormData({ ...formData, data: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
                                <input
                                    type="text"
                                    value={formData.nome_cliente}
                                    onChange={e => setFormData({ ...formData, nome_cliente: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Ex: Acme Corp"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.descricao}
                                    onChange={e => setFormData({ ...formData, descricao: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Ex: Aluguel, Fornecedor"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-green-700 mb-1">A Receber (R$)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={formData.entrada}
                                        onChange={e => setFormData({ ...formData, entrada: e.target.value })}
                                        className="w-full px-4 py-2 border border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                                        placeholder="0,00"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-red-700 mb-1">A Pagar (R$)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={formData.saida}
                                        onChange={e => setFormData({ ...formData, saida: e.target.value })}
                                        className="w-full px-4 py-2 border border-red-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                                        placeholder="0,00"
                                    />
                                </div>
                            </div>

                            <p className="text-xs text-gray-500">
                                💡 Preencha apenas um dos campos (A Receber ou A Pagar)
                            </p>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsModalOpen(false);
                                        setEditingId(null);
                                        setFormData({ data: new Date().toISOString().split('T')[0], nome_cliente: '', descricao: '', entrada: '', saida: '' });
                                    }}
                                    className="flex-1 py-2 text-gray-600 font-medium hover:bg-gray-50 rounded-lg transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors"
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
                title="Excluir Conta"
                message="Tem certeza que deseja excluir esta conta? Esta ação não pode ser desfeita."
                confirmText="Excluir"
                cancelText="Cancelar"
                type="danger"
                onConfirm={confirmDelete}
                onCancel={() => setDeleteConfirm({ isOpen: false, billId: null })}
            />

            {/* Confirm Bulk Delete Dialog */}
            <ConfirmDialog
                isOpen={bulkDeleteConfirm}
                title="Excluir Todas as Contas"
                message="⚠️ ATENÇÃO: Deseja excluir TODAS as contas a pagar e receber? Esta ação não pode ser desfeita e removerá todos os registros permanentemente."
                confirmText="Excluir Tudo"
                cancelText="Cancelar"
                type="danger"
                onConfirm={async () => {
                    try {
                        const { error } = await supabase.from('contas_pagar_receber').delete().neq('id', '0');
                        if (error) throw error;
                        setBills([]);
                    } catch (error) {
                        alert('Erro ao excluir todas as contas');
                    }
                }}
                onCancel={() => setBulkDeleteConfirm(false)}
            />

            {/* Confirm Payment Dialog */}
            <ConfirmDialog
                isOpen={paymentConfirm.isOpen}
                title="Confirmar Pagamento"
                message={`Confirmar o pagamento de "${paymentConfirm.bill?.descricao}"? Isso registrará a transação no Fluxo de Caixa e removerá esta conta da lista.`}
                confirmText="Confirmar Pagamento"
                cancelText="Cancelar"
                type="info"
                onConfirm={confirmPayment}
                onCancel={() => setPaymentConfirm({ isOpen: false, bill: null })}
            />
        </div>
    );
};

export default Bills;
