import { Injectable } from '@angular/core';
import { BalanceteAuditoria, LancamentoAuditoria, ValoresContaAuditoria } from '../models/auditoria-balancete.model';

export type TipoLancamento = 'receitas' | 'despesas';

export interface FiltrosAuditoria {
  inicio: string;
  fim: string;
  ano: string;
  mes: string;
  tipo: '' | TipoLancamento;
  categoria: string;
  subcategoria: string;
  descricao: string;
  limitePercentual: number;
  limiteValor: number;
}

export interface RegistroAuditoria extends LancamentoAuditoria {
  tipo: TipoLancamento;
  competencia: string;
  arquivoJson: string;
  arquivoOriginal: string;
  indice: number;
}

export interface AlertaAuditoria {
  tipo: string;
  competencia: string;
  arquivos: string[];
  mensagem: string;
  criterio: string;
  detalhes?: string;
}

export interface LinhaComparativo {
  tipo: TipoLancamento;
  categoria: string;
  subcategoria: string;
  total: number;
  mediaCompetencia: number;
  mediaOcorrencia: number;
  ocorrencias: number;
  disponiveis: number;
  recorrente: boolean;
  valores: { competencia: string; valor: number | null; arquivos: string[] }[];
}

export interface ResumoMes {
  competencia: string;
  arquivo: string;
  receitas: number | null;
  despesas: number | null;
  resultado: number | null;
}

export interface ResultadoAuditoria {
  meses: ResumoMes[];
  registros: RegistroAuditoria[];
  comparativos: LinhaComparativo[];
  alertas: AlertaAuditoria[];
  receitas: number | null;
  despesas: number | null;
  anos: { ano: string; receitas: number | null; despesas: number | null; meses: number }[];
  excluidos: BalanceteAuditoria[];
  balancetes: BalanceteAuditoria[];
}

function soma(valores: readonly number[]): number {
  return valores.reduce((total, valor) => total + Math.round(valor * 100), 0) / 100;
}

function valorChave(registro: Pick<RegistroAuditoria, 'tipo' | 'categoria' | 'subcategoria'>): string {
  return JSON.stringify([registro.tipo, registro.categoria, registro.subcategoria]);
}

function competencia(balancete: BalanceteAuditoria): string {
  return balancete.origem.periodoCompetencia.inicio.slice(0, 7);
}

function diferente(a: number, b: number): boolean {
  return Math.abs(Math.round(a * 100) - Math.round(b * 100)) > 1;
}

function mediana(valores: number[]): number {
  const ordenados = [...valores].sort((a, b) => a - b);
  const meio = Math.floor(ordenados.length / 2);
  return ordenados.length % 2 ? ordenados[meio] : (ordenados[meio - 1] + ordenados[meio]) / 2;
}

function mesmaConta(a: ValoresContaAuditoria, b: ValoresContaAuditoria): boolean {
  return a.saldo_anterior === b.saldo_anterior && a.creditos === b.creditos
    && a.debitos === b.debitos && a.saldo_final === b.saldo_final;
}

@Injectable({ providedIn: 'root' })
export class AuditoriaAnaliseService {
  analisar(todos: readonly BalanceteAuditoria[], filtros: FiltrosAuditoria): ResultadoAuditoria {
    const selecionados = todos.filter(b => {
      const comp = competencia(b);
      return (!filtros.inicio || comp >= filtros.inicio) && (!filtros.fim || comp <= filtros.fim)
        && (!filtros.ano || comp.slice(0, 4) === filtros.ano)
        && (!filtros.mes || comp.slice(5, 7) === filtros.mes);
    }).sort((a, b) => competencia(a).localeCompare(competencia(b)) || a.origem.arquivoJson.localeCompare(b.origem.arquivoJson));
    const contagem = new Map<string, number>();
    selecionados.forEach(b => contagem.set(competencia(b), (contagem.get(competencia(b)) ?? 0) + 1));
    const unicos = selecionados.filter(b => contagem.get(competencia(b)) === 1);
    const excluidos = selecionados.filter(b => contagem.get(competencia(b)) !== 1);
    const termos = filtros.descricao.trim().toLocaleLowerCase('pt-BR');
    const registros: RegistroAuditoria[] = [];
    for (const b of selecionados) {
      for (const tipo of ['receitas', 'despesas'] as const) {
        b.dados[tipo].forEach((item, indice) => {
          if ((!filtros.tipo || filtros.tipo === tipo)
            && (!filtros.categoria || item.categoria === filtros.categoria)
            && (!filtros.subcategoria || item.subcategoria === filtros.subcategoria)
            && (!termos || item.descricao.toLocaleLowerCase('pt-BR').includes(termos))) {
            registros.push({ ...item, tipo, competencia: competencia(b), arquivoJson: b.origem.arquivoJson, arquivoOriginal: b.dados.arquivo, indice });
          }
        });
      }
    }
    const arquivosUnicos = new Set(unicos.map(b => b.origem.arquivoJson));
    const registrosUnicos = registros.filter(r => arquivosUnicos.has(r.arquivoJson));
    const mapas = new Map<string, RegistroAuditoria[]>();
    registrosUnicos.forEach(r => {
      const chave = valorChave(r);
      const lista = mapas.get(chave) ?? [];
      lista.push(r);
      mapas.set(chave, lista);
    });
    const comparativos: LinhaComparativo[] = [];
    const alertas: AlertaAuditoria[] = [];
    for (const itens of mapas.values()) {
      const primeiro = itens[0];
      const valores = unicos.map(b => {
        const relacionados = itens.filter(i => i.arquivoJson === b.origem.arquivoJson);
        return { competencia: competencia(b), valor: relacionados.length ? soma(relacionados.map(i => i.valor)) : null, arquivos: relacionados.length ? [b.origem.arquivoJson] : [] };
      });
      const presentes = valores.filter(v => v.valor !== null);
      const total = soma(itens.map(i => i.valor));
      const recorrente = presentes.length >= 6 && presentes.length / unicos.length >= 0.5;
      comparativos.push({
        tipo: primeiro.tipo, categoria: primeiro.categoria, subcategoria: primeiro.subcategoria,
        total, mediaCompetencia: total / unicos.length, mediaOcorrencia: total / presentes.length,
        ocorrencias: presentes.length, disponiveis: unicos.length, recorrente, valores
      });
      if (recorrente) {
        valores.filter(v => v.valor === null).forEach(v => {
          const origem = unicos.find(b => competencia(b) === v.competencia);
          alertas.push({
            tipo: 'Ausência de lançamento', competencia: v.competencia, arquivos: origem ? [origem.origem.arquivoJson] : [],
            mensagem: `${primeiro.categoria} / ${primeiro.subcategoria}: sem lançamento registrado.`,
            criterio: `Recorrência: ${presentes.length}/${unicos.length} competências; mínimo 6 e 50%.`
          });
        });
      }
      valores.forEach((v, indice) => {
        if (v.valor === null) return;
        const anteriores = valores.slice(Math.max(0, indice - 12), indice).flatMap(x => x.valor === null ? [] : [x.valor]);
        if (anteriores.length < 3) return;
        const base = mediana(anteriores);
        if (base === 0) return;
        const diferenca = v.valor - base;
        const percentual = diferenca / Math.abs(base) * 100;
        if (Math.abs(diferenca) >= filtros.limiteValor && Math.abs(percentual) > filtros.limitePercentual) {
          alertas.push({
            tipo: 'Variação relevante', competencia: v.competencia, arquivos: v.arquivos,
            mensagem: `${primeiro.categoria} / ${primeiro.subcategoria}: ${v.valor.toFixed(2)} comparado à mediana ${base.toFixed(2)}; diferença ${diferenca.toFixed(2)} (${percentual.toFixed(2)}%).`,
            criterio: `Mediana de ${anteriores.length} observações nos até 12 meses anteriores; diferença mínima R$ ${filtros.limiteValor.toFixed(2)} e variação superior a ${filtros.limitePercentual}%.`,
            detalhes: `Referências: ${valores.slice(Math.max(0, indice - 12), indice).filter(x => x.valor !== null).map(x => `${x.competencia}: ${x.valor?.toFixed(2)} (${x.arquivos.join(', ')})`).join('; ')}`
          });
        }
      });
    }
    comparativos.sort((a, b) => a.tipo.localeCompare(b.tipo) || a.categoria.localeCompare(b.categoria) || a.subcategoria.localeCompare(b.subcategoria));
    const meses: ResumoMes[] = unicos.map(b => {
      const itens = registrosUnicos.filter(r => r.arquivoJson === b.origem.arquivoJson);
      const receitas = itens.filter(r => r.tipo === 'receitas');
      const despesas = itens.filter(r => r.tipo === 'despesas');
      return {
        competencia: competencia(b), arquivo: b.origem.arquivoJson,
        receitas: receitas.length ? soma(receitas.map(r => r.valor)) : null,
        despesas: despesas.length ? soma(despesas.map(r => r.valor)) : null,
        resultado: receitas.length && despesas.length ? soma([...receitas.map(r => r.valor), ...despesas.map(r => -r.valor)]) : null
      };
    });
    const anos = [...new Set(meses.map(m => m.competencia.slice(0, 4)))].map(ano => {
      const itens = meses.filter(m => m.competencia.startsWith(ano));
      const receitas = itens.flatMap(i => i.receitas === null ? [] : [i.receitas]);
      const despesas = itens.flatMap(i => i.despesas === null ? [] : [i.despesas]);
      return { ano, receitas: receitas.length ? soma(receitas) : null, despesas: despesas.length ? soma(despesas) : null, meses: itens.length };
    });
    for (const b of selecionados) {
      const comp = competencia(b);
      const arquivo = b.origem.arquivoJson;
      if (b.origem.mesReferencia !== comp.replace('-', '')) {
        alertas.push({
          tipo: 'Referência e competência', competencia: comp, arquivos: [arquivo],
          mensagem: `Mês do arquivo ${b.origem.mesReferencia}; período interno ${b.origem.periodoCompetencia.inicio} a ${b.origem.periodoCompetencia.fim}.`,
          criterio: 'Comparação do mês no nome do arquivo com o início do período interno; a diferença não demonstra erro.'
        });
      }
      if (contagem.get(comp) !== 1) {
        alertas.push({ tipo: 'Competência ambígua', competencia: comp, arquivos: [arquivo], mensagem: 'Mais de um arquivo para esta competência; registros preservados e excluídos dos totais consolidados.', criterio: 'Contagem de arquivos por competência interna.' });
      }
      for (const tipo of ['receitas', 'despesas'] as const) {
        const declarado = tipo === 'receitas' ? b.dados.totais.total_receitas : b.dados.totais.total_despesas;
        const calculado = soma(b.dados[tipo].map(i => i.valor));
        if (diferente(calculado, declarado)) alertas.push({
          tipo: 'Itens e totais', competencia: comp, arquivos: [arquivo],
          mensagem: `${tipo}: soma dos itens R$ ${calculado.toFixed(2)}, total declarado R$ ${declarado.toFixed(2)}, diferença R$ ${(calculado - declarado).toFixed(2)}.`,
          criterio: 'Soma dos itens menos total declarado; tolerância de R$ 0,01.'
        });
      }
      const totais = b.dados.totais;
      const resultado = soma([totais.total_receitas, -totais.total_despesas]);
      if (diferente(resultado, totais.saldo)) alertas.push({ tipo: 'Resultado do balancete', competencia: comp, arquivos: [arquivo], mensagem: `Receitas menos despesas R$ ${resultado.toFixed(2)}; saldo declarado R$ ${totais.saldo.toFixed(2)}.`, criterio: 'Receitas declaradas menos despesas declaradas; tolerância de R$ 0,01.' });
      const resumo = b.dados.resumo_financeiro;
      for (const conta of [...resumo.contas, { nome: 'Total', ...resumo.total }]) {
        const calculado = soma([conta.saldo_anterior, conta.creditos, -conta.debitos]);
        if (diferente(calculado, conta.saldo_final)) alertas.push({ tipo: 'Saldo bancário', competencia: comp, arquivos: [arquivo], mensagem: `${conta.nome}: saldo anterior R$ ${conta.saldo_anterior.toFixed(2)} + créditos R$ ${conta.creditos.toFixed(2)} − débitos R$ ${conta.debitos.toFixed(2)} = R$ ${calculado.toFixed(2)}; saldo declarado R$ ${conta.saldo_final.toFixed(2)}.`, criterio: 'Conferência aritmética; tolerância de R$ 0,01.' });
      }
      for (const campo of ['saldo_anterior', 'creditos', 'debitos', 'saldo_final'] as const) {
        const calculado = soma(resumo.contas.map(c => c[campo]));
        if (diferente(calculado, resumo.total[campo])) alertas.push({ tipo: 'Total de contas', competencia: comp, arquivos: [arquivo], mensagem: `${campo}: soma das contas R$ ${calculado.toFixed(2)}; total declarado R$ ${resumo.total[campo].toFixed(2)}.`, criterio: 'Soma das contas menos total declarado; tolerância de R$ 0,01.' });
      }
      const anterior = todos.find(outro => {
        const data = new Date(`${comp}-01T00:00:00Z`);
        data.setUTCMonth(data.getUTCMonth() - 1);
        return competencia(outro) === data.toISOString().slice(0, 7);
      });
      if (anterior && mesmaConta(resumo.total, anterior.dados.resumo_financeiro.total)
        && resumo.contas.length === anterior.dados.resumo_financeiro.contas.length
        && resumo.contas.every(c => anterior.dados.resumo_financeiro.contas.some(a => a.nome === c.nome && mesmaConta(a, c)))) {
        const t = resumo.total;
        alertas.push({
          tipo: 'Resumo financeiro possivelmente reutilizado', competencia: comp, arquivos: [arquivo, anterior.origem.arquivoJson],
          mensagem: `Resumo bancário idêntico ao da competência ${competencia(anterior)}. Pendente de conferência documental.`,
          criterio: 'Contas, nomes e valores e total idênticos ao mês anterior; não determina a causa.',
          detalhes: `Período do resumo: ${resumo.periodo.inicio} a ${resumo.periodo.fim}. Saldo anterior R$ ${t.saldo_anterior.toFixed(2)}; créditos R$ ${t.creditos.toFixed(2)}; débitos R$ ${t.debitos.toFixed(2)}; saldo final R$ ${t.saldo_final.toFixed(2)}. Receitas R$ ${totais.total_receitas.toFixed(2)}; despesas R$ ${totais.total_despesas.toFixed(2)}; resultado do balancete R$ ${totais.saldo.toFixed(2)}.`
        });
      }
    }
    alertas.sort((a, b) => b.competencia.localeCompare(a.competencia) || a.tipo.localeCompare(b.tipo));
    const receitasFiltradas = registrosUnicos.filter(r => r.tipo === 'receitas');
    const despesasFiltradas = registrosUnicos.filter(r => r.tipo === 'despesas');
    return {
      meses, registros, comparativos, alertas, excluidos, balancetes: selecionados,
      receitas: receitasFiltradas.length ? soma(receitasFiltradas.map(r => r.valor)) : null,
      despesas: despesasFiltradas.length ? soma(despesasFiltradas.map(r => r.valor)) : null, anos
    };
  }
}
