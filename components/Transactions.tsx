

import React, { useState, useMemo } from 'react';
import { Plus, Trash2, Edit2, Search, ArrowUp, ArrowDown, Loader2, CheckCircle, AlertTriangle, Maximize2, Save } from 'lucide-react';
import { Transaction, Category, TransactionType } from '../types';
import { supabase } from '../lib/supabase';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface TransactionsProps {
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  categories: Category[];
}

const Transactions: React.FC<TransactionsProps> = ({ transactions, setTransactions, categories }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    type: 'INCOME' as TransactionType,
    date: new Date().toISOString().split('T')[0],
    categoryId: '',
    subCategoryId: '',
    notas: '',
    tags: [] as string[]
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'description' | 'amount' | 'category'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterCategoryId, setFilterCategoryId] = useState('');
  const [filterSubCategoryId, setFilterSubCategoryId] = useState('');

  // Estados de UI
  const [chartModalOpen, setChartModalOpen] = useState(false);
  const [chartModalType, setChartModalType] = useState<'income' | 'expense'>('income');
  const [selectedCategoryIdForDetail, setSelectedCategoryIdForDetail] = useState<string | null>(null);

  // Calcular todas as tags únicas usadas
  const availableTags = useMemo(() => {
    const allTags = transactions
      .flatMap(t => t.tags || [])
      .filter(tag => tag && tag.trim() !== '');

    // Remover duplicatas e ordenar alfabeticamente
    return Array.from(new Set(allTags)).sort();
  }, [transactions]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSyncStatus('idle');


    const transactionData = {
      Descrição: formData.description,
      Valor: parseFloat(formData.amount),
      tipo: formData.type,
      Data: formData.date,
      categoria_id: formData.categoryId && formData.categoryId !== '' ? formData.categoryId : null,
      subcategoria_id: formData.subCategoryId && formData.subCategoryId !== '' ? formData.subCategoryId : null,
      notas: formData.notas || null,
      tags: formData.tags.length > 0 ? formData.tags : null
    };


    try {
      if (editingId) {
        const { data, error } = await supabase
          .from('Fluxo de caixa')
          .update(transactionData)
          .eq('id', editingId)
          .select();

        if (error) throw error;

        const updated: Transaction = {
          id: data[0].id,
          date: data[0].Data,
          description: data[0].Descrição,
          amount: data[0].Valor,
          type: data[0].tipo,
          categoryId: data[0].categoria_id,
          subCategoryId: data[0].subcategoria_id,
          notas: data[0].notas || '',
          tags: data[0].tags || []
        };
        setTransactions(prev => prev.map(t => t.id === editingId ? updated : t));
      } else {
        const { data, error } = await supabase
          .from('Fluxo de caixa')
          .insert([transactionData])
          .select();

        if (error) throw error;

        const inserted: Transaction = {
          id: data[0].id,
          date: data[0].Data,
          description: data[0].Descrição,
          amount: data[0].Valor,
          type: data[0].tipo,
          categoryId: data[0].categoria_id,
          subCategoryId: data[0].subcategoria_id,
          notas: data[0].notas || '',
          tags: data[0].tags || []
        };
        setTransactions(prev => [inserted, ...prev]);
      }
      setSyncStatus('success');
      setTimeout(() => handleCloseModal(), 1000);
    } catch (error) {
      console.error("Erro ao salvar:", error);
      setSyncStatus('error');
      alert("Falha ao sincronizar com o banco de dados.");
    } finally {
      setIsSubmitting(false);
    }
  };


  const handleEdit = (transaction: Transaction) => {
    setEditingId(transaction.id);

    // Converter data para formato YYYY-MM-DD se necessário
    let formattedDate = transaction.date;
    if (transaction.date && !transaction.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      // Se a data não está no formato YYYY-MM-DD, tentar converter
      const dateObj = new Date(transaction.date);
      if (!isNaN(dateObj.getTime())) {
        formattedDate = dateObj.toISOString().split('T')[0];
      }
    }

    setFormData({
      description: transaction.description,
      amount: transaction.amount.toString(),
      type: transaction.type,
      date: formattedDate,
      categoryId: transaction.categoryId,
      subCategoryId: transaction.subCategoryId || '',
      notas: transaction.notas || '',
      tags: transaction.tags || []
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Deseja realmente excluir este registro do Fluxo de Caixa?')) {
      try {
        const { error } = await supabase.from('Fluxo de caixa').delete().eq('id', id);
        if (error) throw error;
        setTransactions(prev => prev.filter(t => t.id !== id));
        alert("Excluído com sucesso no Supabase.");
      } catch (error) {
        console.error("Erro ao deletar:", error);
        alert("Erro ao remover do banco de dados.");
      }
    }
  };

  const handleDeleteAll = async () => {
    const confirmMessage = `⚠️ ATENÇÃO! Esta ação irá EXCLUIR TODOS OS ${transactions.length} REGISTROS da tabela "Fluxo de caixa" no Supabase.\n\nEsta ação é IRREVERSÍVEL!\n\nDigite "EXCLUIR TUDO" para confirmar:`;

    const userInput = prompt(confirmMessage);

    if (userInput === 'EXCLUIR TUDO') {
      try {
        // Deleta TODOS os registros da tabela
        const { error } = await supabase
          .from('Fluxo de caixa')
          .delete()
          .neq('id', 0); // Deleta onde id != 0 (ou seja, todos)

        if (error) throw error;

        setTransactions([]);
        alert(`✅ Sucesso! Todos os ${transactions.length} registros foram excluídos do Supabase.`);
      } catch (error) {
        console.error('Erro ao deletar todos os registros:', error);
        alert('❌ Erro ao excluir registros do banco de dados.');
      }
    } else if (userInput !== null) {
      alert('❌ Exclusão cancelada. Texto de confirmação incorreto.');
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setSyncStatus('idle');
    setFormData({
      description: '',
      amount: '',
      type: 'INCOME',
      date: new Date().toISOString().split('T')[0],
      categoryId: '',
      subCategoryId: ''
    });
  };

  // Filtrar transações
  const filteredTransactions = transactions.filter(transaction => {
    // Filtro de busca por texto
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const date = new Date(transaction.date).toLocaleDateString('pt-BR');
      const description = transaction.description.toLowerCase();
      const amount = transaction.amount.toString();
      const category = categories.find(c => c.id === transaction.categoryId)?.name || '';

      const matchesSearch = date.includes(search) ||
        description.includes(search) ||
        amount.includes(search) ||
        category.toLowerCase().includes(search);

      if (!matchesSearch) return false;
    }

    // Filtro de data inicial
    if (startDate) {
      const transactionDate = new Date(transaction.date);
      const filterStartDate = new Date(startDate);
      if (transactionDate < filterStartDate) return false;
    }

    // Filtro de data final
    if (endDate) {
      const transactionDate = new Date(transaction.date);
      const filterEndDate = new Date(endDate);
      // Adicionar 23:59:59 ao final do dia para incluir transações do dia final
      filterEndDate.setHours(23, 59, 59, 999);
      if (transactionDate > filterEndDate) return false;
    }


    // Filtro de categoria
    if (filterCategoryId) {
      if (filterCategoryId === 'SEM_CATEGORIA') {
        // Mostrar apenas transações sem categoria
        if (transaction.categoryId && transaction.categoryId !== '') return false;
      } else {
        // Filtro normal de categoria
        if (String(transaction.categoryId) !== String(filterCategoryId)) return false;
      }
    }

    // Filtro de subcategoria
    if (filterSubCategoryId) {
      if (String(transaction.subCategoryId) !== String(filterSubCategoryId)) return false;
    }


    return true;
  });

  // Ordenar transações
  const sortedTransactions = [...filteredTransactions].sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case 'date':
        comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
        break;
      case 'description':
        comparison = a.description.localeCompare(b.description);
        break;
      case 'amount':
        comparison = a.amount - b.amount;
        break;
      case 'category':
        const catA = categories.find(c => c.id === a.categoryId)?.name || '';
        const catB = categories.find(c => c.id === b.categoryId)?.name || '';
        comparison = catA.localeCompare(catB);
        break;
    }

    return sortOrder === 'asc' ? comparison : -comparison;
  });

  // Calcular dados para gráfico de pizza - usando transações FILTRADAS
  const chartData = useMemo(() => {
    const incomeByCategory: { [key: string]: number } = {};
    const expenseByCategory: { [key: string]: number } = {};

    // Usar sortedTransactions para que os gráficos reflitam os filtros
    sortedTransactions.forEach(transaction => {
      const category = categories.find(c => String(c.id) === String(transaction.categoryId));
      const categoryName = category?.name || 'Sem Categoria';

      if (transaction.type === 'INCOME') {
        incomeByCategory[categoryName] = (incomeByCategory[categoryName] || 0) + transaction.amount;
      } else {
        expenseByCategory[categoryName] = (expenseByCategory[categoryName] || 0) + transaction.amount;
      }
    });

    const incomeData = Object.entries(incomeByCategory).map(([name, value]) => {
      const category = categories.find(c => c.name === name);
      return {
        name,
        value,
        percentage: 0,
        color: category?.color || '#10b981'
      };
    });

    const expenseData = Object.entries(expenseByCategory).map(([name, value]) => {
      const category = categories.find(c => c.name === name);
      return {
        name,
        value,
        percentage: 0,
        color: category?.color || '#ef4444'
      };
    });

    // Calcular percentuais
    const totalIncome = incomeData.reduce((sum, item) => sum + item.value, 0);
    const totalExpense = expenseData.reduce((sum, item) => sum + item.value, 0);

    incomeData.forEach(item => {
      item.percentage = totalIncome > 0 ? (item.value / totalIncome) * 100 : 0;
    });

    expenseData.forEach(item => {
      item.percentage = totalExpense > 0 ? (item.value / totalExpense) * 100 : 0;
    });

    return { incomeData, expenseData, totalIncome, totalExpense };
  }, [sortedTransactions, categories]); // Dependências atualizadas

  // Calcular dados de subcategorias para a categoria selecionada (drill-down)
  const subCategoryChartData = useMemo(() => {
    if (!selectedCategoryIdForDetail) return [];

    const category = categories.find(c => String(c.id) === String(selectedCategoryIdForDetail));
    if (!category) return [];

    const subTotals: { [key: string]: number } = {};
    const categoryTransactions = sortedTransactions.filter(t =>
      String(t.categoryId) === String(selectedCategoryIdForDetail)
    );

    categoryTransactions.forEach(t => {
      const subCat = category.subCategories.find(sc => String(sc.id) === String(t.subCategoryId));
      const subName = subCat?.name || 'Sem Subcategoria';
      subTotals[subName] = (subTotals[subName] || 0) + t.amount;
    });

    const total = Object.values(subTotals).reduce((sum, val) => sum + val, 0);

    return Object.entries(subTotals).map(([name, value], index) => ({
      name,
      value,
      percentage: total > 0 ? (value / total) * 100 : 0,
      // Gerar variações de cores baseadas na cor da categoria
      color: `hsla(${210 + (index * 45)}, 70%, 50%, 0.8)`
    }));
  }, [selectedCategoryIdForDetail, sortedTransactions, categories]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center gap-4">
        <div className="relative w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Buscar por data, descrição ou valor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Filtros de Ordenação */}
        <div className="flex gap-3 items-center">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-slate-600">Ordenar por:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            >
              <option value="date">Data</option>
              <option value="description">Descrição</option>
              <option value="amount">Valor</option>
              <option value="category">Categoria</option>
            </select>
          </div>

          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as any)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
          >
            <option value="asc">Crescente</option>
            <option value="desc">Decrescente</option>
          </select>
        </div>

        <div className="flex gap-3">
          {transactions.length > 0 && (
            <button
              onClick={handleDeleteAll}
              className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors border-2 border-rose-600 hover:border-rose-700"
            >
              <AlertTriangle size={18} /> Limpar Tudo
            </button>
          )}
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus size={18} /> Novo Registro
          </button>
        </div>
      </div>

      {/* Filtros: Data, Categoria e Subcategoria */}
      <div className="flex flex-wrap items-center gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
        {/* Filtro de Período */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-slate-600 whitespace-nowrap">Período:</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
          />
          <span className="text-slate-500">até</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
          />
        </div>

        {/* Filtro de Categoria */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-slate-600 whitespace-nowrap">Categoria:</label>
          <select
            value={filterCategoryId}
            onChange={(e) => {
              setFilterCategoryId(e.target.value);
              setFilterSubCategoryId('');
            }}
            className="px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm min-w-[150px]"
          >
            <option value="">Todas</option>
            <option value="SEM_CATEGORIA">Sem Categoria</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>

        {/* Filtro de Subcategoria (aparece se categoria selecionada) */}
        {filterCategoryId && (
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-slate-600 whitespace-nowrap">Subcategoria:</label>
            <select
              value={filterSubCategoryId}
              onChange={(e) => setFilterSubCategoryId(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm min-w-[150px]"
            >
              <option value="">Todas</option>
              {categories
                .find(c => String(c.id) === String(filterCategoryId))
                ?.subCategories?.map(sub => (
                  <option key={sub.id} value={sub.id}>{sub.name}</option>
                ))}
            </select>
          </div>
        )}

        {/* Botão Limpar Filtros */}
        {(startDate || endDate || filterCategoryId || filterSubCategoryId) && (
          <button
            onClick={() => {
              setStartDate('');
              setEndDate('');
              setFilterCategoryId('');
              setFilterSubCategoryId('');
            }}
            className="px-3 py-2 text-sm text-slate-600 hover:text-indigo-600 font-medium transition-colors"
          >
            Limpar Filtros
          </button>
        )}

        {/* Contador de Transações */}
        <div className="ml-auto text-sm text-slate-600">
          <span className="font-medium">{sortedTransactions.length}</span> de <span className="font-medium">{transactions.length}</span> transações
        </div>
      </div>

      {/* Gráficos de Pizza */}
      {transactions.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Gráfico de Entradas */}
          {chartData.incomeData.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 relative hover:shadow-md transition-shadow">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                  Entradas por Categoria
                </h3>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setChartModalType('income');
                    setSelectedCategoryIdForDetail(null);
                    setChartModalOpen(true);
                  }}
                  className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                  title="Ampliar gráfico"
                >
                  <Maximize2 size={18} />
                </button>
              </div>
              <div className="text-center mb-2">
                <p className="text-2xl font-bold text-emerald-600">
                  R$ {chartData.totalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-sm text-slate-500">Total de Entradas</p>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={chartData.incomeData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {chartData.incomeData.map((entry: any, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.color}
                        className="cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => {
                          const category = categories.find(c => c.name === entry.name);
                          if (category) {
                            setSelectedCategoryIdForDetail(category.id);
                            setChartModalType('income');
                            setChartModalOpen(true);
                          }
                        }}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Gráfico de Saídas */}
          {chartData.expenseData.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 relative hover:shadow-md transition-shadow">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                  Saídas por Categoria
                </h3>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setChartModalType('expense');
                    setSelectedCategoryIdForDetail(null);
                    setChartModalOpen(true);
                  }}
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  title="Ampliar gráfico"
                >
                  <Maximize2 size={18} />
                </button>
              </div>
              <div className="text-center mb-2">
                <p className="text-2xl font-bold text-rose-600">
                  R$ {chartData.totalExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-sm text-slate-500">Total de Saídas</p>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={chartData.expenseData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {chartData.expenseData.map((entry: any, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.color}
                        className="cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => {
                          const category = categories.find(c => c.name === entry.name);
                          if (category) {
                            setSelectedCategoryIdForDetail(category.id);
                            setChartModalType('expense');
                            setChartModalOpen(true);
                          }
                        }}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* Modal de Gráfico Expandido / Drill-Down */}
      {chartModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4" onClick={() => setChartModalOpen(false)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full ${chartModalType === 'income' ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                  {selectedCategoryIdForDetail
                    ? `Detalhamento: ${categories.find(c => c.id === selectedCategoryIdForDetail)?.name}`
                    : (chartModalType === 'income' ? 'Entradas por Categoria' : 'Saídas por Categoria')
                  }
                </h2>
                {selectedCategoryIdForDetail && (
                  <button
                    onClick={() => setSelectedCategoryIdForDetail(null)}
                    className="text-sm text-indigo-600 font-medium hover:underline mt-1"
                  >
                    ← Voltar para visão geral
                  </button>
                )}
              </div>
              <button
                onClick={() => setChartModalOpen(false)}
                className="w-10 h-10 flex items-center justify-center bg-slate-100 text-slate-500 hover:bg-rose-100 hover:text-rose-600 rounded-full transition-all font-bold text-xl"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8">
              <div className="mb-8 text-center">
                <p className={`text-4xl font-extrabold ${chartModalType === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                  R$ {
                    (selectedCategoryIdForDetail
                      ? subCategoryChartData.reduce((sum, item) => sum + item.value, 0)
                      : (chartModalType === 'income' ? chartData.totalIncome : chartData.totalExpense)
                    ).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
                  }
                </p>
                <p className="text-slate-500 mt-2 font-medium">
                  {selectedCategoryIdForDetail ? 'Total da Categoria' : `Total de ${chartModalType === 'income' ? 'Entradas' : 'Saídas'}`}
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={selectedCategoryIdForDetail ? subCategoryChartData : (chartModalType === 'income' ? chartData.incomeData : chartData.expenseData)}
                        cx="50%"
                        cy="50%"
                        innerRadius={selectedCategoryIdForDetail ? 80 : 0}
                        outerRadius={150}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percentage }) => `${name}: ${percentage.toFixed(1)}%`}
                      >
                        {(selectedCategoryIdForDetail ? subCategoryChartData : (chartModalType === 'income' ? chartData.incomeData : chartData.expenseData)).map((entry: any, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.color}
                            className={!selectedCategoryIdForDetail ? "cursor-pointer hover:opacity-80" : ""}
                            onClick={() => {
                              if (!selectedCategoryIdForDetail) {
                                const category = categories.find(c => c.name === entry.name);
                                if (category) setSelectedCategoryIdForDetail(category.id);
                              }
                            }}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-4">
                  <h4 className="font-bold text-slate-700 uppercase text-xs tracking-wider mb-4 border-b pb-2">
                    {selectedCategoryIdForDetail ? 'Subcategorias' : 'Categorias'}
                  </h4>
                  <div className="grid grid-cols-1 gap-3 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                    {(selectedCategoryIdForDetail ? subCategoryChartData : (chartModalType === 'income' ? chartData.incomeData : chartData.expenseData)).map((item: any, index) => (
                      <div
                        key={index}
                        className={`flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors ${!selectedCategoryIdForDetail ? 'cursor-pointer' : ''}`}
                        onClick={() => {
                          if (!selectedCategoryIdForDetail) {
                            const category = categories.find(c => c.name === item.name);
                            if (category) setSelectedCategoryIdForDetail(category.id);
                          }
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                          <span className="font-semibold text-slate-700">{item.name}</span>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-slate-900 text-sm">R$ {item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                          <p className="text-[10px] text-slate-400 font-bold">{item.percentage.toFixed(1)}%</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Data</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Descrição</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Categoria</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Subcategoria</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Valor</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sortedTransactions.length > 0 ? (
              sortedTransactions.map(t => {
                const category = categories.find(c => String(c.id) === String(t.categoryId));
                const subCategory = category?.subCategories?.find(sub => String(sub.id) === String(t.subCategoryId));

                return (
                  <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 text-sm text-slate-600">{new Date(t.date).toLocaleDateString('pt-BR')}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className={`p-1 rounded-full ${t.type === 'INCOME' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                          {t.type === 'INCOME' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                        </div>
                        <span className="text-sm font-medium text-slate-800">{t.description}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={t.categoryId || ''}
                        onChange={async (e) => {
                          const newCategoryId = e.target.value;
                          try {
                            const { error } = await supabase
                              .from('Fluxo de caixa')
                              .update({ categoria_id: newCategoryId, subcategoria_id: null })
                              .eq('id', t.id);

                            if (error) throw error;

                            setTransactions(prev => prev.map(trans =>
                              trans.id === t.id
                                ? { ...trans, categoryId: newCategoryId, subCategoryId: '' }
                                : trans
                            ));
                          } catch (error) {
                            console.error('Erro ao atualizar categoria:', error);
                            alert('Erro ao atualizar categoria');
                          }
                        }}
                        className="text-sm text-slate-700 bg-transparent border border-slate-200 rounded px-2 py-1 hover:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      >
                        <option value="">Sem Categoria</option>
                        {categories.filter(c => c.type === t.type).map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      {category && category.subCategories.length > 0 ? (
                        <select
                          value={t.subCategoryId || ''}
                          onChange={async (e) => {
                            const newSubCategoryId = e.target.value;
                            try {
                              const { error } = await supabase
                                .from('Fluxo de caixa')
                                .update({ subcategoria_id: newSubCategoryId || null })
                                .eq('id', t.id);

                              if (error) throw error;

                              setTransactions(prev => prev.map(trans =>
                                trans.id === t.id
                                  ? { ...trans, subCategoryId: newSubCategoryId }
                                  : trans
                              ));
                            } catch (error) {
                              console.error('Erro ao atualizar subcategoria:', error);
                              alert('Erro ao atualizar subcategoria');
                            }
                          }}
                          className="text-sm text-slate-600 bg-transparent border border-slate-200 rounded px-2 py-1 hover:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        >
                          <option value="">Nenhuma</option>
                          {category.subCategories.map(sub => (
                            <option key={sub.id} value={sub.id}>{sub.name}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-xs text-slate-400">-</span>
                      )}
                    </td>
                    <td className={`px-6 py-4 text-sm font-bold text-right ${t.type === 'INCOME' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {t.type === 'INCOME' ? '+' : '-'} R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => handleEdit(t)} className="p-2 text-slate-400 hover:text-indigo-600 transition-colors">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => handleDelete(t.id)} className="p-2 text-slate-400 hover:text-rose-600 transition-colors">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-medium">Nenhum dado encontrado em "Fluxo de caixa"</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {
        isModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-slate-200 px-8 py-6 flex justify-between items-center">
                <h2 className="text-xl font-bold text-slate-800">{editingId ? 'Editar Registro' : 'Novo Registro'}</h2>
                <button
                  onClick={handleCloseModal}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'INCOME' })}
                    className={`py-3 rounded-xl border-2 font-bold transition-all ${formData.type === 'INCOME' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-100 text-slate-400'}`}
                  >
                    Entrada
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'EXPENSE' })}
                    className={`py-3 rounded-xl border-2 font-bold transition-all ${formData.type === 'EXPENSE' ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-slate-100 text-slate-400'}`}
                  >
                    Saída
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Descrição</label>
                    <input
                      type="text"
                      required
                      value={formData.description}
                      onChange={e => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Data</label>
                    <input
                      type="date"
                      required
                      value={formData.date}
                      onChange={e => setFormData({ ...formData, date: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Valor</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={formData.amount}
                      onChange={e => setFormData({ ...formData, amount: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Categoria</label>
                    <select
                      required
                      value={formData.categoryId}
                      onChange={e => setFormData({ ...formData, categoryId: e.target.value, subCategoryId: '' })}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Selecione...</option>
                      {categories.filter(c => c.type === formData.type).map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Subcategoria - aparece depois de selecionar categoria */}
                {formData.categoryId && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Subcategoria {categories.find(c => String(c.id) === String(formData.categoryId))?.subCategories?.length > 0 ? '' : '(Esta categoria não tem subcategorias)'}
                    </label>
                    <select
                      value={formData.subCategoryId}
                      onChange={e => setFormData({ ...formData, subCategoryId: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      disabled={!categories.find(c => String(c.id) === String(formData.categoryId))?.subCategories?.length}
                    >
                      <option value="">Nenhuma</option>
                      {categories.find(c => String(c.id) === String(formData.categoryId))?.subCategories?.map(sub => (
                        <option key={sub.id} value={sub.id}>{sub.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Campo de Notas */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Notas</label>
                  <textarea
                    value={formData.notas}
                    onChange={e => setFormData({ ...formData, notas: e.target.value })}
                    placeholder="Adicione observações sobre este lançamento..."
                    rows={3}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  />
                </div>

                {/* Campo de Tags */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tags</label>
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={formData.tags.join(', ')}
                      onChange={e => {
                        const tagsInput = e.target.value;
                        const tagsArray = tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag !== '');
                        setFormData({ ...formData, tags: tagsArray });
                      }}
                      placeholder="Digite tags separadas por vírgula (ex: urgente, fiscal, recorrente)"
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />

                    {/* Tags Selecionadas */}
                    {formData.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {formData.tags.map((tag, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-100 text-indigo-700 text-sm rounded-full"
                          >
                            {tag}
                            <button
                              type="button"
                              onClick={() => {
                                const newTags = formData.tags.filter((_, i) => i !== index);
                                setFormData({ ...formData, tags: newTags });
                              }}
                              className="hover:text-indigo-900"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Sugestões de Tags Disponíveis */}
                    {availableTags.length > 0 && (
                      <div className="border-t border-slate-200 pt-2">
                        <p className="text-xs text-slate-500 mb-2">Tags disponíveis (clique para adicionar):</p>
                        <div className="flex flex-wrap gap-2">
                          {availableTags.map((tag, index) => {
                            const isSelected = formData.tags.includes(tag);
                            return (
                              <button
                                key={index}
                                type="button"
                                onClick={() => {
                                  if (!isSelected) {
                                    setFormData({ ...formData, tags: [...formData.tags, tag] });
                                  }
                                }}
                                disabled={isSelected}
                                className={`px-3 py-1 text-sm rounded-full transition-colors ${isSelected
                                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                  : 'bg-slate-50 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 border border-slate-200 hover:border-indigo-300'
                                  }`}
                              >
                                {tag}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Mensagem de Sucesso */}
                {syncStatus === 'success' && (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-emerald-700">
                    <CheckCircle size={20} />
                    <span className="font-medium">Registro salvo com sucesso!</span>
                  </div>
                )}

                <div className="flex gap-4 pt-6 border-t border-slate-200">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={handleCloseModal}
                    className="flex-1 py-3 text-slate-600 font-medium hover:bg-slate-50 rounded-lg transition-colors border border-slate-200"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                    {editingId ? 'Atualizar' : 'Sincronizar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )
      }
    </div >
  );
};

export default Transactions;
