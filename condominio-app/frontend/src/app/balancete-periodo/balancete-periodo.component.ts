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
      this.saldosContasAgrupados.map(conta => {

        return {

          label: conta.nome,

          data: this.mesesSelecionados.map(m =>
            conta.valores[m] || 0
          ),

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
            }

          },

          scales: {

            y: {

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
  }

  limparFiltro() {
    this.filtroTexto = '';
    this.filtroSubcategoria = '';
    this.mesesSelecionados = [];
    this.receitasFiltradas = [];
    this.despesasFiltradas = [];
  }

  selecionarTodosMeses() {
    this.mesesSelecionados = [...this.mesesDisponiveis];
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

}