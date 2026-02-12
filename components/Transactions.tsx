

import React, { useState, useMemo } from 'react';
import { Plus, Trash2, Edit2, Search, ArrowUp, ArrowDown, Loader2, CheckCircle, AlertTriangle, X, MoreVertical, Palette } from 'lucide-react';
import { Transaction, Category, TransactionType } from '../types';
import { supabase } from '../lib/supabase';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import ConfirmDialog from './ConfirmDialog';

// Função auxiliar para formatar datas sem problemas de timezone
const formatDateBR = (dateString: string): string => {
  if (!dateString) return '';
  const [year, month, day] = dateString.split('T')[0].split('-');
  return `${day}/${month}/${year}`;
};

interface TransactionsProps {
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  categories: Category[];
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
}

const Transactions: React.FC<TransactionsProps> = ({ transactions, setTransactions, categories, setCategories }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; transactionId: string | null }>({ isOpen: false, transactionId: null });
  const colorInputRef = React.useRef<HTMLInputElement>(null);
  const [selectedCatIdForColor, setSelectedCatIdForColor] = useState<string | null>(null);
  const [activeMenuCategory, setActiveMenuCategory] = useState<string | null>(null);
  const [pendingColor, setPendingColor] = useState<{ categoryId: string; color: string } | null>(null);

  // Fechar menu ao clicar fora
  React.useEffect(() => {
    const handleClickOutside = () => setActiveMenuCategory(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

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
  const [fullscreenChart, setFullscreenChart] = useState<'INCOME' | 'EXPENSE' | null>(null);

  const handleUpdateCategoryColor = (categoryId: string, newColor: string) => {
    console.log('🎨 Atualizando cor localmente:', { categoryId, newColor });
    setCategories(prev => prev.map(c => String(c.id) === String(categoryId) ? { ...c, color: newColor } : c));
  };

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
    setDeleteConfirm({ isOpen: true, transactionId: id });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm.transactionId) return;

    try {
      const { error } = await supabase.from('Fluxo de caixa').delete().eq('id', deleteConfirm.transactionId);
      if (error) throw error;
      setTransactions(prev => prev.filter(t => t.id !== deleteConfirm.transactionId));
    } catch (error) {
      console.error("Erro ao deletar:", error);
      alert("Erro ao remover do banco de dados.");
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
      const date = formatDateBR(transaction.date);
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

    // Excluir investimentos do fluxo de caixa
    if (transaction.description.includes('[INVESTIMENTO]')) return false;

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
    const incomeByCategory: { [key: string]: { value: number; id: string | null } } = {};
    const expenseByCategory: { [key: string]: { value: number; id: string | null } } = {};

    // Usar sortedTransactions para que os gráficos reflitam os filtros
    sortedTransactions.forEach(transaction => {
      const category = categories.find(c => String(c.id) === String(transaction.categoryId));
      const categoryName = category?.name || 'Sem Categoria';
      const categoryId = category?.id || null;

      if (transaction.type === 'INCOME') {
        if (!incomeByCategory[categoryName]) incomeByCategory[categoryName] = { value: 0, id: categoryId };
        incomeByCategory[categoryName].value += transaction.amount;
      } else {
        if (!expenseByCategory[categoryName]) expenseByCategory[categoryName] = { value: 0, id: categoryId };
        expenseByCategory[categoryName].value += transaction.amount;
      }
    });

    const incomeData = Object.entries(incomeByCategory).map(([name, data]) => ({
      name,
      value: data.value,
      id: data.id,
      percentage: 0,
      color: data.id ? categories.find(c => String(c.id) === String(data.id))?.color : undefined
    }));

    const expenseData = Object.entries(expenseByCategory)
      .map(([name, data]) => ({
        name,
        value: data.value,
        id: data.id,
        percentage: 0,
        color: data.id ? categories.find(c => String(c.id) === String(data.id))?.color : undefined
      }))
      .sort((a, b) => b.value - a.value);

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

  // Cores para o gráfico - Paleta melhorada e mais vibrante
  const INCOME_COLORS = [
    '#10b981', // Emerald 500
    '#14b8a6', // Teal 500
    '#06b6d4', // Cyan 500
    '#0ea5e9', // Sky 500
    '#3b82f6', // Blue 500
    '#6366f1', // Indigo 500
    '#8b5cf6', // Violet 500
    '#34d399', // Emerald 400
    '#2dd4bf', // Teal 400
    '#22d3ee'  // Cyan 400
  ];

  const EXPENSE_COLORS = [
    '#dc2626', // Vermelho Intenso (para o maior)
    '#4f46e5', // Índigo Premium
    '#7c3aed', // Roxo Violeta
    '#ea580c', // Laranja Queimado
    '#0891b2', // Ciano Profundo
    '#db2777', // Rosa Dark
    '#2563eb', // Azul Royal
    '#d97706', // Âmbar Intenso
    '#475569', // Cinza Ardósia
    '#059669', // Verde Esmeralda (Saída controlada)
  ];

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
          <input
            type="color"
            ref={colorInputRef}
            className="hidden"
            value={pendingColor?.color || categories.find(c => String(c.id) === String(selectedCatIdForColor))?.color || '#000000'}
            onChange={(e) => {
              if (selectedCatIdForColor) {
                setPendingColor({ categoryId: selectedCatIdForColor, color: e.target.value });
                // Re-open menu to show save button
                setActiveMenuCategory(`fs-${selectedCatIdForColor}`);
              }
            }}
          />
          {chartData.incomeData.length > 0 && (
            <div
              onClick={() => setFullscreenChart('INCOME')}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-all cursor-pointer group relative hover:border-indigo-200"
            >
              <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                Entradas por Categoria
              </h3>
              <div className="text-center mb-4">
                <p className="text-3xl font-bold text-emerald-600">
                  R$ {chartData.totalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-sm text-slate-500 mt-1">Total de Entradas</p>
              </div>
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie
                    data={chartData.incomeData}
                    cx="40%"
                    cy="50%"
                    labelLine={false}
                    label={false}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {chartData.incomeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color || INCOME_COLORS[index % INCOME_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '8px 12px'
                    }}
                  />
                  <Legend
                    layout="vertical"
                    align="right"
                    verticalAlign="middle"
                    iconType="circle"
                    content={(props) => {
                      const { payload } = props;
                      return (
                        <ul className="space-y-2 ml-4">
                          {payload?.map((entry: any, index: number) => {
                            const item = entry.payload;
                            const defaultColor = INCOME_COLORS[index % INCOME_COLORS.length];
                            const currentColor = item.color || defaultColor;

                            return (
                              <li key={`item-${index}`} className="flex items-center justify-between text-[11px] font-medium text-slate-600 py-1">
                                <div className="flex items-center min-w-0">
                                  <div
                                    className="w-3 h-3 rounded-full mr-2 shrink-0 shadow-sm border border-slate-100"
                                    style={{ backgroundColor: currentColor }}
                                  />
                                  <span className="truncate max-w-[80px]">{entry.value}</span>
                                  <span className="ml-1 text-slate-400 shrink-0">({item.percentage.toFixed(1)}%)</span>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      );
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-2 text-center text-xs text-slate-400 italic">Clique no gráfico para ampliar e editar</div>
            </div>
          )}

          {/* Gráfico de Saídas */}
          {chartData.expenseData.length > 0 && (
            <div
              onClick={() => setFullscreenChart('EXPENSE')}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-all cursor-pointer group relative hover:border-rose-200"
            >
              <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                Saídas por Categoria
              </h3>
              <div className="text-center mb-4">
                <p className="text-3xl font-bold text-rose-600">
                  R$ {chartData.totalExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-sm text-slate-500 mt-1">Total de Saídas</p>
              </div>
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie
                    data={chartData.expenseData}
                    cx="40%"
                    cy="50%"
                    labelLine={false}
                    label={false}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {chartData.expenseData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color || EXPENSE_COLORS[index % EXPENSE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '8px 12px'
                    }}
                  />
                  <Legend
                    layout="vertical"
                    align="right"
                    verticalAlign="middle"
                    iconType="circle"
                    content={(props) => {
                      const { payload } = props;
                      return (
                        <ul className="space-y-2 ml-4">
                          {payload?.map((entry: any, index: number) => {
                            const item = entry.payload;
                            const defaultColor = EXPENSE_COLORS[index % EXPENSE_COLORS.length];
                            const currentColor = item.color || defaultColor;

                            return (
                              <li key={`item-${index}`} className="flex items-center justify-between text-[11px] font-medium text-slate-600 py-1">
                                <div className="flex items-center min-w-0">
                                  <div
                                    className="w-3 h-3 rounded-full mr-2 shrink-0 shadow-sm border border-slate-100"
                                    style={{ backgroundColor: currentColor }}
                                  />
                                  <span className="truncate max-w-[80px]">{entry.value}</span>
                                  <span className="ml-1 text-slate-400 shrink-0">({item.percentage.toFixed(1)}%)</span>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      );
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-2 text-center text-xs text-slate-400 italic">Clique no gráfico para ampliar e editar</div>
            </div>
          )}
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
                    <td className="px-6 py-4 text-sm text-slate-600">{formatDateBR(t.date)}</td>
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

      {isModalOpen && (
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
      )}

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title="Excluir Transação"
        message="Deseja realmente excluir este registro do Fluxo de Caixa? Esta ação não pode ser desfeita."
        confirmText="Excluir"
        cancelText="Cancelar"
        type="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirm({ isOpen: false, transactionId: null })}
      />

      {/* Modal Gráfico Fullscreen */}
      {fullscreenChart && (
        <div
          className="fixed inset-0 bg-slate-900/90 backdrop-blur-md flex items-center justify-center z-[100] p-4 sm:p-8 animate-in fade-in transition-all"
          onClick={() => setFullscreenChart(null)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                <div className={`w-4 h-4 rounded-full ${fullscreenChart === 'INCOME' ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                {fullscreenChart === 'INCOME' ? 'Análise Detalhada de Entradas' : 'Análise Detalhada de Saídas'}
              </h2>
              <button
                onClick={() => setFullscreenChart(null)}
                className="p-2 hover:bg-slate-200 rounded-full text-slate-400 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 p-8 overflow-y-auto">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full">
                {/* Lado Esquerdo: Gráfico Gigante */}
                <div className="lg:col-span-2 bg-slate-50 rounded-2xl p-6 min-h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={fullscreenChart === 'INCOME' ? chartData.incomeData : chartData.expenseData}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        label={({ name, percentage }) => `${name} (${percentage.toFixed(1)}%)`}
                        outerRadius="80%"
                        fill="#8884d8"
                        dataKey="value"
                        paddingAngle={2}
                      >
                        {(fullscreenChart === 'INCOME' ? chartData.incomeData : chartData.expenseData).map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.color || (fullscreenChart === 'INCOME' ? INCOME_COLORS[index % INCOME_COLORS.length] : EXPENSE_COLORS[index % EXPENSE_COLORS.length])}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                        contentStyle={{
                          backgroundColor: 'white',
                          border: 'none',
                          borderRadius: '16px',
                          boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                          padding: '12px 16px'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Lado Direito: Lista de Categorias e Totais */}
                <div className="space-y-6">
                  <div className={`p-6 rounded-2xl ${fullscreenChart === 'INCOME' ? 'bg-emerald-50' : 'bg-rose-50'}`}>
                    <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Valor Total</p>
                    <p className={`text-4xl font-black ${fullscreenChart === 'INCOME' ? 'text-emerald-700' : 'text-rose-700'}`}>
                      R$ {(fullscreenChart === 'INCOME' ? chartData.totalIncome : chartData.totalExpense).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>

                  <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm overflow-hidden">
                    <h4 className="text-sm font-bold text-slate-800 mb-4 border-b border-slate-50 pb-2">Distribuição por Categoria</h4>
                    <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                      {(fullscreenChart === 'INCOME' ? chartData.incomeData : chartData.expenseData).map((item, index) => {
                        const defaultColor = fullscreenChart === 'INCOME' ? INCOME_COLORS[index % INCOME_COLORS.length] : EXPENSE_COLORS[index % EXPENSE_COLORS.length];
                        const currentColor = item.color || defaultColor;

                        return (
                          <div key={index} className="flex items-center justify-between group">
                            <div className="flex items-center gap-3">
                              <div
                                className="w-3 h-3 rounded-full shrink-0 border border-slate-100"
                                style={{ backgroundColor: currentColor }}
                              ></div>
                              <span className="text-sm font-medium text-slate-700 group-hover:text-indigo-600 transition-colors truncate">{item.name}</span>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <p className="text-sm font-bold text-slate-900">R$ {item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                <p className="text-[10px] font-bold text-slate-400">{item.percentage.toFixed(1)}%</p>
                              </div>

                              {item.id && (
                                <div className="relative shrink-0">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveMenuCategory(activeMenuCategory === `fs-${item.id}` ? null : `fs-${item.id}`);
                                    }}
                                    className="p-2 hover:bg-white rounded-lg text-slate-400 hover:text-indigo-600 transition-colors"
                                  >
                                    <MoreVertical size={16} />
                                  </button>

                                  {activeMenuCategory === `fs-${item.id}` && (
                                    <div
                                      className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl z-[100] min-w-[200px] overflow-hidden animate-in slide-in-from-top-2 duration-150"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      {pendingColor && String(pendingColor.categoryId) === String(item.id) ? (
                                        <div className="p-3 space-y-2 bg-slate-50/50">
                                          <div className="flex items-center gap-2 px-1">
                                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                            <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Salvar alteração?</p>
                                          </div>
                                          <button
                                            onClick={(e) => {
                                              e.preventDefault();
                                              handleUpdateCategoryColor(String(item.id), pendingColor.color);
                                              setPendingColor(null);
                                              setActiveMenuCategory(null);
                                            }}
                                            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all shadow-md shadow-emerald-100 text-[11px] font-bold active:scale-95"
                                          >
                                            <div className="w-3 h-3 rounded-full border border-white/30" style={{ backgroundColor: pendingColor.color }} />
                                            Confirmar e Mudar
                                          </button>
                                          <button
                                            onClick={() => {
                                              setPendingColor(null);
                                              setActiveMenuCategory(null);
                                            }}
                                            className="w-full px-3 py-1.5 text-slate-400 hover:text-slate-600 text-[10px] font-bold transition-colors hover:bg-slate-100 rounded-md"
                                          >
                                            Cancelar
                                          </button>
                                        </div>
                                      ) : (
                                        <button
                                          onClick={() => {
                                            setSelectedCatIdForColor(item.id);
                                            setTimeout(() => colorInputRef.current?.click(), 0);
                                          }}
                                          className="w-full flex items-center gap-3 px-4 py-4 text-left hover:bg-indigo-50 text-slate-700 font-bold transition-colors group active:bg-indigo-100"
                                        >
                                          <div className="w-5 h-5 rounded-full border border-slate-200 group-hover:scale-110 transition-transform shadow-inner" style={{ backgroundColor: currentColor }} />
                                          <span className="text-sm">Alterar Cor</span>
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <button
                    onClick={() => setFullscreenChart(null)}
                    className="w-full py-4 bg-slate-800 text-white rounded-2xl font-bold hover:bg-slate-900 transition-all shadow-lg shadow-slate-200"
                  >
                    Fechar Visualização
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Transactions;
