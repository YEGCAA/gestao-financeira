
import React, { useState } from 'react';
import { Plus, MoreVertical, FileText, X, Edit2, Trash2, Search } from 'lucide-react';
import { Contract, Bill, Transaction } from '../types';
import { supabase } from '../lib/supabase';

// Função auxiliar para formatar datas sem problemas de timezone
const formatDateBR = (dateString: string): string => {
    if (!dateString) return '';
    // Extrair apenas a parte da data (YYYY-MM-DD) ignorando hora e timezone
    const datePart = dateString.split('T')[0];
    const [year, month, day] = datePart.split('-');
    return `${day}/${month}/${year}`;
};

interface ContractsProps {
    contracts: Contract[];
    setContracts: React.Dispatch<React.SetStateAction<Contract[]>>;
    setBills: React.Dispatch<React.SetStateAction<Bill[]>>;
    setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
}

const Contracts: React.FC<ContractsProps> = ({ contracts, setContracts, setBills, setTransactions }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [contractToDelete, setContractToDelete] = useState<Contract | null>(null);
    const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [maxParcelas, setMaxParcelas] = useState<number>(1);
    const [formData, setFormData] = useState({
        nome_cliente: '',
        servico: '',
        pago: '',
        receber: '',
        data_pagamento: '',
        inicio_contrato: '',
        final_contrato: '',
        parcela: ''
    });

    const [searchTerm, setSearchTerm] = useState('');

    // Calcular número máximo de parcelas baseado na duração do contrato
    const calculateMaxParcelas = (inicio: string, fim: string): number => {
        if (!inicio || !fim) return 1;

        const [anoInicio, mesInicio] = inicio.split('-').map(Number);
        const [anoFim, mesFim] = fim.split('-').map(Number);

        const mesesDiferenca = (anoFim - anoInicio) * 12 + (mesFim - mesInicio);
        return Math.max(1, mesesDiferenca + 1); // +1 porque inclui o mês inicial
    };

    const handleEdit = (contract: Contract) => {
        setEditingId(contract.id);
        setFormData({
            nome_cliente: contract.nome_cliente,
            servico: contract.servico,
            pago: contract.pago.toString(),
            receber: contract.receber.toString(),
            data_pagamento: contract.data_pagamento || '',
            inicio_contrato: contract.inicio_contrato,
            final_contrato: contract.final_contrato,
            parcela: contract.parcela?.toString() || ''
        });
        setIsModalOpen(true);
        setOpenMenuId(null);
    };

    const createMonthlyBills = async (contract: any, parcelas: number, valorReceber: number) => {
        const valorPorParcela = valorReceber / parcelas;
        // Usar a data diretamente sem conversão de timezone
        const [year, month, day] = contract.inicio_contrato.split('-').map(Number);
        const bills: any[] = [];

        for (let i = 0; i < parcelas; i++) {
            // Calcular o mês e ano corretos
            let newMonth = month + i;
            let newYear = year;

            // Ajustar ano se o mês ultrapassar 12
            while (newMonth > 12) {
                newMonth -= 12;
                newYear += 1;
            }

            // Formatar a data no formato YYYY-MM-DD
            const dataVencimento = `${newYear}-${String(newMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

            bills.push({
                data: dataVencimento,
                nome_cliente: contract['Nome cliente'],
                descricao: `${contract['Serviço']} (${i + 1}/${parcelas})`,
                entrada: valorPorParcela,
                'saída': 0
            });
        }

        try {
            const { data, error } = await supabase
                .from('contas_pagar_receber')
                .insert(bills)
                .select();

            if (error) throw error;

            // Atualizar estado local
            const newBills: Bill[] = data.map((b: any) => ({
                id: b.id,
                data: b.data,
                nome_cliente: b.nome_cliente,
                descricao: b.descricao,
                entrada: b.entrada,
                saida: b['saída'] || 0
            }));

            setBills(prev => [...newBills, ...prev]);
        } catch (error) {
            console.error('Erro ao criar contas a receber:', error);
        }
    };

    const createCashFlowEntry = async (contract: any, valorPago: number) => {
        if (valorPago <= 0) return;

        try {
            // Usar a data de pagamento do contrato, ou data de hoje se não houver
            const dataPagamento = contract['data_pagamento'] || new Date().toISOString().split('T')[0];

            const { data, error } = await supabase
                .from('Fluxo de caixa')
                .insert([{
                    Data: dataPagamento, // Usar a data do contrato sem conversão de timezone
                    'Descrição': `${contract['Nome cliente']} - ${contract['Serviço']}`,
                    Valor: -valorPago,
                    tipo: -valorPago >= 0 ? 'INCOME' : 'EXPENSE',
                    Saldo: 0,
                    categoria_id: null,
                    subcategoria_id: null
                }])
                .select();

            if (error) throw error;

            // Atualizar estado local
            const newTransaction: Transaction = {
                id: data[0].id,
                date: data[0].Data,
                description: data[0]['Descrição'],
                amount: Math.abs(data[0].Valor),
                balance: data[0].Saldo || 0,
                type: data[0].Valor >= 0 ? 'INCOME' : 'EXPENSE',
                categoryId: '',
                subCategoryId: ''
            };

            setTransactions(prev => [newTransaction, ...prev]);
        } catch (error) {
            console.error('Erro ao criar entrada no fluxo de caixa:', error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validar número de parcelas
        const parcelas = parseInt(formData.parcela) || 0;
        if (parcelas > maxParcelas) {
            alert(`O número de parcelas não pode ser maior que ${maxParcelas} (baseado na duração do contrato de ${maxParcelas} meses).`);
            return;
        }

        const contractData = {
            'Nome cliente': formData.nome_cliente,
            'Serviço': formData.servico,
            'Pago': parseFloat(formData.pago),
            'Receber': parseFloat(formData.receber),
            'data_pagamento': formData.data_pagamento || new Date().toISOString().split('T')[0],
            'inicio_contrato': formData.inicio_contrato,
            'final_contrato': formData.final_contrato,
            'parcela': formData.parcela ? parseInt(formData.parcela) : null
        };

        try {
            if (editingId) {
                const { data, error } = await supabase
                    .from('Contratos')
                    .update(contractData)
                    .eq('id', editingId)
                    .select();

                if (error) throw error;

                const mapped: Contract = {
                    id: data[0].id,
                    nome_cliente: data[0]['Nome cliente'],
                    servico: data[0]['Serviço'],
                    pago: data[0]['Pago'],
                    receber: data[0]['Receber'],
                    data_pagamento: data[0]['data_pagamento'],
                    inicio_contrato: data[0]['inicio_contrato'],
                    final_contrato: data[0]['final_contrato'],
                    parcela: data[0]['parcela']
                };
                setContracts(prev => prev.map(c => c.id === editingId ? mapped : c));

                // 2. Adicionar ao fluxo de caixa se houver valor pago
                const valorPago = parseFloat(formData.pago);
                if (valorPago > 0) {
                    await createCashFlowEntry(contractData, valorPago);
                }
            } else {
                const { data, error } = await supabase
                    .from('Contratos')
                    .insert([contractData])
                    .select();

                if (error) throw error;

                const mapped: Contract = {
                    id: data[0].id,
                    nome_cliente: data[0]['Nome cliente'],
                    servico: data[0]['Serviço'],
                    pago: data[0]['Pago'],
                    receber: data[0]['Receber'],
                    data_pagamento: data[0]['data_pagamento'],
                    inicio_contrato: data[0]['inicio_contrato'],
                    final_contrato: data[0]['final_contrato'],
                    parcela: data[0]['parcela']
                };
                setContracts(prev => [mapped, ...prev]);

                // Criar entradas automáticas
                const parcelas = parseInt(formData.parcela) || 0;
                const valorReceber = parseFloat(formData.receber);
                const valorPago = parseFloat(formData.pago);

                // 1. Criar contas a receber parceladas
                if (parcelas > 0 && valorReceber > 0) {
                    await createMonthlyBills(contractData, parcelas, valorReceber);
                }

                // 2. Adicionar ao fluxo de caixa (total pago)
                if (valorPago > 0) {
                    await createCashFlowEntry(contractData, valorPago);
                }
            }

            setIsModalOpen(false);
            setEditingId(null);
            setFormData({
                nome_cliente: '',
                servico: '',
                pago: '',
                receber: '',
                data_pagamento: '',
                inicio_contrato: '',
                final_contrato: '',
                parcela: ''
            });
        } catch (error: any) {
            console.error("Erro ao salvar contrato:", error);
            alert(`Erro ao salvar: ${error.message || 'Erro desconhecido'}`);
        }
    };

    const handleDelete = (contract: Contract) => {
        setContractToDelete(contract);
        setIsDeleteModalOpen(true);
        setOpenMenuId(null);
    };

    const confirmDelete = async () => {
        if (!contractToDelete) return;

        try {
            const searchDesc = `${contractToDelete.nome_cliente} - ${contractToDelete.servico}`;

            // 1. Deletar do Fluxo de Caixa
            await supabase.from('Fluxo de caixa').delete().eq('Descrição', searchDesc);

            // 2. Deletar das contas a pagar/receber
            await supabase.from('contas_pagar_receber')
                .delete()
                .eq('nome_cliente', contractToDelete.nome_cliente)
                .eq('descricao', contractToDelete.servico);

            // 3. Deletar o contrato
            const { error } = await supabase.from('Contratos').delete().eq('id', contractToDelete.id);
            if (error) throw error;

            // 4. Atualizar estados locais simultaneamente
            setContracts(prev => prev.filter(c => c.id !== contractToDelete.id));
            setTransactions(prev => prev.filter(t => t.description !== searchDesc));
            setBills(prev => prev.filter(b => b.nome_cliente !== contractToDelete.nome_cliente || b.descricao !== contractToDelete.servico));

            setIsDeleteModalOpen(false);
            setContractToDelete(null);
        } catch (error) {
            console.error("Erro ao deletar:", error);
            alert("Erro ao remover contrato e dependências.");
        }
    };

    const handleDetails = (contract: Contract) => {
        setSelectedContract(contract);
        setIsDetailsOpen(true);
    };

    const getStatusBadge = (contract: Contract) => {
        const isPago = contract.pago >= contract.receber;

        if (isPago) {
            return { label: 'PAGO', class: 'bg-green-50 text-green-600 border border-green-200' };
        } else {
            return { label: 'PENDENTE', class: 'bg-yellow-50 text-yellow-600 border border-yellow-200' };
        }
    };

    const filteredContracts = contracts.filter(contract =>
        contract.nome_cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contract.servico.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contract.pago.toString().includes(searchTerm) ||
        contract.receber.toString().includes(searchTerm)
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Contratos</h2>
                    <p className="text-sm text-gray-500 mt-1">Gerencie seus contratos e pagamentos</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                    <Plus size={16} />
                    Novo Contrato
                </button>
            </div>

            {/* Search Bar */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                    type="text"
                    placeholder="Buscar por cliente, serviço ou valor..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
            </div>

            {/* Cards Grid */}
            {filteredContracts.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                    <FileText size={48} className="mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500 text-lg">Nenhum contrato encontrado</p>
                    <p className="text-gray-400 text-sm mt-2">Clique em "Novo Contrato" para adicionar um</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredContracts.map((contract) => {
                        const status = getStatusBadge(contract);
                        const progressPercentage = (contract.pago / contract.receber) * 100;

                        return (
                            <div
                                key={contract.id}
                                className="bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all duration-300 overflow-hidden group cursor-pointer relative"
                                onClick={() => handleDetails(contract)}
                            >
                                {/* Card Header */}
                                <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4 text-white">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex-1">
                                            <h3 className="font-bold text-lg truncate">{contract.nome_cliente}</h3>
                                            <p className="text-blue-100 text-sm truncate">{contract.servico}</p>
                                        </div>
                                        <div className="relative">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setOpenMenuId(openMenuId === contract.id ? null : contract.id);
                                                }}
                                                className="p-1.5 hover:bg-blue-400/30 rounded-lg transition-colors"
                                            >
                                                <MoreVertical size={18} />
                                            </button>

                                            {/* Dropdown Menu */}
                                            {openMenuId === contract.id && (
                                                <div
                                                    className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 z-30"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDetails(contract);
                                                        }}
                                                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 rounded-t-lg"
                                                    >
                                                        <FileText size={14} />
                                                        Ver Detalhes
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleEdit(contract);
                                                        }}
                                                        className="w-full px-4 py-2 text-left text-sm text-blue-600 hover:bg-blue-50 flex items-center gap-2"
                                                    >
                                                        <Edit2 size={14} />
                                                        Editar
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDelete(contract);
                                                        }}
                                                        className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 rounded-b-lg"
                                                    >
                                                        <Trash2 size={14} />
                                                        Excluir
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${status.class} bg-white`}>
                                        {status.label}
                                    </span>
                                </div>

                                {/* Card Body */}
                                <div className="p-4 space-y-4">
                                    {/* Financial Info */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="bg-green-50 rounded-lg p-3 border border-green-100">
                                            <p className="text-xs text-green-600 font-medium mb-1">Pago</p>
                                            <p className="text-lg font-bold text-green-700">
                                                R$ {contract.pago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </p>
                                        </div>
                                        <div className="bg-orange-50 rounded-lg p-3 border border-orange-100">
                                            <p className="text-xs text-orange-600 font-medium mb-1">A Receber</p>
                                            <p className="text-lg font-bold text-orange-700">
                                                R$ {contract.receber.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Progress Bar */}
                                    <div>
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-xs text-gray-500 font-medium">Progresso</span>
                                            <span className="text-xs text-gray-700 font-semibold">
                                                {Math.min(progressPercentage, 100).toFixed(0)}%
                                            </span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                                            <div
                                                className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-500"
                                                style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                                            />
                                        </div>
                                    </div>

                                    {/* Contract Period */}
                                    <div className="pt-2 border-t border-gray-100">
                                        <p className="text-xs text-gray-500 mb-1">Período do Contrato</p>
                                        <p className="text-sm text-gray-700 font-medium">
                                            {formatDateBR(contract.inicio_contrato)} - {formatDateBR(contract.final_contrato)}
                                        </p>
                                    </div>

                                    {/* Installments */}
                                    {contract.parcela && (
                                        <div className="flex items-center gap-2 text-sm">
                                            <div className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-medium">
                                                {contract.parcela}x parcelas
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Card Footer - Click to view details hint */}
                                <div className="bg-gray-50 px-4 py-2 border-t border-gray-100">
                                    <p className="text-xs text-gray-500 text-center group-hover:text-blue-600 transition-colors">
                                        Clique para ver todos os detalhes
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modal de Formulário */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-gray-900">
                                {editingId ? 'Editar Contrato' : 'Novo Contrato'}
                            </h3>
                            <button
                                onClick={() => {
                                    setIsModalOpen(false);
                                    setEditingId(null);
                                }}
                                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Cliente</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.nome_cliente}
                                        onChange={(e) => setFormData({ ...formData, nome_cliente: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="Ex: João Silva"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Serviço</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.servico}
                                        onChange={(e) => setFormData({ ...formData, servico: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="Ex: Desenvolvimento Web"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Valor Pago</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        required
                                        value={formData.pago}
                                        onChange={(e) => setFormData({ ...formData, pago: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="0,00"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Valor a Receber</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        required
                                        value={formData.receber}
                                        onChange={(e) => setFormData({ ...formData, receber: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="0,00"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Data de Pagamento</label>
                                    <input
                                        type="date"
                                        value={formData.data_pagamento}
                                        onChange={(e) => setFormData({ ...formData, data_pagamento: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>



                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Início do Contrato</label>
                                    <input
                                        type="date"
                                        required
                                        value={formData.inicio_contrato}
                                        onChange={(e) => {
                                            const newFormData = { ...formData, inicio_contrato: e.target.value };
                                            setFormData(newFormData);
                                            const max = calculateMaxParcelas(e.target.value, formData.final_contrato);
                                            setMaxParcelas(max);
                                        }}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Fim do Contrato</label>
                                    <input
                                        type="date"
                                        required
                                        value={formData.final_contrato}
                                        onChange={(e) => {
                                            const newFormData = { ...formData, final_contrato: e.target.value };
                                            setFormData(newFormData);
                                            const max = calculateMaxParcelas(formData.inicio_contrato, e.target.value);
                                            setMaxParcelas(max);
                                        }}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Parcelas (Mensais)</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max={maxParcelas}
                                        value={formData.parcela}
                                        onChange={(e) => setFormData({ ...formData, parcela: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder={`Máx: ${maxParcelas}`}
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        💡 Máximo de {maxParcelas} parcela{maxParcelas > 1 ? 's' : ''} (baseado na duração do contrato)
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-2 pt-4">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsModalOpen(false);
                                        setEditingId(null);
                                    }}
                                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                    {editingId ? 'Atualizar' : 'Salvar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal de Detalhes */}
            {isDetailsOpen && selectedContract && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-gray-900">Detalhes do Contrato</h3>
                            <button
                                onClick={() => setIsDetailsOpen(false)}
                                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-gray-500">Cliente</label>
                                <p className="text-lg font-semibold text-gray-900">{selectedContract.nome_cliente}</p>
                            </div>

                            <div>
                                <label className="text-sm font-medium text-gray-500">Serviço</label>
                                <p className="text-lg text-gray-900">{selectedContract.servico}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-gray-500">Valor Pago</label>
                                    <p className="text-lg font-semibold text-green-600">
                                        R$ {selectedContract.pago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </p>
                                </div>

                                <div>
                                    <label className="text-sm font-medium text-gray-500">A Receber</label>
                                    <p className="text-lg font-semibold text-orange-600">
                                        R$ {selectedContract.receber.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </p>
                                </div>
                            </div>

                            <div>
                                <label className="text-sm font-medium text-gray-500">Período do Contrato</label>
                                <p className="text-lg text-gray-900">
                                    {formatDateBR(selectedContract.inicio_contrato)} até {formatDateBR(selectedContract.final_contrato)}
                                </p>
                            </div>

                            {selectedContract.parcela && (
                                <div>
                                    <label className="text-sm font-medium text-gray-500">Parcelas</label>
                                    <p className="text-lg text-gray-900">{selectedContract.parcela}x</p>
                                </div>
                            )}

                            {selectedContract.data_pagamento && (
                                <div>
                                    <label className="text-sm font-medium text-gray-500">Data de Pagamento</label>
                                    <p className="text-lg text-gray-900">
                                        {formatDateBR(selectedContract.data_pagamento)}
                                    </p>
                                </div>
                            )}

                            <div>
                                <label className="text-sm font-medium text-gray-500">Status</label>
                                <div className="mt-1">
                                    <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(selectedContract).class}`}>
                                        {getStatusBadge(selectedContract).label}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={() => setIsDetailsOpen(false)}
                            className="w-full mt-6 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            Fechar
                        </button>
                    </div>
                </div>
            )}

            {/* Modal de Confirmação de Exclusão */}
            {isDeleteModalOpen && contractToDelete && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                                <Trash2 className="text-red-600" size={24} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">Excluir Contrato</h3>
                                <p className="text-sm text-gray-500">Esta ação não pode ser desfeita</p>
                            </div>
                        </div>

                        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                            <p className="text-sm text-red-800 font-medium mb-2">⚠️ Atenção!</p>
                            <p className="text-sm text-red-700">
                                Ao excluir o contrato de <strong>{contractToDelete.nome_cliente}</strong>,
                                também serão removidos:
                            </p>
                            <ul className="text-sm text-red-700 mt-2 ml-4 space-y-1">
                                <li>• Todos os lançamentos no Fluxo de Caixa</li>
                                <li>• Todas as Contas a Receber vinculadas</li>
                            </ul>
                        </div>

                        <div className="bg-gray-50 rounded-lg p-3 mb-6">
                            <p className="text-xs text-gray-500 mb-1">Contrato:</p>
                            <p className="text-sm font-semibold text-gray-900">{contractToDelete.nome_cliente}</p>
                            <p className="text-sm text-gray-600">{contractToDelete.servico}</p>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setIsDeleteModalOpen(false);
                                    setContractToDelete(null);
                                }}
                                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium flex items-center justify-center gap-2"
                            >
                                <Trash2 size={16} />
                                Excluir
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Contracts;
