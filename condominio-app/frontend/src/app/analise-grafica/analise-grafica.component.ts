import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { BalanceteGraficosComponent } from '../balancete-graficos/balancete-graficos.component';
import { NgChartsModule } from 'ng2-charts';

@Component({
  selector: 'app-analise-grafica',
  standalone: true,
  imports: [CommonModule, FormsModule, BalanceteGraficosComponent, NgChartsModule],
  templateUrl: './analise-grafica.component.html'
})
export class AnaliseGraficaComponent implements OnInit {

  mesesDisponiveis: string[] = [];
  mesesSelecionados: string[] = [];

  receitasOriginal: any[] = [];
  despesasOriginal: any[] = [];

  receitasFiltradas: any[] = [];
  despesasFiltradas: any[] = [];

  filtroTexto = '';
  filtroSubcategoria = '';
  subcategorias: string[] = [];

  pizzaChart: any;
  comparativo: any[] = [];
  ranking: any[] = [];
  alertas: string[] = [];

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.carregarMeses();
  }

  carregarMeses() {
    this.http.get<{ meses: string[] }>('assets/data/index.json')
      .subscribe(data => {
        this.mesesDisponiveis = data.meses;
        this.mesesSelecionados = this.mesesDisponiveis.slice(-2);
        this.carregar();
      });
  }

  carregar() {
    const requests = this.mesesSelecionados.map(m =>
      this.http.get<any>(`assets/data/${m}.json`).toPromise()
    );

    Promise.all(requests).then((dados: any[]) => {
      this.processarDados(dados);
      this.aplicarFiltro(); // 🔥 centraliza tudo
    });
  }

  processarDados(dados: any[]) {

    const receitasMap = new Map<string, any>();
    const despesasMap = new Map<string, any>();

    dados.forEach((mesData, index) => {

      const mes = this.mesesSelecionados[index];

      mesData.receitas.forEach((r: any) => {
        if (!receitasMap.has(r.subcategoria)) {
          receitasMap.set(r.subcategoria, { subcategoria: r.subcategoria, valores: {} });
        }
        receitasMap.get(r.subcategoria).valores[mes] = r.valor;
      });

      mesData.despesas.forEach((d: any) => {
        if (!despesasMap.has(d.subcategoria)) {
          despesasMap.set(d.subcategoria, { subcategoria: d.subcategoria, valores: {} });
        }
        despesasMap.get(d.subcategoria).valores[mes] = d.valor;
      });

    });

    this.receitasOriginal = Array.from(receitasMap.values());
    this.despesasOriginal = Array.from(despesasMap.values());

    this.receitasFiltradas = [...this.receitasOriginal];
    this.despesasFiltradas = [...this.despesasOriginal];

    this.gerarSubcategorias();
  }

  aplicarFiltro() {
    let receitas = [...this.receitasOriginal];
    let despesas = [...this.despesasOriginal];

    if (this.filtroSubcategoria) {
      receitas = receitas.filter(r => r.subcategoria === this.filtroSubcategoria);
      despesas = despesas.filter(d => d.subcategoria === this.filtroSubcategoria);
    }

    if (this.filtroTexto) {
      const texto = this.filtroTexto.toLowerCase();

      receitas = receitas.filter(r => r.subcategoria.toLowerCase().includes(texto));
      despesas = despesas.filter(d => d.subcategoria.toLowerCase().includes(texto));
    }

    this.receitasFiltradas = receitas;
    this.despesasFiltradas = despesas;

    this.gerarAnalise();
  }

  gerarAnalise() {
    this.gerarPizza();
    this.gerarComparativo();
    this.gerarRanking();
    this.gerarAlertas();
  }

  getMesAtual(): string | null {
    return this.mesesSelecionados.length
      ? this.mesesSelecionados[this.mesesSelecionados.length - 1]
      : null;
  }

  gerarPizza() {
    const mesAtual = this.getMesAtual();
    if (!mesAtual) return;

    const labels = this.despesasFiltradas.map(d => d.subcategoria);
    const valores = this.despesasFiltradas.map(d => d.valores[mesAtual] || 0);

    this.pizzaChart = {
      data: {
        labels,
        datasets: [{ data: valores }]
      }
    };
  }

  gerarComparativo() {
    if (this.mesesSelecionados.length < 2) return;

    const mes1 = this.mesesSelecionados[this.mesesSelecionados.length - 2];
    const mes2 = this.mesesSelecionados[this.mesesSelecionados.length - 1];

    this.comparativo = this.despesasFiltradas.map(d => {
      const v1 = d.valores[mes1] || 0;
      const v2 = d.valores[mes2] || 0;

      return {
        subcategoria: d.subcategoria,
        diferenca: v2 - v1
      };
    });
  }

  gerarRanking() {
    const mesAtual = this.getMesAtual();
    if (!mesAtual) return;

    this.ranking = [...this.despesasFiltradas]
      .map(d => ({
        subcategoria: d.subcategoria,
        valor: d.valores[mesAtual] || 0
      }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 5);
  }

  gerarAlertas() {
    this.alertas = [];

    this.comparativo.forEach(c => {
      if (c.diferenca > 1000) {
        this.alertas.push(
          `⚠️ ${c.subcategoria} aumentou R$ ${c.diferenca.toFixed(2)}`
        );
      }
    });
  }

  gerarSubcategorias() {
    const set = new Set<string>();

    this.receitasOriginal.forEach(r => set.add(r.subcategoria));
    this.despesasOriginal.forEach(d => set.add(d.subcategoria));

    this.subcategorias = Array.from(set).sort();
  }

  limparFiltro() {
    this.filtroTexto = '';
    this.filtroSubcategoria = '';

    this.receitasFiltradas = [...this.receitasOriginal];
    this.despesasFiltradas = [...this.despesasOriginal];

    this.gerarAnalise();
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