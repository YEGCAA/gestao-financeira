
import React, { useState, useMemo } from 'react';
import { Plus, Trash2, Edit2, FileText, ArrowUpCircle, ArrowDownCircle, Search, Calendar } from 'lucide-react';
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
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Extrair anos disponíveis das contas para o seletor
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    years.add(new Date().getFullYear()); // Sempre incluir ano atual
    bills.forEach(bill => {
      const year = parseInt(bill.data.substring(0, 4));
      if (!isNaN(year)) years.add(year);
    });
    return Array.from(years).sort((a, b) => b - a); // Mostrar anos mais recentes primeiro
  }, [bills]);

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const availableMonths = monthNames.map((name, i) => ({
    id: `${selectedYear}-${String(i + 1).padStart(2, '0')}`,
    name: name,
    shortName: name.substring(0, 3)
  }));

  const toggleMonth = (monthId: string) => {
    setSelectedMonths(prev =>
      prev.includes(monthId)
        ? prev.filter(id => id !== monthId)
        : [...prev, monthId]
    );
  };

  const selectAllMonths = () => setSelectedMonths([]);
  const selectSingleMonth = (monthId: string) => setSelectedMonths([monthId]);


  const handleEdit = (bill: Bill) => {
    setEditingId(bill.id);

    // Garantir que a data esteja no formato YYYY-MM-DD para o input HTML sem erro de fuso horário
    // Função robusta para formatar datas para YYYY-MM-DD ignorando fuso horário
    const formatDateForInput = (dateString: string | null) => {
      if (!dateString) return '';
      if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) return dateString;

      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';

      // Compensa o fuso horário para não mudar o dia
      const userTimezoneOffset = date.getTimezoneOffset() * 60000;
      const normalizedDate = new Date(date.getTime() + userTimezoneOffset);
      return normalizedDate.toISOString().split('T')[0];
    };

    setFormData({
      data: formatDateForInput(bill.data),
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
      data: formData.data, // Já está no formato YYYY-MM-DD do input type="date"
      descricao: formData.descricao,
      entrada: parseFloat(formData.entrada) || 0,
      'saída': parseFloat(formData.saida) || 0
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
    // Filtro de mês (se vazio, mostra todos)
    if (selectedMonths.length > 0) {
      // Usar extração de string direta para evitar problemas de fuso horário com new Date()
      // bill.data está no formato YYYY-MM-DD
      const billMonth = bill.data.substring(0, 7); // Resulta em YYYY-MM
      if (!selectedMonths.includes(billMonth)) return false;
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

  // Agrupar contas por mês para visualização organizada
  const billsByMonth = filteredBills.reduce((acc: { [key: string]: Bill[] }, bill) => {
    // Usar extração de string direta YYYY-MM
    const monthKey = bill.data.substring(0, 7);
    if (!acc[monthKey]) acc[monthKey] = [];
    acc[monthKey].push(bill);
    return acc;
  }, {});

  const sortedMonthKeys = Object.keys(billsByMonth).sort();

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Contas a Pagar e Receber</h1>
          <p className="text-sm text-slate-500 mt-1">Gerencie seus compromissos financeiros mensais</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Pesquisar contas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
            />
          </div>
          <button
            onClick={() => {
              setEditingId(null);
              setFormData({ data: new Date().toISOString().split('T')[0], descricao: '', entrada: '', saida: '' });
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all font-bold shadow-sm shadow-indigo-100"
          >
            <Plus size={20} />
            <span className="hidden sm:inline">Nova Conta</span>
          </button>
        </div>
      </div>

      {/* Seletor de Meses Clean com Seleção de Ano */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="text-indigo-600" size={20} />
              <span className="font-bold text-slate-700">Calendário de Contas</span>
            </div>

            {/* Seletor de Ano */}
            <select
              value={selectedYear}
              onChange={(e) => {
                setSelectedYear(parseInt(e.target.value));
                setSelectedMonths([]); // Limpa seleção ao mudar de ano para evitar confusão
              }}
              className="bg-slate-100 border-none rounded-lg px-3 py-1.5 text-sm font-bold text-indigo-700 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              {availableYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          <button
            onClick={selectAllMonths}
            className={`text-sm font-bold transition-colors ${selectedMonths.length === 0 ? 'text-indigo-600' : 'text-slate-400 hover:text-indigo-600'}`}
          >
            {selectedMonths.length > 0 ? 'Limpar Filtros e Ver Tudo' : 'Visualizando Tudo'}
          </button>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-3">
          {availableMonths.map((m) => {
            const isSelected = selectedMonths.includes(m.id);
            const count = bills.filter(bill => {
              return bill.data.substring(0, 7) === m.id;
            }).length;

            return (
              <button
                key={m.id}
                onClick={() => toggleMonth(m.id)}
                className={`
                  relative flex flex-col items-center justify-center p-3 rounded-2xl transition-all border-2
                  ${isSelected
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700 ring-4 ring-indigo-50'
                    : count > 0
                      ? 'border-slate-100 bg-white text-slate-700 hover:border-slate-300 shadow-sm'
                      : 'border-slate-50 bg-slate-50 text-slate-400 hover:bg-slate-100'
                  }
                `}
              >
                <span className="text-[10px] uppercase font-bold tracking-wider mb-1">{m.shortName}</span>
                <span className="text-lg font-black">{m.id.split('-')[1]}</span>
                {count > 0 && (
                  <span className={`absolute -top-2 -right-1 w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-black shadow-sm ${isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-white'}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Lista de Contas Categorizada por Mês */}
      <div className="space-y-8">
        {sortedMonthKeys.length > 0 ? (
          sortedMonthKeys.map(monthKey => {
            const monthBills = billsByMonth[monthKey].sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());
            const [year, monthNum] = monthKey.split('-');
            const date = new Date(parseInt(year), parseInt(monthNum) - 1);
            const monthLabel = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

            const monthTotalIncome = monthBills.reduce((sum, b) => sum + b.entrada, 0);
            const monthTotalExpense = monthBills.reduce((sum, b) => sum + b.saida, 0);

            return (
              <div key={monthKey} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between mb-4 px-2">
                  <h2 className="text-lg font-black text-slate-800 capitalize flex items-center gap-2">
                    <div className="w-2 h-6 bg-indigo-600 rounded-full"></div>
                    {monthLabel}
                  </h2>
                  <div className="flex gap-4 text-xs font-bold">
                    <span className="text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                      RECEBER: R$ {monthTotalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-rose-600 bg-rose-50 px-3 py-1 rounded-full">
                      PAGAR: R$ {monthTotalExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
                  <table className="w-full">
                    <thead className="bg-slate-50/50 border-b border-slate-100">
                      <tr>
                        <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest w-32">Data</th>
                        <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Descrição</th>
                        <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest w-40">A Receber</th>
                        <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest w-40">A Pagar</th>
                        <th className="px-6 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest w-24">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {monthBills.map(bill => (
                        <tr key={bill.id} className="group hover:bg-slate-50/50 transition-all">
                          <td className="px-6 py-4">
                            <span className="text-sm font-bold text-slate-600">
                              {/* Extrair dia e mês ignorando fuso horário ou carimbos de hora ISO */}
                              {(() => {
                                // Pega apenas a parte da data YYYY-MM-DD se houver 'T' ou espaços
                                const cleanDate = bill.data.split('T')[0].split(' ')[0];
                                const parts = cleanDate.split('-');
                                if (parts.length === 3) {
                                  return `${parts[2]}/${parts[1]}`;
                                }
                                return bill.data;
                              })()}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm font-extrabold text-slate-800">{bill.descricao}</span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            {bill.entrada > 0 ? (
                              <span className="text-sm font-black text-emerald-600">
                                R$ {bill.entrada.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                            ) : (
                              <span className="text-slate-200">--</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            {bill.saida > 0 ? (
                              <span className="text-sm font-black text-rose-600">
                                R$ {bill.saida.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                            ) : (
                              <span className="text-slate-200">--</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => handleEdit(bill)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all">
                                <Edit2 size={16} />
                              </button>
                              <button onClick={() => setConfirmDelete({ isOpen: true, id: bill.id })} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all">
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })
        ) : (
          <div className="bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 p-20 text-center">
            <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-4">
              <FileText size={32} className="text-slate-300" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">Nenhuma conta encontrada</h3>
            <p className="text-slate-500 text-sm mt-1">Tente ajustar seus filtros ou busca</p>
          </div>
        )}
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
