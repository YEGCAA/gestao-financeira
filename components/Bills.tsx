
import React, { useState } from 'react';
import { Plus, Trash2, Edit2, FileText, ArrowUpCircle, ArrowDownCircle, Search } from 'lucide-react';
import { Bill } from '../types';
import { supabase } from '../lib/supabase';
import ConfirmModal from './ConfirmModal';

interface BillsProps {
  bills: Bill[];
  setBills: React.Dispatch<React.SetStateAction<Bill[]>>;
}

const Bills: React.FC<BillsProps> = ({ bills, setBills }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; id: string | null }>({
    isOpen: false,
    id: null
  });
  const [formData, setFormData] = useState({
    data: new Date().toISOString().split('T')[0],
    descricao: '',
    entrada: '',
    saida: ''
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');

  // Gerar todos os 12 meses do ano atual (Janeiro → Dezembro)
  const currentYear = new Date().getFullYear();
  const availableMonths = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    return `${currentYear}-${String(month).padStart(2, '0')}`;
  }); // Janeiro até Dezembro


  const handleEdit = (bill: Bill) => {
    setEditingId(bill.id);
    setFormData({
      data: bill.data,
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
          descricao: data[0].descricao,
          entrada: data[0].entrada,
          saida: data[0]['saída']
        };
        setBills(prev => [inserted, ...prev]);
      }

      setIsModalOpen(false);
      setEditingId(null);
      setFormData({ data: new Date().toISOString().split('T')[0], descricao: '', entrada: '', saida: '' });
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
    try {
      const { error } = await supabase.from('contas_pagar_receber').delete().eq('id', id);
      if (error) throw error;
      setBills(prev => prev.filter(b => b.id !== id));
      setConfirmDelete({ isOpen: false, id: null });
    } catch (error) {
      alert('Erro ao deletar conta');
    }
  };


  // Filtrar contas
  const filteredBills = bills.filter(bill => {
    // Filtro de mês
    if (selectedMonth !== 'all') {
      const billDate = new Date(bill.data);
      const billMonth = `${billDate.getFullYear()}-${String(billDate.getMonth() + 1).padStart(2, '0')}`;
      if (billMonth !== selectedMonth) return false;
    }

    // Filtro de busca
    if (!searchTerm) return true;

    const search = searchTerm.toLowerCase();
    const date = new Date(bill.data).toLocaleDateString('pt-BR');
    const description = bill.descricao.toLowerCase();
    const entrada = bill.entrada.toString();
    const saida = bill.saida.toString();

    return date.includes(search) ||
      description.includes(search) ||
      entrada.includes(search) ||
      saida.includes(search);
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Contas a Pagar e Receber</h1>
        <div className="flex gap-3">
          <div className="relative w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Buscar por data, descrição ou valor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
        </div>
      </div>

      {/* Filtro de Mês - Botões */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm font-semibold text-gray-700">Filtrar por mês:</span>
          <span className="text-xs text-gray-500">({filteredBills.length} {filteredBills.length === 1 ? 'conta' : 'contas'})</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {availableMonths.map((month: string) => {
            const [year, monthNum] = month.split('-');
            const monthName = new Date(parseInt(year), parseInt(monthNum) - 1).toLocaleDateString('pt-BR', { month: 'short' });

            // Contar quantas parcelas tem neste mês
            const count = bills.filter(bill => {
              const billDate = new Date(bill.data);
              const billMonth = `${billDate.getFullYear()}-${String(billDate.getMonth() + 1).padStart(2, '0')}`;
              return billMonth === month;
            }).length;

            return (
              <button
                key={month}
                onClick={() => setSelectedMonth(month)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${selectedMonth === month
                  ? 'bg-blue-600 text-white shadow-md'
                  : count > 0
                    ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    : 'bg-gray-50 text-gray-400 cursor-default'
                  }`}
                disabled={count === 0}
              >
                {monthName.charAt(0).toUpperCase() + monthName.slice(1)} {count > 0 && `(${count})`}
              </button>
            );
          })}
          <button
            onClick={() => setSelectedMonth('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${selectedMonth === 'all'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
          >
            Todos ({bills.length})
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
                    {new Date(bill.data).toLocaleDateString('pt-BR')}
                  </td>
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
                        onClick={() => handleEdit(bill)}
                        className="text-blue-600 hover:bg-blue-50 p-1 rounded"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => setConfirmDelete({ isOpen: true, id: bill.id })}
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                <input
                  type="text"
                  required
                  value={formData.descricao}
                  onChange={e => setFormData({ ...formData, descricao: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Aluguel, Fornecedor, Cliente"
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
                    setFormData({ data: new Date().toISOString().split('T')[0], descricao: '', entrada: '', saida: '' });
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
        title="Excluir Conta"
        message="Tem certeza que deseja excluir esta conta? Esta ação não pode ser desfeita."
        confirmText="Excluir"
        cancelText="Cancelar"
        onConfirm={() => confirmDelete.id && handleDelete(confirmDelete.id)}
        onCancel={() => setConfirmDelete({ isOpen: false, id: null })}
      />
    </div>
  );
};

export default Bills;
