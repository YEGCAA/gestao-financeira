
import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  ArrowUpCircle,
  ArrowDownCircle,
  Wallet,
  CalendarClock,
  Tags,
  Menu,
  X,
  TrendingUp,
  BrainCircuit,
  PlusCircle,
  Trash2,
  Edit2,
  FileUp,
  Loader2,
  LogOut,
  FileText
} from 'lucide-react';
import {
  Transaction,
  Investment,
  Bill,
  ForecastExpense,
  Contract,
  Category,
  View,
  TransactionType
} from './types';
import Dashboard from './components/Dashboard';
import Transactions from './components/Transactions';
import Investments from './components/Investments';
import Bills from './components/Bills';
import ForecastExpenses from './components/ForecastExpenses';
import Contracts from './components/Contracts';
import Categories from './components/Categories';
import ImportTransactions from './components/ImportTransactions';
import Login from './components/Login';
import { analyzeFinancials } from './services/geminiService';
import { supabase } from './lib/supabase';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('DASHBOARD');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Data states
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [forecasts, setForecasts] = useState<ForecastExpense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);

  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Initial data fetch from Supabase
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        console.log('🔍 Buscando dados do Supabase...');
        const [
          { data: transData, error: transError },
          { data: invData, error: invError },
          { data: billsData, error: billsError },
          { data: forecastData, error: forecastError },
          { data: catsData, error: catsError },
          { data: contractsData, error: contractsError }
        ] = await Promise.all([
          supabase.from('Fluxo de caixa').select('*'),
          supabase.from('investimento').select('*'),
          supabase.from('contas_pagar_receber').select('*'),
          supabase.from('previsao_despesa').select('*'),
          supabase.from('Categoria').select('*'),
          supabase.from('Contratos').select('*')
        ]);

        console.log('📊 Resultado Fluxo de caixa:', { count: transData?.length || 0, error: transError });
        console.log('📊 Resultado Investimento:', { count: invData?.length || 0, error: invError });
        console.log('📊 Resultado Contas Pagar/Receber:', { count: billsData?.length || 0, error: billsError });
        console.log('📊 Resultado DRE (Entrada/Saída):', { count: forecastData?.length || 0, error: forecastError });
        console.log('📊 Resultado Categoria:', { count: catsData?.length || 0, error: catsError });

        if (transData && transData.length > 0) {
          console.log('✅ Mapeando', transData.length, 'transações');
          console.log('📝 Exemplo de registro:', transData[0]);
          const mappedTrans: Transaction[] = transData.map((t: any) => ({
            id: t.id,
            date: t.data || t.Data,
            description: t.descricao || t.Descrição,
            amount: Math.abs(t.valor || t.Valor),
            balance: t.saldo || t.Saldo,
            type: t.tipo || (t.Valor >= 0 ? 'INCOME' : 'EXPENSE'),
            categoryId: t.categoria_id || '',
            subCategoryId: t.subcategoria_id || '',
            notas: t.notas || '',
            tags: Array.isArray(t.tags) ? t.tags : (t.Tags && Array.isArray(t.Tags) ? t.Tags : [])
          }));
          console.log('✅ Transações mapeadas:', mappedTrans.length);
          setTransactions(mappedTrans);
        } else {
          console.log('⚠️ Nenhuma transação encontrada');
          setTransactions([]);
        }

        if (invData && invData.length > 0) {
          console.log('✅ Mapeando', invData.length, 'investimentos');
          console.log('📝 Exemplo de investimento:', invData[0]);
          const mappedInv: Investment[] = invData.map((i: any) => ({
            id: i.id,
            description: i.descrição,
            amount: i.entrada || i.saída || 0,
            type: i.entrada ? 'INCOME' : 'EXPENSE',
            date_lancamento: i.data_lancamento
          }));
          console.log('✅ Investimentos mapeados:', mappedInv.length);
          setInvestments(mappedInv);
        } else {
          console.log('⚠️ Nenhum investimento encontrado');
          setInvestments([]);
        }

        if (billsData && billsData.length > 0) {
          const mappedBills: Bill[] = billsData.map((b: any) => ({
            id: b.id,
            data: b.data,
            descricao: b.descricao,
            entrada: b.entrada || 0,
            saida: b['saída'] || 0
          }));
          setBills(mappedBills);
        } else {
          setBills([]);
        }

        if (forecastData && forecastData.length > 0) {
          const mappedForecasts: ForecastExpense[] = forecastData.map((f: any) => ({
            id: f.id,
            description: f.descrição,
            amount: f.valor,
            type: f.entrada_saida === 'INCOME' ? 'INCOME' : 'EXPENSE',
            recorrente: f['recorrente?'] === 'sim',
            mes: f.mes,
            categoryId: f.categoria,
            subCategoryId: f.subcategoria
          }));
          setForecasts(mappedForecasts);
        } else {
          setForecasts([]);
        }

        if (catsData) {
          console.log('📊 Dados brutos do Supabase (Categoria):', catsData);

          // Buscar subcategorias
          const { data: subCatsData, error: subCatsError } = await supabase
            .from('Subcategoria')
            .select('*');

          console.log('📊 Subcategorias do Supabase:', subCatsData);

          const formattedCats = catsData.map((c: any) => {
            // Se não tem etiquetas, assume INCOME como padrão
            let categoryType = 'INCOME';
            if (c.etiquetas === 'entrada') categoryType = 'INCOME';
            else if (c.etiquetas === 'saída') categoryType = 'EXPENSE';
            else if (c.tipo) categoryType = c.tipo;
            else if (c.type) categoryType = c.type;

            // Buscar subcategorias desta categoria
            const subCategories = subCatsData
              ? subCatsData
                .filter((sub: any) => String(sub.categoria_id) === String(c.id))
                .map((sub: any) => ({
                  id: sub.id,
                  name: sub.nome || sub.name || 'Sem nome'
                }))
              : [];

            return {
              id: c.id,
              name: c.Categoria || c.nome || c.name || 'Sem nome',
              type: categoryType,
              color: c.cor || (categoryType === 'INCOME' ? '#10b981' : '#ef4444'),
              subCategories: subCategories
            };
          });
          console.log('✅ Categorias formatadas para o app:', formattedCats);
          console.log(`Total: ${formattedCats.length} categorias`);
          setCategories(formattedCats);
        }

        // Carregar contratos
        if (contractsData && contractsData.length > 0) {
          const mappedContracts: Contract[] = contractsData.map((c: any) => ({
            id: c.id,
            nome_cliente: c['Nome cliente'],
            servico: c['Serviço'],
            pago: c['Pago'],
            receber: c['Receber'],
            data_pagamento: c['data_pagamento'],
            inicio_contrato: c['inicio_contrato'],
            final_contrato: c['final_contrato'],
            parcela: c['parcela'] || null
          }));
          setContracts(mappedContracts);
        } else {
          setContracts([]);
        }
      } catch (error) {
        console.error("Erro ao buscar dados do Supabase:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleLogout = () => {
    if (confirm('Deseja realmente sair?')) {
      localStorage.removeItem('isLoggedIn');
      localStorage.removeItem('userEmail');
      window.location.reload();
    }
  };

  const handleAiAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const analysis = await analyzeFinancials(transactions, investments, bills);
      setAiAnalysis(analysis);
    } catch (error) {
      console.error(error);
      setAiAnalysis("Erro ao gerar análise. Tente novamente mais tarde.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const renderView = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center h-[60vh] text-slate-400">
          <Loader2 className="animate-spin mb-4" size={48} />
          <p className="font-medium text-lg">Sincronizando com Supabase Cloud...</p>
        </div>
      );
    }

    switch (currentView) {
      case 'DASHBOARD':
        return <Dashboard transactions={transactions} investments={investments} bills={bills} forecasts={forecasts} categories={categories} />;
      case 'TRANSACTIONS':
        return <Transactions transactions={transactions} setTransactions={setTransactions} categories={categories} />;
      case 'INVESTMENTS':
        return <Investments
          investments={investments}
          setInvestments={setInvestments}
          onTransactionsChange={setTransactions}
        />;
      case 'BILLS':
        return <Bills bills={bills} setBills={setBills} />;
      case 'FORECAST':
        return <ForecastExpenses forecasts={forecasts} setForecasts={setForecasts} transactions={transactions} categories={categories} />;
      case 'CONTRACTS':
        return <Contracts contracts={contracts} setContracts={setContracts} setBills={setBills} setTransactions={setTransactions} />;
      case 'CATEGORIES':
        return <Categories categories={categories} setCategories={setCategories} />;
      case 'IMPORT':
        return <ImportTransactions setTransactions={setTransactions} categories={categories} onComplete={() => setCurrentView('TRANSACTIONS')} />;
      default:
        return <Dashboard transactions={transactions} investments={investments} bills={bills} forecasts={forecasts} categories={categories} />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <aside className={`${isSidebarOpen ? 'w-64' : 'w-20'} bg-white border-r border-gray-200 transition-all duration-300 flex flex-col shadow-lg`}>
        <div className="p-6 flex items-center gap-3">
          <img src="https://i.ibb.co/gZcFGqVt/Brand-03.png" alt="Even Digital" className="h-10 w-auto" />
          {isSidebarOpen && <span className="text-gray-900 font-bold text-lg">Digital</span>}
        </div>

        <nav className="flex-1 mt-6">
          <SidebarItem
            icon={<LayoutDashboard size={20} />}
            label="Dashboard"
            active={currentView === 'DASHBOARD'}
            onClick={() => setCurrentView('DASHBOARD')}
            collapsed={!isSidebarOpen}
          />
          <SidebarItem
            icon={<ArrowUpCircle size={20} />}
            label="Fluxo de Caixa"
            active={currentView === 'TRANSACTIONS'}
            onClick={() => setCurrentView('TRANSACTIONS')}
            collapsed={!isSidebarOpen}
          />
          <SidebarItem
            icon={<TrendingUp size={20} />}
            label="Investimentos"
            active={currentView === 'INVESTMENTS'}
            onClick={() => setCurrentView('INVESTMENTS')}
            collapsed={!isSidebarOpen}
          />
          <SidebarItem
            icon={<CalendarClock size={20} />}
            label="Contas"
            active={currentView === 'BILLS'}
            onClick={() => setCurrentView('BILLS')}
            collapsed={!isSidebarOpen}
          />
          <SidebarItem
            icon={<Wallet size={20} />}
            label="Previsão"
            active={currentView === 'FORECAST'}
            onClick={() => setCurrentView('FORECAST')}
            collapsed={!isSidebarOpen}
          />
          <SidebarItem
            icon={<FileText size={20} />}
            label="Contratos"
            active={currentView === 'CONTRACTS'}
            onClick={() => setCurrentView('CONTRACTS')}
            collapsed={!isSidebarOpen}
          />
          <SidebarItem
            icon={<Tags size={20} />}
            label="Categorias"
            active={currentView === 'CATEGORIES'}
            onClick={() => setCurrentView('CATEGORIES')}
            collapsed={!isSidebarOpen}
          />
          <SidebarItem
            icon={<FileUp size={20} />}
            label="Importar CSV"
            active={currentView === 'IMPORT'}
            onClick={() => setCurrentView('IMPORT')}
            collapsed={!isSidebarOpen}
          />
        </nav>

        <div className="p-4">
          <button
            onClick={handleAiAnalysis}
            disabled={isAnalyzing}
            className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium transition-all shadow-md hover:shadow-lg ${isAnalyzing ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <BrainCircuit size={20} />
            {isSidebarOpen && (isAnalyzing ? 'Analisando...' : 'IA Insights')}
          </button>

          {isSidebarOpen && (
            <button
              onClick={handleLogout}
              className="w-full mt-3 flex items-center justify-center gap-2 py-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 font-medium transition-all border border-red-200"
            >
              <LogOut size={18} />
              Sair
            </button>
          )}
        </div>

        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-4 text-gray-400 hover:text-gray-700 flex justify-center border-t border-gray-200"
        >
          {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <header className="bg-white h-16 border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-10">
          <h1 className="text-xl font-semibold text-slate-800">
            {currentView === 'DASHBOARD' ? 'Visão Geral' :
              currentView === 'TRANSACTIONS' ? 'Fluxo de Caixa' :
                currentView === 'INVESTMENTS' ? 'Investimentos' :
                  currentView === 'BILLS' ? 'Contas' :
                    currentView === 'FORECAST' ? 'Previsão' :
                      currentView === 'CATEGORIES' ? 'Categorias' : 'Importação'}
          </h1>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs text-slate-500">Saldo Consolidado Cloud</p>
              <p className="font-bold text-slate-900">
                R$ {transactions.reduce((acc, t) => t.type === 'INCOME' ? acc + t.amount : acc - t.amount, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </header>

        <div className="p-8 max-w-7xl mx-auto">
          {aiAnalysis && (
            <div className="mb-8 p-6 bg-indigo-50 border border-indigo-100 rounded-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-2">
                <button onClick={() => setAiAnalysis(null)} className="text-indigo-400 hover:text-indigo-600"><X size={18} /></button>
              </div>
              <div className="flex items-start gap-4">
                <div className="p-3 bg-white rounded-full text-indigo-600 shadow-sm"><BrainCircuit size={24} /></div>
                <div>
                  <h3 className="text-indigo-900 font-bold mb-1">Análise da Even AI</h3>
                  <div className="text-indigo-800 prose prose-indigo max-w-none whitespace-pre-line text-sm leading-relaxed">
                    {aiAnalysis}
                  </div>
                </div>
              </div>
            </div>
          )}
          {renderView()}
        </div>
      </main>
    </div>
  );
};

const SidebarItem: React.FC<{ icon: React.ReactNode, label: string, active: boolean, onClick: () => void, collapsed: boolean }> = ({ icon, label, active, onClick, collapsed }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-6 py-4 transition-colors ${active ? 'bg-blue-50 text-blue-600 border-r-4 border-blue-600' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}
  >
    <div className={active ? 'text-blue-600' : 'text-gray-600'}>{icon}</div>
    {!collapsed && <span className="font-medium text-sm">{label}</span>}
  </button>
);

export default App;
