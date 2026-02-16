
export type TransactionType = 'INCOME' | 'EXPENSE';

export interface SubCategory {
  id: string;
  name: string;
}

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  color?: string;
  subCategories: SubCategory[];
}

export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  balance?: number; // Saldo no momento do lançamento (vinda do CSV)
  type: TransactionType;
  categoryId: string;
  subCategoryId?: string;
  notas?: string;
  tags?: string[];
}

export interface Investment {
  id: string;
  description: string;
  amount: number;
  type: TransactionType; // 'INCOME' ou 'EXPENSE' (entrada ou saída)
  date_lancamento: string; // Data de lançamento
}

export interface Bill {
  id: string;
  data: string; // Data
  descricao: string; // Descrição
  entrada: number; // Entrada (a receber)
  saida: number; // Saída (a pagar)
}

export interface ForecastExpense {
  id: string;
  description: string; // descrição
  amount: number; // valor
  type: TransactionType; // INCOME ou EXPENSE
  recorrente: boolean; // recorrente (sim/não)
  mes: string; // mês
  categoryId?: string;
  subCategoryId?: string;
}

export interface Contract {
  id: string;
  nome_cliente: string; // Nome do cliente
  servico: string; // Serviço
  pago: number; // Valor pago
  receber: number; // Valor a receber
  data_pagamento: string | null; // Data de pagamento
  inicio_contrato: string; // Data de início do contrato
  final_contrato: string; // Data de fim do contrato
  parcela: number | null; // Número de parcelas (opcional)
}

export type View = 'DASHBOARD' | 'TRANSACTIONS' | 'INVESTMENTS' | 'BILLS' | 'FORECAST' | 'CONTRACTS' | 'CATEGORIES' | 'IMPORT';
