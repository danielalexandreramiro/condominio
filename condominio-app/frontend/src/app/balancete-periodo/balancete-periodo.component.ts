import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { BalanceteGraficosComponent } from '../balancete-graficos/balancete-graficos.component';

import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Legend,
  Tooltip
} from 'chart.js';

@Component({
  selector: 'app-balancete-periodo',
  standalone: true,
  imports: [CommonModule, FormsModule, BalanceteGraficosComponent],
  templateUrl: './balancete-periodo.component.html',
  styleUrls: ['./balancete-periodo.component.scss']
})
export class BalancetePeriodoComponent implements OnInit {

  mesesDisponiveis: string[] = [];
  mesesSelecionados: string[] = [];

  receitasOriginal: any[] = [];
  despesasOriginal: any[] = [];

  receitasFiltradas: any[] = [];
  despesasFiltradas: any[] = [];

  totais: any = {};
  resumosFinanceiros: any = {};
  despesasFinanceirasData: any = {};

  filtroTexto: string = '';
  filtroSubcategoria: string = '';
  subcategorias: string[] = [];

  saldosContasAgrupados: any[] = [];

  graficoSaldoContas: any;

  totalReceitasPeriodo: number = 0;
  totalDespesasPeriodo: number = 0;
  saldoPeriodo: number = 0;

  totalSaldoAnterior: number = 0;
  totalCreditos: number = 0;
  totalDebitos: number = 0;
  totalSaldoFinal: number = 0;

  mostrarReceitas = false;
  mostrarDespesas = false;
  mostrarSaldoContas = false;
  mostrarGraficoSaldo = false;
  mostrarAnaliseGrafica = false;
  

  constructor(private http: HttpClient) {}

  ngOnInit(): void {

    Chart.register(
      LineController,
      LineElement,
      PointElement,
      LinearScale,
      CategoryScale,
      Legend,
      Tooltip
    );

    this.carregarMeses();
  }

  carregarMeses() {
    this.http.get<{ meses: string[] }>('assets/data/index.json')
      .subscribe(data => {
        this.mesesDisponiveis = data.meses;
        this.mesesSelecionados = this.mesesDisponiveis.slice(-3);
        this.carregar();
      });
  }

  carregar() {

     this.filtroTexto = '';
     
    const requests = this.mesesSelecionados.map(m =>
      this.http.get<any>(`assets/data/${m}.json`).toPromise()
    );

    Promise.all(requests).then((dados: any[]) => {
      this.processarDados(dados);
    });
  }

  processarDados(dados: any[]) {

    const receitasMap = new Map<string, any>();
    const despesasMap = new Map<string, any>();

    this.totais = {};
    this.resumosFinanceiros = {};
    this.despesasFinanceirasData = {};

    dados.forEach((mesData, index) => {

      const mes = this.mesesSelecionados[index];
      this.totais[mes] = mesData.totais;
      
      // Armazenar resumo financeiro
      if (mesData.resumo_financeiro) {
        this.resumosFinanceiros[mes] = mesData.resumo_financeiro;
      }
      
      // Extrair despesas financeiras por mês
      const despesasFinanceiras = mesData.despesas.filter((d: any) => d.categoria === 'Financeiras');
      this.despesasFinanceirasData[mes] = despesasFinanceiras;

      mesData.receitas.forEach((r: any) => {
        const key = `${r.categoria}-${r.subcategoria}`;

        if (!receitasMap.has(key)) {
          receitasMap.set(key, {
            subcategoria: r.subcategoria,
            valores: {}
          });
        }

        receitasMap.get(key).valores[mes] = r.valor;
      });

      mesData.despesas.forEach((d: any) => {
        const key = `${d.categoria}-${d.subcategoria}`;

        if (!despesasMap.has(key)) {
          despesasMap.set(key, {
            subcategoria: d.subcategoria,
            valores: {}
          });
        }

        despesasMap.get(key).valores[mes] = d.valor;
      });

    });

    this.receitasOriginal = Array.from(receitasMap.values());
    this.despesasOriginal = Array.from(despesasMap.values());

    this.receitasFiltradas = [...this.receitasOriginal];
    this.despesasFiltradas = [...this.despesasOriginal];

    this.gerarSubcategorias();

    this.montarSaldosContasAgrupados();

    this.criarGraficoSaldoContas();

    this.calcularResumoPeriodo();
    this.calcularResumoFinanceiroPeriodo();
  }

  montarSaldosContasAgrupados() {

    const mapa = new Map<string, any>();

    for (const mes of this.mesesSelecionados) {

      const resumo = this.resumosFinanceiros[mes];

      if (!resumo || !resumo.contas) {
        continue;
      }

      for (const conta of resumo.contas) {

        if (!mapa.has(conta.nome)) {

          mapa.set(conta.nome, {
            nome: conta.nome,
            valores: {}
          });

        }

        mapa.get(conta.nome).valores[mes] =
          conta.saldo_final;

      }

    }

    this.saldosContasAgrupados =
      Array.from(mapa.values());

  }

  criarGraficoSaldoContas() {

    if (this.graficoSaldoContas) {
      this.graficoSaldoContas.destroy();
    }

    const labels =
      this.mesesSelecionados.map(m =>
        this.formatarMesCurto(m)
      );

    const datasets =
      this.saldosContasAgrupados.map((conta, index) => {

        const cor = this.getColor(index);
        return {

        label: conta.nome,

        data: this.mesesSelecionados.map(m =>
          conta.valores[m] || 0
        ),

        borderColor: cor,
        backgroundColor: cor,

        borderWidth: 3,
        pointRadius: 4,
        pointHoverRadius: 6,

        fill: false,

        tension: 0.3

      };

      });

    this.graficoSaldoContas = new Chart(
      'graficoSaldoContas',
      {
        type: 'line',
        data: {
          labels,
          datasets
        },
        options: {
          responsive: true,
         plugins: {
          legend: {
            position: 'bottom'
          },
          tooltip: {
            mode: 'nearest',
            intersect: false,
            callbacks: {

              label: function(context: any) { 

                const valor = context.parsed.y || 0;

                return `${context.dataset.label}: ${
                  valor.toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL'
                  })
                }`;
              }
            }
          }

      },
     scales: {

  y: {

    grid: {
      color: '#b0b0b0'
    },

    ticks: {

      callback: function(value: any) {

        return 'R$ ' +
          Number(value).toLocaleString('pt-BR');

      }

    }

  }

}
        }
      }
    );
  }

  gerarSubcategorias() {
    const set = new Set<string>();

    this.receitasOriginal.forEach(r => set.add(r.subcategoria));
    this.despesasOriginal.forEach(d => set.add(d.subcategoria));

    this.subcategorias = Array.from(set).sort();
  }

  aplicarFiltro() {

    let receitas = [...this.receitasOriginal];
    let despesas = [...this.despesasOriginal];

    if (this.filtroSubcategoria) {
      receitas = receitas.filter(r => r.subcategoria === this.filtroSubcategoria);
      despesas = despesas.filter(d => d.subcategoria === this.filtroSubcategoria);
    }

    if (this.filtroTexto && this.filtroTexto.trim() !== '') {
      const texto = this.filtroTexto.toLowerCase();

      receitas = receitas.filter(r =>
        r.subcategoria.toLowerCase().includes(texto)
      );

      despesas = despesas.filter(d =>
        d.subcategoria.toLowerCase().includes(texto)
      );
    }

    this.receitasFiltradas = receitas;
this.despesasFiltradas = despesas;

this.calcularResumoPeriodo();
  }

  limparFiltro() {
    this.filtroTexto = '';
    this.filtroSubcategoria = '';
    this.mesesSelecionados = [];
    this.receitasFiltradas = [];
    this.despesasFiltradas = [];

      // LIMPAR CARDS
    this.totalReceitasPeriodo = 0;
    this.totalDespesasPeriodo = 0;
    this.saldoPeriodo = 0;


    this.totalSaldoAnterior = 0;
    this.totalCreditos = 0;
    this.totalDebitos = 0;
    this.totalSaldoFinal = 0;
  }

 selecionarTodosMeses() {

  this.filtroTexto = '';

  this.mesesSelecionados = [...this.mesesDisponiveis];

  this.carregar();
}

  formatarMesCurto(valor: string): string {
    const ano = valor.substring(2, 4);
    const mes = valor.substring(4, 6);

    const nomes: any = {
      '01': 'Jan', '02': 'Fev', '03': 'Mar',
      '04': 'Abr', '05': 'Mai', '06': 'Jun',
      '07': 'Jul', '08': 'Ago', '09': 'Set',
      '10': 'Out', '11': 'Nov', '12': 'Dez'
    };

    return `${nomes[mes]}/${ano}`;
  }


  calcularResumoPeriodo() {

  this.totalReceitasPeriodo = 0;
  this.totalDespesasPeriodo = 0;
  this.saldoPeriodo = 0;

  // SEM FILTRO → comportamento atual
  if (!this.filtroTexto || this.filtroTexto.trim() === '') {

    for (const mes of this.mesesSelecionados) {

      if (!this.totais[mes]) {
        continue;
      }

      this.totalReceitasPeriodo +=
        this.totais[mes].total_receitas || 0;

      this.totalDespesasPeriodo +=
        this.totais[mes].total_despesas || 0;

      this.saldoPeriodo +=
        this.totais[mes].saldo || 0;

    }

    return;
  }

  // COM FILTRO → soma somente itens filtrados

  for (const linha of this.receitasFiltradas) {

    for (const mes of this.mesesSelecionados) {

      this.totalReceitasPeriodo +=
        linha.valores[mes] || 0;

    }

  }

  for (const linha of this.despesasFiltradas) {

    for (const mes of this.mesesSelecionados) {

      this.totalDespesasPeriodo +=
        linha.valores[mes] || 0;

    }

  }

  this.saldoPeriodo =
    this.totalReceitasPeriodo -
    this.totalDespesasPeriodo;
}


calcularResumoFinanceiroPeriodo() {

  this.totalSaldoAnterior = 0;
  this.totalCreditos = 0;
  this.totalDebitos = 0;
  this.totalSaldoFinal = 0;

  if (!this.mesesSelecionados.length) {
    return;
  }

  // ordenar meses
  const mesesOrdenados = [...this.mesesSelecionados].sort();

  // PRIMEIRO mês selecionado
  const primeiroMes = mesesOrdenados[0];

  const resumoInicial =
    this.resumosFinanceiros?.[primeiroMes]?.total;

  // saldo inicial = somente do primeiro mês
  this.totalSaldoAnterior =
    resumoInicial?.saldo_anterior || 0;

  // soma créditos e débitos do período
  for (const mes of mesesOrdenados) {

    const resumo = this.resumosFinanceiros?.[mes]?.total;

    if (!resumo) {
      continue;
    }

    this.totalCreditos += resumo.creditos || 0;
    this.totalDebitos += resumo.debitos || 0;

  }

  // saldo final acumulado do período
  this.totalSaldoFinal =
    this.totalSaldoAnterior
    + this.totalCreditos
    - this.totalDebitos;

}
getColor(index: number): string {

  const cores = [

    '#0d6efd', // azul
    '#198754', // verde
    '#dc3545', // vermelho
    '#ffc107', // amarelo
    '#6f42c1', // roxo
    '#20c997', // verde água
    '#fd7e14', // laranja
    '#0dcaf0', // ciano
    '#6610f2', // violeta
    '#ff5722', // laranja forte
    '#795548', // marrom
    '#e91e63', // rosa forte
    '#009688', // teal
    '#3f51b5', // índigo
    '#8bc34a', // verde limão
    '#ff9800', // laranja
    '#9c27b0', // púrpura
    '#607d8b', // azul acinzentado
    '#c2185b', // pink escuro
    '#4caf50'  // verde forte

  ];

  return cores[index % cores.length];

}
filtrarAno(ano: string) {

  this.filtroTexto = '';

  this.mesesSelecionados =
    this.mesesDisponiveis.filter(m =>
      m.startsWith(ano)
    );

  this.carregar();
}


get mediaReceitasFiltro(): number {

  if (!this.filtroTexto?.trim()) {
    return 0;
  }

  const total = this.receitasFiltradas.reduce((acc, linha) => {

    const somaLinha = this.mesesSelecionados.reduce(
      (soma, mes) => soma + (linha.valores[mes] || 0),
      0
    );

    return acc + somaLinha;

  }, 0);

  return total / this.mesesSelecionados.length;
}

get mediaDespesasFiltro(): number {

  if (!this.filtroTexto?.trim()) {
    return 0;
  }

  const total = this.despesasFiltradas.reduce((acc, linha) => {

    const somaLinha = this.mesesSelecionados.reduce(
      (soma, mes) => soma + (linha.valores[mes] || 0),
      0
    );

    return acc + somaLinha;

  }, 0);

  return total / this.mesesSelecionados.length;
}
}