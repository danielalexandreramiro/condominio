import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgChartsModule } from 'ng2-charts';
import { ChartConfiguration, ChartDataset } from 'chart.js';

@Component({
  selector: 'app-balancete-graficos',
  standalone: true,
  imports: [CommonModule, NgChartsModule],
  templateUrl: './balancete-graficos.component.html',
  styleUrls: ['./balancete-graficos.component.scss']
})
export class BalanceteGraficosComponent implements OnChanges {

  @Input() receitas: any[] = [];
  @Input() despesas: any[] = [];
  @Input() meses: string[] = [];

  receitasChart?: ChartConfiguration<'line'>;
  despesasChart?: ChartConfiguration<'line'>;

  ngOnChanges() {
    this.receitasChart = this.gerarGrafico(this.receitas);
    this.despesasChart = this.gerarGrafico(this.despesas);
  }

  gerarGrafico(lista: any[]): ChartConfiguration<'line'> {

    const datasets: ChartDataset<'line'>[] = lista.map((linha, index) => ({
      label: linha.subcategoria,
      data: this.meses.map(m => linha.valores[m] || 0),

      borderColor: this.getColor(index),
      backgroundColor: this.getColor(index),

      tension: 0.3,
      fill: false,
      borderWidth: 2,
      pointRadius: 2
    }));

    return {
      type: 'line',
      data: {
        labels: this.meses.map(m => this.formatarMesCurto(m)),
        datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,

        interaction: {
          mode: 'nearest',
          intersect: false
        },

        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              boxWidth: 12
            }
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
        }
      }
    };
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