export interface LancamentoAuditoria {
  readonly categoria: string;
  readonly subcategoria: string;
  readonly descricao: string;
  readonly valor: number;
}

export interface PeriodoAuditoria {
  readonly inicio: string;
  readonly fim: string;
}

export interface ValoresContaAuditoria {
  readonly saldo_anterior: number;
  readonly creditos: number;
  readonly debitos: number;
  readonly saldo_final: number;
}

export interface ContaAuditoria extends ValoresContaAuditoria {
  readonly nome: string;
}

export interface BalanceteOriginalAuditoria {
  readonly arquivo: string;
  readonly receitas: readonly LancamentoAuditoria[];
  readonly despesas: readonly LancamentoAuditoria[];
  readonly totais: {
    readonly total_receitas: number;
    readonly total_despesas: number;
    readonly saldo: number;
  };
  readonly resumo_financeiro: {
    readonly periodo: PeriodoAuditoria;
    readonly contas: readonly ContaAuditoria[];
    readonly total: ValoresContaAuditoria;
  };
}

export interface BalanceteAuditoria {
  readonly origem: {
    readonly arquivoJson: string;
    readonly mesReferencia: string;
    readonly periodoCompetencia: PeriodoAuditoria;
  };
  readonly dados: BalanceteOriginalAuditoria;
}
