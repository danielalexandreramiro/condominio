export interface Balancete {
  arquivo: string;
  receitas: { categoria: string; subcategoria: string; descricao: string; valor: number }[];
  despesas: { categoria: string; subcategoria: string; descricao: string; valor: number }[];
  totais: { total_receitas: number; total_despesas: number; saldo: number };
}
