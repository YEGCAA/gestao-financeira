
import React, { useState } from 'react';
import { Plus, MoreVertical, FileText, X, Edit2, Trash2, Search } from 'lucide-react';
import { Contract, Bill, Transaction } from '../types';
import { supabase } from '../lib/supabase';
import ConfirmModal from './ConfirmModal';

interface ContractsProps {
    contracts: Contract[];
    setContracts: React.Dispatch<React.SetStateAction<Contract[]>>;
    setBills: React.Dispatch<React.SetStateAction<Bill[]>>;
    setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
}

const Contracts: React.FC<ContractsProps> = ({ contracts, setContracts, setBills, setTransactions }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; id: string | null }>({
        isOpen: false,
        id: null
    });
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
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
    const [maxParcelas, setMaxParcelas] = useState<number | null>(null);

    // Calcular diferença de meses entre duas datas
    const calcularDiferencaMeses = (dataInicio: string, dataFim: string): number => {
        if (!dataInicio || !dataFim) return 0;

        const inicio = new Date(dataInicio);
        const fim = new Date(dataFim);

        const meses = (fim.getFullYear() - inicio.getFullYear()) * 12 + (fim.getMonth() - inicio.getMonth()) + 1;
        return Math.max(1, meses); // Mínimo 1 mês
    };

    // Atualizar máximo de parcelas quando as datas mudarem
    const handleDateChange = (field: 'inicio_contrato' | 'final_contrato', value: string) => {
        const novoFormData = { ...formData, [field]: value };
        setFormData(novoFormData);

        // Calcular máximo de parcelas se ambas as datas estiverem preenchidas
        if (novoFormData.inicio_contrato && novoFormData.final_contrato) {
            const maxParc = calcularDiferencaMeses(novoFormData.inicio_contrato, novoFormData.final_contrato);
            setMaxParcelas(maxParc);

            // Se já tem parcelas definidas e excede o máximo, ajustar
            if (novoFormData.parcela && parseInt(novoFormData.parcela) > maxParc) {
                setFormData({ ...novoFormData, parcela: maxParc.toString() });
            }
        } else {
            setMaxParcelas(null);
        }
    };

    const handleEdit = (contract: Contract) => {
        setEditingId(contract.id);
        const formDataEdit = {
            nome_cliente: contract.nome_cliente,
            servico: contract.servico,
            pago: contract.pago.toString(),
            receber: contract.receber.toString(),
            data_pagamento: contract.data_pagamento || '',
            inicio_contrato: contract.inicio_contrato,
            final_contrato: contract.final_contrato,
            parcela: contract.parcela?.toString() || ''
        };
        setFormData(formDataEdit);

        // Calcular máximo de parcelas
        if (contract.inicio_contrato && contract.final_contrato) {
            const maxParc = calcularDiferencaMeses(contract.inicio_contrato, contract.final_contrato);
            setMaxParcelas(maxParc);
        }

        setIsModalOpen(true);
        setOpenMenuId(null);
    };

    const createMonthlyBills = async (contract: any, parcelas: number, valorReceber: number) => {
        const nomeCliente = contract['Nome cliente'] || contract.nome_cliente;
        const valorPorParcela = valorReceber / parcelas;
        const inicioContrato = new Date(contract.inicio_contrato);
        const bills: any[] = [];

        console.log('📝 Criando parcelas:', { nomeCliente, parcelas, valorPorParcela });

        for (let i = 0; i < parcelas; i++) {
            const dataVencimento = new Date(inicioContrato);
            dataVencimento.setMonth(dataVencimento.getMonth() + i);

            bills.push({
                data: dataVencimento.toISOString().split('T')[0],
                descricao: nomeCliente,
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

            console.log('✅ Parcelas criadas no banco:', data.length);

            // Atualizar estado local
            const newBills: Bill[] = data.map((b: any) => ({
                id: b.id,
                data: b.data,
                descricao: b.descricao,
                entrada: b.entrada,
                saida: b['saída'] || 0
            }));

            setBills(prev => [...newBills, ...prev]);
            console.log('✅ Estado local de Contas atualizado com', newBills.length, 'parcelas');
        } catch (error) {
            console.error('❌ Erro ao criar contas a receber:', error);
        }
    };

    const createCashFlowEntry = async (contract: any, valorPago: number) => {
        if (valorPago <= 0) return;

        try {
            const nomeCliente = contract['Nome cliente'] || contract.nome_cliente;
            const dataHoje = new Date().toISOString().split('T')[0];

            console.log('📝 Criando entrada no Fluxo de Caixa:', {
                nomeCliente,
                data: dataHoje,
                valorPago
            });

            const { data, error } = await supabase
                .from('Fluxo de caixa')
                .insert([{
                    Data: dataHoje,
                    Descrição: nomeCliente,
                    Valor: valorPago,
                    Saldo: 0,
                    tipo: 'INCOME',
                    categoria_id: null,
                    subcategoria_id: null
                }])
                .select();

            if (error) {
                console.error('❌ Erro do Supabase ao criar fluxo de caixa:', error);
                throw error;
            }

            console.log('✅ Entrada criada no Fluxo de Caixa:', data[0]);

            // Atualizar estado local
            const newTransaction: Transaction = {
                id: data[0].id,
                date: data[0].Data || data[0].data,
                description: data[0].Descrição || data[0].descricao,
                amount: data[0].Valor || data[0].valor,
                balance: data[0].Saldo || data[0].saldo,
                type: 'INCOME',
                categoryId: '',
                subCategoryId: ''
            };

            setTransactions(prev => [newTransaction, ...prev]);
            console.log('✅ Estado local do Fluxo de Caixa atualizado');
        } catch (error: any) {
            console.error('❌ Erro ao criar entrada no fluxo de caixa:', error);
            alert(`Erro ao adicionar ao Fluxo de Caixa: ${error.message || 'Erro desconhecido'}`);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const contractData = {
            'Nome cliente': formData.nome_cliente,
            'Serviço': formData.servico,
            'Pago': parseFloat(formData.pago),
            'Receber': parseFloat(formData.receber),
            'data_pagamento': formData.data_pagamento || null,
            'inicio_contrato': formData.inicio_contrato,
            'final_contrato': formData.final_contrato,
            'parcela': formData.parcela ? parseInt(formData.parcela) : null
        };

        try {
            const valorPago = parseFloat(formData.pago);

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

                // Adicionar ao fluxo de caixa também na edição
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

                console.log('🔍 Verificando criação de parcelas:', { parcelas, valorReceber });

                // 1. Criar contas a receber parceladas
                if (parcelas > 0 && valorReceber > 0) {
                    console.log('✅ Criando parcelas em Contas a Receber...');
                    await createMonthlyBills(contractData, parcelas, valorReceber);
                    alert(`✅ Contrato criado com sucesso!\n\n${parcelas} parcelas de R$ ${(valorReceber / parcelas).toFixed(2)} foram adicionadas em "Contas a Pagar/Receber"`);
                } else if (valorReceber > 0) {
                    // Se não tem parcelas mas tem valor a receber, criar uma única entrada
                    console.log('✅ Criando entrada única em Contas a Receber...');
                    await createMonthlyBills(contractData, 1, valorReceber);
                    alert(`✅ Contrato criado com sucesso!\n\nR$ ${valorReceber.toFixed(2)} foi adicionado em "Contas a Pagar/Receber"`);
                }

                // 2. Adicionar ao fluxo de caixa (total pago)
                if (valorPago > 0) {
                    await createCashFlowEntry(contractData, valorPago);
                }
            }

            setIsModalOpen(false);
            setEditingId(null);
            setMaxParcelas(null);
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

    const handleDelete = async (id: string) => {
        try {
            // Buscar o contrato para pegar o nome do cliente
            const contract = contracts.find(c => c.id === id);
            if (!contract) {
                alert('Contrato não encontrado');
                return;
            }

            const nomeCliente = contract.nome_cliente;

            // 1. Deletar todas as contas a pagar/receber relacionadas (com o nome do cliente)
            const { error: billsError } = await supabase
                .from('contas_pagar_receber')
                .delete()
                .eq('descricao', nomeCliente);

            if (billsError) {
                console.error('Erro ao deletar contas relacionadas:', billsError);
                // Continua mesmo se houver erro nas contas
            }

            // Atualizar estado local de bills
            setBills(prev => prev.filter(b => b.descricao !== nomeCliente));

            // 2. Deletar entrada do Fluxo de Caixa relacionada (com o nome do cliente)
            const { error: cashFlowError } = await supabase
                .from('Fluxo de caixa')
                .delete()
                .eq('Descrição', nomeCliente);

            if (cashFlowError) {
                console.error('Erro ao deletar do Fluxo de Caixa:', cashFlowError);
                // Continua mesmo se houver erro
            }

            // Atualizar estado local de transactions
            setTransactions(prev => prev.filter(t => t.description !== nomeCliente));

            // 3. Deletar o contrato
            const { error } = await supabase.from('Contratos').delete().eq('id', id);
            if (error) throw error;

            setContracts(prev => prev.filter(c => c.id !== id));
            setOpenMenuId(null);
            setConfirmDelete({ isOpen: false, id: null });

            console.log(`✅ Contrato, contas e fluxo de caixa de "${nomeCliente}" foram removidos`);
            alert(`✅ Contrato removido com sucesso!\n\nTodas as parcelas de "${nomeCliente}" foram removidas de "Contas a Pagar/Receber" e do "Fluxo de Caixa".`);
        } catch (error) {
            console.error("Erro ao deletar:", error);
            alert("Erro ao remover contrato.");
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

    // Filtrar contratos
    const filteredContracts = contracts.filter(contract => {
        if (!searchTerm) return true;

        const search = searchTerm.toLowerCase();
        const cliente = contract.nome_cliente.toLowerCase();
        const servico = contract.servico.toLowerCase();

        return cliente.includes(search) || servico.includes(search);
    });

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900">Contratos</h1>
                <div className="flex gap-3">
                    <div className="relative w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar por cliente, serviço ou data..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                        <Plus size={18} />
                        Novo Contrato
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredContracts.map(contract => {
                    const status = getStatusBadge(contract);
                    return (
                        <div key={contract.id} className="bg-white p-5 rounded-xl border border-gray-200 hover:shadow-lg transition-shadow relative">
                            <div className="flex justify-between items-start mb-3">
                                <span className={`text-xs font-bold px-2 py-1 rounded ${status.class}`}>
                                    {status.label}
                                </span>
                                <div className="relative">
                                    <button
                                        onClick={() => setOpenMenuId(openMenuId === contract.id ? null : contract.id)}
                                        className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded transition-colors"
                                    >
                                        <MoreVertical size={18} />
                                    </button>

                                    {/* Dropdown Menu */}
                                    {openMenuId === contract.id && (
                                        <>
                                            <div
                                                className="fixed inset-0 z-10"
                                                onClick={() => setOpenMenuId(null)}
                                            />
                                            <div className="absolute right-0 top-8 z-20 bg-white border border-gray-200 rounded-lg shadow-lg py-1 w-40">
                                                <button
                                                    onClick={() => handleEdit(contract)}
                                                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                                >
                                                    <Edit2 size={14} />
                                                    Editar
                                                </button>
                                                <button
                                                    onClick={() => { setConfirmDelete({ isOpen: true, id: contract.id }); setOpenMenuId(null); }}
                                                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                                >
                                                    <Trash2 size={14} />
                                                    Excluir
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            <h3 className="text-base font-bold text-gray-900 mb-1">{contract.nome_cliente}</h3>
                            <p className="text-sm text-gray-500 mb-4">{contract.servico}</p>

                            <div className="space-y-2 mb-4">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Pago</span>
                                    <span className="font-bold text-green-600">R$ {contract.pago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">A Receber</span>
                                    <span className="font-bold text-blue-600">R$ {contract.receber.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                </div>
                                {contract.parcela && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Parcelas</span>
                                        <span className="font-medium text-purple-600">{contract.parcela}x</span>
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={() => handleDetails(contract)}
                                className="w-full text-blue-600 hover:text-blue-700 font-medium text-sm py-2 hover:bg-blue-50 rounded transition-colors"
                            >
                                Detalhes
                            </button>
                        </div>
                    );
                })}

                {contracts.length === 0 && (
                    <div className="col-span-full text-center py-12">
                        <FileText size={48} className="mx-auto text-gray-300 mb-3" />
                        <p className="text-gray-400 font-medium">Nenhum contrato cadastrado</p>
                    </div>
                )}
            </div>

            {/* Modal de Detalhes */}
            {isDetailsOpen && selectedContract && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-gray-900">Detalhes do Contrato</h2>
                            <button onClick={() => setIsDetailsOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-gray-500">Cliente</label>
                                    <p className="text-lg font-bold text-gray-900">{selectedContract.nome_cliente}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-500">Serviço</label>
                                    <p className="text-lg font-bold text-gray-900">{selectedContract.servico}</p>
                                </div>
                            </div>

                            <div>
                                <label className="text-sm font-medium text-gray-500">Data de Pagamento</label>
                                <p className="text-base text-gray-900">
                                    {selectedContract.data_pagamento ? new Date(selectedContract.data_pagamento).toLocaleDateString('pt-BR') : 'Não pago'}
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-gray-500">Valor Pago</label>
                                    <p className="text-xl font-bold text-green-600">R$ {selectedContract.pago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-500">Valor a Receber</label>
                                    <p className="text-xl font-bold text-blue-600">R$ {selectedContract.receber.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-gray-500">Início do Contrato</label>
                                    <p className="text-base text-gray-900">{new Date(selectedContract.inicio_contrato).toLocaleDateString('pt-BR')}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-500">Fim do Contrato</label>
                                    <p className="text-base text-gray-900">{new Date(selectedContract.final_contrato).toLocaleDateString('pt-BR')}</p>
                                </div>
                            </div>

                            {selectedContract.parcela && (
                                <div>
                                    <label className="text-sm font-medium text-gray-500">Parcelas</label>
                                    <p className="text-lg font-bold text-purple-600">{selectedContract.parcela}x de R$ {(selectedContract.receber / selectedContract.parcela).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                </div>
                            )}

                            <div>
                                <label className="text-sm font-medium text-gray-500">Status</label>
                                <p className={`inline-block mt-1 text-xs font-bold px-3 py-1 rounded ${getStatusBadge(selectedContract).class}`}>
                                    {getStatusBadge(selectedContract).label}
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => {
                                    setIsDetailsOpen(false);
                                    handleEdit(selectedContract);
                                }}
                                className="flex-1 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                Editar
                            </button>
                            <button
                                onClick={() => setIsDetailsOpen(false)}
                                className="flex-1 py-2 text-gray-600 font-medium hover:bg-gray-50 rounded-lg transition-colors"
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Criar/Editar */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl p-6 max-h-[90vh] overflow-y-auto">
                        <h2 className="text-xl font-bold text-gray-900 mb-6">{editingId ? 'Editar Contrato' : 'Novo Contrato'}</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Cliente</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.nome_cliente}
                                    onChange={e => setFormData({ ...formData, nome_cliente: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Ex: Acme Corp"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Serviço</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.servico}
                                    onChange={e => setFormData({ ...formData, servico: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Ex: Consultoria TI Anual"
                                />
                            </div>



                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Pago</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        required
                                        value={formData.pago}
                                        onChange={e => setFormData({ ...formData, pago: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="0,00"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">A Receber</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        required
                                        value={formData.receber}
                                        onChange={e => setFormData({ ...formData, receber: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="0,00"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Data de Pagamento (opcional)</label>
                                <input
                                    type="date"
                                    value={formData.data_pagamento}
                                    onChange={e => setFormData({ ...formData, data_pagamento: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Início do Contrato</label>
                                    <input
                                        type="date"
                                        required
                                        value={formData.inicio_contrato}
                                        onChange={e => handleDateChange('inicio_contrato', e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Fim do Contrato</label>
                                    <input
                                        type="date"
                                        required
                                        value={formData.final_contrato}
                                        onChange={e => handleDateChange('final_contrato', e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>
                            {maxParcelas !== null && (
                                <p className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
                                    📅 Duração do contrato: <strong>{maxParcelas} meses</strong> (parcelas mensais)
                                </p>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-purple-700 mb-1">
                                    Parcelas (Opcional)
                                    {maxParcelas !== null && (
                                        <span className="ml-2 text-xs font-normal text-purple-500">
                                            Máximo: {maxParcelas}x (baseado na duração do contrato)
                                        </span>
                                    )}
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    max={maxParcelas || undefined}
                                    value={formData.parcela}
                                    onChange={e => {
                                        const valor = parseInt(e.target.value);
                                        if (maxParcelas && valor > maxParcelas) {
                                            setFormData({ ...formData, parcela: maxParcelas.toString() });
                                            alert(`O número máximo de parcelas é ${maxParcelas}x (baseado na duração do contrato de ${maxParcelas} meses)`);
                                        } else {
                                            setFormData({ ...formData, parcela: e.target.value });
                                        }
                                    }}
                                    className="w-full px-4 py-2 border border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    placeholder={maxParcelas ? `Máx: ${maxParcelas}x` : "Defina as datas primeiro"}
                                    disabled={!maxParcelas}
                                />
                                <p className="text-xs text-purple-600 mt-1">
                                    💡 Cria automaticamente em "Contas a Receber" mensalmente (1 parcela por mês)
                                </p>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsModalOpen(false);
                                        setEditingId(null);
                                        setMaxParcelas(null);
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

            {/* Modal de Confirmação */}
            <ConfirmModal
                isOpen={confirmDelete.isOpen}
                title="Excluir Contrato"
                message="Tem certeza que deseja excluir este contrato? Isso também removerá todas as parcelas relacionadas em Contas a Pagar/Receber e a entrada no Fluxo de Caixa. Esta ação não pode ser desfeita."
                confirmText="Excluir"
                cancelText="Cancelar"
                onConfirm={() => confirmDelete.id && handleDelete(confirmDelete.id)}
                onCancel={() => setConfirmDelete({ isOpen: false, id: null })}
            />
        </div>
    );
};

export default Contracts;
