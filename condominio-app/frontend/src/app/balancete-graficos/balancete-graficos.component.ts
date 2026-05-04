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
            mode: 'index',
            intersect: false
          }
        }
      }
    };
  }

  getColor(index: number): string {
    const cores = [
      '#0d6efd', '#198754', '#dc3545', '#ffc107',
      '#6f42c1', '#20c997', '#fd7e14', '#0dcaf0',
      '#6610f2', '#adb5bd'
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