
import React, { useState } from 'react';
import { Plus, Trash2, Edit2, Search, ArrowUp, ArrowDown, Loader2, CheckCircle, AlertTriangle, ArrowDownToLine } from 'lucide-react';
import { Investment, TransactionType } from '../types';
import { supabase } from '../lib/supabase';

interface InvestmentsProps {
  investments: Investment[];
  setInvestments: React.Dispatch<React.SetStateAction<Investment[]>>;
}

const Investments: React.FC<InvestmentsProps> = ({ investments, setInvestments }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    type: 'INCOME' as TransactionType,
    date_lancamento: new Date().toISOString().split('T')[0]
  });

  const [searchTerm, setSearchTerm] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSyncStatus('idle');

    const investmentData = {
      descrição: formData.description,
      entrada: formData.type === 'INCOME' ? parseFloat(formData.amount) : null,
      saída: formData.type === 'EXPENSE' ? parseFloat(formData.amount) : null,
      data_lancamento: formData.date_lancamento
    };

    console.log('📤 Enviando para Supabase:', investmentData);

    try {
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
      console.error("❌ Detalhes do erro:", error.message, error.details, error.hint);
      setSyncStatus('error');
      alert(`Falha ao sincronizar: ${error.message || 'Erro desconhecido'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

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

  const handleDelete = async (id: string) => {
    if (confirm('Deseja realmente excluir este investimento?')) {
      try {
        const { error } = await supabase.from('investimento').delete().eq('id', id);
        if (error) throw error;
        setInvestments(prev => prev.filter(i => i.id !== id));
        alert("Excluído com sucesso no Supabase.");
      } catch (error) {
        console.error("Erro ao deletar:", error);
        alert("Erro ao remover do banco de dados.");
      }
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
      } catch (error) {
        console.error('Erro ao deletar todos os investimentos:', error);
        alert('❌ Erro ao excluir investimentos do banco de dados.');
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
      date_lancamento: new Date().toISOString().split('T')[0]
    });
  };

  const handleOpenWithdrawal = () => {
    setFormData({
      description: '',
      amount: '',
      type: 'EXPENSE', // Pré-seleciona Saída
      date_lancamento: new Date().toISOString().split('T')[0]
    });
    setIsModalOpen(true);
  };

  // Cálculos de totais
  const totalEntradas = investments.filter(i => i.type === 'INCOME').reduce((acc, i) => acc + i.amount, 0);
  const totalSaidas = investments.filter(i => i.type === 'EXPENSE').reduce((acc, i) => acc + i.amount, 0);
  const saldo = totalEntradas - totalSaidas;

  // Filtrar investimentos
  const filteredInvestments = investments.filter(investment => {
    if (!searchTerm) return true;

    const search = searchTerm.toLowerCase();
    const date = new Date(investment.date_lancamento).toLocaleDateString('pt-BR');
    const description = investment.description.toLowerCase();

    return date.includes(search) || description.includes(search);
  });

  return (
    <div className="space-y-6">
      {/* Cards de resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200">
          <p className="text-slate-500 text-sm font-medium mb-1">Total Entradas</p>
          <h3 className="text-2xl font-bold text-emerald-600">R$ {totalEntradas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200">
          <p className="text-slate-500 text-sm font-medium mb-1">Total Saídas</p>
          <h3 className="text-2xl font-bold text-rose-600">R$ {totalSaidas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200">
          <p className="text-slate-500 text-sm font-medium mb-1">Saldo</p>
          <h3 className={`text-2xl font-bold ${saldo >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            R$ {saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </h3>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <div className="relative w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Buscar por data ou descrição..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="flex gap-3">
          {investments.length > 0 && (
            <button
              onClick={handleDeleteAll}
              className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors border-2 border-rose-600 hover:border-rose-700"
            >
              <AlertTriangle size={18} /> Limpar Tudo
            </button>
          )}
          <button
            onClick={handleOpenWithdrawal}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
          >
            <ArrowDownToLine size={18} /> Retirada
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus size={18} /> Novo Investimento
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Data Lançamento</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Descrição</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Valor</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredInvestments.length > 0 ? (
              filteredInvestments.map(inv => (
                <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 text-sm text-slate-600">{new Date(inv.date_lancamento).toLocaleDateString('pt-BR')}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className={`p-1 rounded-full ${inv.type === 'INCOME' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                        {inv.type === 'INCOME' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                      </div>
                      <span className="text-sm font-medium text-slate-800">{inv.description}</span>
                    </div>
                  </td>
                  <td className={`px-6 py-4 text-sm font-bold text-right ${inv.type === 'INCOME' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {inv.type === 'INCOME' ? '+' : '-'} R$ {inv.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => handleEdit(inv)} className="p-2 text-slate-400 hover:text-indigo-600 transition-colors">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDelete(inv.id)} className="p-2 text-slate-400 hover:text-rose-600 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-slate-400 font-medium">Nenhum investimento encontrado</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl p-8 relative">
            {syncStatus === 'success' && (
              <div className="absolute inset-0 bg-white/90 z-10 rounded-2xl flex flex-col items-center justify-center text-emerald-600 animate-in fade-in duration-300">
                <CheckCircle size={64} className="mb-4" />
                <p className="font-bold text-xl">Sincronizado com Sucesso!</p>
              </div>
            )}

            <h2 className="text-xl font-bold text-slate-800 mb-6">{editingId ? 'Editar Investimento' : 'Novo Investimento'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
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
                  <label className="block text-sm font-medium text-slate-700 mb-1">Data Lançamento</label>
                  <input
                    type="date"
                    required
                    value={formData.date_lancamento}
                    onChange={e => setFormData({ ...formData, date_lancamento: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleCloseModal}
                  className="flex-1 py-2 text-slate-600 font-medium hover:bg-slate-50 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                >
                  {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                  {editingId ? 'Atualizar' : 'Sincronizar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Investments;
