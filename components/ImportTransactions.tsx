
import React, { useState, useRef } from 'react';
import { FileUp, Trash2, Edit2, CheckCircle2, X, Loader2, AlertCircle, Database, CheckCircle } from 'lucide-react';
import { Transaction, Category } from '../types';
import { supabase } from '../lib/supabase';

interface StagedTransaction extends Omit<Transaction, 'id'> {
  tempId: string;
}

interface ImportTransactionsProps {
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  categories: Category[];
  onComplete: () => void;
}

const ImportTransactions: React.FC<ImportTransactionsProps> = ({ setTransactions, categories, onComplete }) => {
  const [stagedData, setStagedData] = useState<StagedTransaction[]>([]);
  const [editingItem, setEditingItem] = useState<StagedTransaction | null>(null);
  const [status, setStatus] = useState<'idle' | 'importing' | 'success' | 'error'>('idle');
  const [syncMessage, setSyncMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n');

      const newStaged: StagedTransaction[] = [];
      const startIndex = lines[0].toLowerCase().includes('data') ? 1 : 0;

      for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const columns = line.split(/[,;]/);
        if (columns.length < 3) continue;

        const date = columns[0].trim();
        const description = columns[1].trim();

        // Processar valor com suporte a + e -
        let rawAmount = columns[2].trim();
        const isNegative = rawAmount.includes('-') || rawAmount.startsWith('(');
        const isPositive = rawAmount.includes('+');

        // Remover formatação
        rawAmount = rawAmount
          .replace('R$', '')
          .replace(/\./g, '')
          .replace(',', '.')
          .replace('+', '')
          .replace('-', '')
          .replace('(', '')
          .replace(')', '');

        let amountValue = parseFloat(rawAmount) || 0;

        // Aplicar sinal
        if (isNegative) {
          amountValue = -Math.abs(amountValue);
        } else if (isPositive) {
          amountValue = Math.abs(amountValue);
        }

        const rawSaldo = columns[3]?.trim().replace('R$', '').replace(/\./g, '').replace(',', '.');
        const balanceValue = parseFloat(rawSaldo) || 0;

        newStaged.push({
          tempId: crypto.randomUUID(),
          date: formatDateForInput(date),
          description,
          amount: Math.abs(amountValue),
          balance: balanceValue,
          type: amountValue >= 0 ? 'INCOME' : 'EXPENSE',
          categoryId: '',
          subCategoryId: ''
        });
      }
      setStagedData(prev => [...prev, ...newStaged]);
      setStatus('idle');
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const formatDateForInput = (dateStr: string) => {
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
    return dateStr;
  };

  const handleDelete = (tempId: string) => {
    setStagedData(prev => prev.filter(item => item.tempId !== tempId));
  };

  const confirmImport = async () => {
    // Removido validação de categoria pois a tabela não tem essa coluna
    setStatus('importing');
    setSyncMessage('Conectando ao Supabase e enviando dados...');

    try {
      console.log('🔍 Dados staged antes de processar:', stagedData.slice(0, 2));

      const dataToInsert = stagedData.map(({ tempId, type, ...rest }) => {
        console.log('📅 Processando data:', rest.date, 'tipo:', typeof rest.date, 'type:', type);

        let timestamp;

        try {
          // Tenta usar a data diretamente se já estiver em formato ISO
          if (rest.date.includes('T')) {
            timestamp = new Date(rest.date);
          } else {
            // Se for formato YYYY-MM-DD, converte para timestamp completo
            const dateObj = new Date(rest.date + 'T00:00:00');
            timestamp = dateObj;
          }

          // Valida se a data é válida
          if (isNaN(timestamp.getTime())) {
            throw new Error('Data inválida: ' + rest.date);
          }
        } catch (error) {
          console.error('❌ Erro ao processar data:', rest.date, error);
          // Usa data atual como fallback
          timestamp = new Date();
        }

        // Se for EXPENSE (saída), o valor deve ser negativo
        const valorFinal = type === 'EXPENSE' ? -Math.abs(rest.amount) : Math.abs(rest.amount);

        return {
          Data: timestamp.toISOString(),
          Descrição: rest.description,
          Valor: valorFinal,
          Saldo: rest.balance
        };
      });

      console.log('📤 Dados a serem inseridos:', dataToInsert);
      console.log('📋 Exemplo do primeiro registro:', dataToInsert[0]);

      const { data, error } = await supabase
        .from('Fluxo de caixa')
        .insert(dataToInsert)
        .select();

      if (error) throw error;

      const insertedTransactions: Transaction[] = data.map((t: any) => ({
        id: t.id,
        date: t.Data,
        description: t.Descrição,
        amount: t.Valor,
        balance: t.Saldo,
        type: t.Valor >= 0 ? 'INCOME' : 'EXPENSE', // Infere tipo do valor
        categoryId: '', // Não existe na tabela
        subCategoryId: '' // Não existe na tabela
      }));

      setTransactions(prev => [...insertedTransactions, ...prev]);
      setStatus('success');
      setSyncMessage(`Sucesso! ${data.length} registros sincronizados na tabela "Fluxo de caixa".`);

      setTimeout(() => {
        setStagedData([]);
        onComplete();
      }, 2500);
    } catch (error: any) {
      console.error("Erro na importação Supabase:", error);
      setStatus('error');
      setSyncMessage(`Erro ao sincronizar: ${error.message || 'Verifique sua conexão'}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Notificação de Status */}
      {status !== 'idle' && (
        <div className={`p-4 rounded-2xl border flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300 ${status === 'importing' ? 'bg-indigo-50 border-indigo-100 text-indigo-700' :
          status === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' :
            'bg-rose-50 border-rose-100 text-rose-700'
          }`}>
          {status === 'importing' ? <Loader2 size={20} className="animate-spin" /> :
            status === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          <span className="font-bold text-sm">{syncMessage}</span>
          {status === 'error' && (
            <button onClick={() => setStatus('idle')} className="ml-auto text-rose-400 hover:text-rose-600">
              <X size={16} />
            </button>
          )}
        </div>
      )}

      <div className="bg-white p-10 rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center transition-all hover:border-indigo-300 group">
        <div className="p-5 bg-indigo-50 rounded-2xl text-indigo-600 mb-4 group-hover:scale-110 transition-transform">
          <FileUp size={48} />
        </div>
        <h3 className="text-2xl font-bold text-slate-800 mb-2">Importar Fluxo de Caixa Cloud</h3>
        <p className="text-slate-500 max-w-sm mb-8 leading-relaxed">
          Selecione seu CSV para mapear os dados para a tabela <strong>"Fluxo de caixa"</strong> no Supabase.
        </p>
        <input
          type="file"
          accept=".csv"
          onChange={handleFileUpload}
          ref={fileInputRef}
          className="hidden"
          id="csv-upload"
        />
        <label
          htmlFor="csv-upload"
          className="px-8 py-4 bg-slate-900 text-white font-bold rounded-2xl hover:bg-indigo-600 transition-all cursor-pointer shadow-xl shadow-slate-200 flex items-center gap-2"
        >
          <Database size={20} /> Selecionar CSV
        </label>
      </div>

      {stagedData.length > 0 && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/50">
            <div>
              <h4 className="font-bold text-slate-800 text-lg">Revisão Pré-Nuvem</h4>
              <p className="text-sm text-slate-500 flex items-center gap-1">
                {stagedData.length} registros pendentes de sincronização.
              </p>
            </div>
            <div className="flex gap-3 w-full sm:w-auto">
              <button
                disabled={status === 'importing'}
                onClick={() => setStagedData([])}
                className="flex-1 sm:flex-none px-6 py-3 text-slate-600 font-bold hover:bg-slate-200 rounded-xl transition-colors"
              >
                Descartar
              </button>
              <button
                disabled={status === 'importing' || status === 'success'}
                onClick={confirmImport}
                className="flex-1 sm:flex-none px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-100 min-w-[200px]"
              >
                {status === 'importing' ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    Sincronizando...
                  </>
                ) : status === 'success' ? (
                  <>
                    <CheckCircle2 size={20} />
                    Finalizado
                  </>
                ) : (
                  <>
                    <Database size={20} />
                    Sincronizar no Supabase
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-100/50 text-slate-500 text-[10px] font-black uppercase tracking-widest">
                <tr>
                  <th className="px-6 py-4">Data</th>
                  <th className="px-6 py-4">Descrição</th>
                  <th className="px-6 py-4 text-right">Valor</th>
                  <th className="px-6 py-4 text-right">Saldo (CSV)</th>
                  <th className="px-6 py-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stagedData.map(item => (
                  <tr key={item.tempId} className="hover:bg-indigo-50/30 transition-colors group/row">
                    <td className="px-6 py-4 text-sm font-medium text-slate-600">
                      {new Date(item.date).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-800">{item.description}</td>
                    <td className={`px-6 py-4 text-sm font-black text-right ${item.type === 'INCOME' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      R$ {item.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-400 text-right bg-slate-50/30">
                      R$ {item.balance?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button onClick={() => handleDelete(item.tempId)} className="p-2 text-slate-400 hover:text-rose-600 rounded-lg">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImportTransactions;
