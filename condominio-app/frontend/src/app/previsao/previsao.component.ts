import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { NgChartsModule } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';

@Component({
  selector: 'app-previsao',
  standalone: true,
  imports: [CommonModule, FormsModule, NgChartsModule],
  templateUrl: './previsao.component.html'
})
export class PrevisaoComponent implements OnInit {

  mesesDisponiveis: string[] = [];
  mesesSelecionados: string[] = [];

  despesasOriginal: any[] = [];
  despesasFiltradas: any[] = [];

  filtroTexto = '';
  filtroSubcategoria = '';
  subcategorias: string[] = [];

  previsoes: any[] = [];
  alertas: string[] = [];

  chart?: ChartConfiguration<'line'>;

  percentualAumento = 0;

  totalPrevisto = 0;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.carregarMeses();
  }

  carregarMeses() {
    this.http.get<{ meses: string[] }>('assets/data/index.json')
      .subscribe(data => {
        this.mesesDisponiveis = data.meses;
        this.mesesSelecionados = this.mesesDisponiveis.slice(-6);
        this.carregar();
      });
  }

  carregar() {
    const requests = this.mesesSelecionados.map(m =>
      this.http.get<any>(`assets/data/${m}.json`).toPromise()
    );

    Promise.all(requests).then((dados: any[]) => {
      this.processarDados(dados);
      this.aplicarFiltro();
    });
  }

  processarDados(dados: any[]) {

    const map = new Map<string, any>();

    dados.forEach((mesData, index) => {
      const mes = this.mesesSelecionados[index];

      mesData.despesas.forEach((d: any) => {
        if (!map.has(d.subcategoria)) {
          map.set(d.subcategoria, { subcategoria: d.subcategoria, valores: {} });
        }

        map.get(d.subcategoria).valores[mes] = d.valor;
      });
    });

    this.despesasOriginal = Array.from(map.values());
    this.despesasFiltradas = [...this.despesasOriginal];

    this.subcategorias = this.despesasOriginal.map(d => d.subcategoria).sort();
  }

  aplicarFiltro() {
    let lista = [...this.despesasOriginal];

    if (this.filtroTexto) {
      const t = this.filtroTexto.toLowerCase();
      lista = lista.filter(l => l.subcategoria.toLowerCase().includes(t));
    }

    if (this.filtroSubcategoria) {
      lista = lista.filter(l => l.subcategoria === this.filtroSubcategoria);
    }

    this.despesasFiltradas = lista;

    this.calcularPrevisao();
  }

  calcularPrevisao() {
    this.previsoes = [];
    this.alertas = [];
    this.totalPrevisto = 0;

    const datasets: any[] = [];

    this.despesasFiltradas.forEach((d, index) => {

      const valores = this.mesesSelecionados.map(m => d.valores[m] || 0);

      const mediaMovel = this.calcularMediaMovel(valores);

      let previsto = mediaMovel * (1 + this.percentualAumento / 100);

      this.totalPrevisto += previsto;

      this.previsoes.push({
        subcategoria: d.subcategoria,
        valor: previsto
      });

      // ALERTA
      const ultimo = valores[valores.length - 1] || 0;
      if (previsto > ultimo * 1.2) {
        this.alertas.push(`⚠️ ${d.subcategoria} tendência de alta`);
      }

      // HISTÓRICO
      datasets.push({
        label: d.subcategoria,
        data: valores,
        borderColor: this.getColor(index),
        tension: 0.3
      });

      // PREVISÃO (linha pontilhada)
      datasets.push({
        label: `${d.subcategoria} (prev)`,
        data: [...valores.slice(0, -1), valores[valores.length - 1], previsto],
        borderColor: this.getColor(index),
        borderDash: [5, 5],
        tension: 0.3
      });

    });

    this.chart = {
      type: 'line',
      data: {
        labels: [...this.mesesSelecionados, 'Prev'],
        datasets
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'bottom'
          }
        }
      }
    };
  }

  calcularMediaMovel(valores: number[]): number {
    if (valores.length < 3) return valores[valores.length - 1] || 0;

    const ultimos = valores.slice(-3);
    const soma = ultimos.reduce((a, b) => a + b, 0);

    return soma / ultimos.length;
  }

  getColor(index: number): string {
    const cores = [
      '#0d6efd',
      '#198754',
      '#dc3545',
      '#ffc107',
      '#6f42c1',
      '#20c997'
    ];
    return cores[index % cores.length];
  }

  limparFiltro() {
    this.filtroTexto = '';
    this.filtroSubcategoria = '';
    this.percentualAumento = 0;
    this.despesasFiltradas = [...this.despesasOriginal];
    this.calcularPrevisao();
  }

  selecionarTodosMeses() {
    this.mesesSelecionados = [...this.mesesDisponiveis];
  }
}