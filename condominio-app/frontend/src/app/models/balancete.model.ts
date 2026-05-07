export interface Balancete {
  arquivo: string;
  receitas: { categoria: string; subcategoria: string; descricao: string; valor: number }[];
  despesas: { categoria: string; subcategoria: string; descricao: string; valor: number }[];
  totais: { total_receitas: number; total_despesas: number; saldo: number };
  resumo_financeiro?: {
    periodo: { inicio: string; fim: string };
    contas: { nome: string; saldo_anterior: number; creditos: number; debitos: number; saldo_final: number }[];
    total: { saldo_anterior: number; creditos: number; debitos: number; saldo_final: number };
  };
}
