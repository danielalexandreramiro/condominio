import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { BalanceteGraficosComponent } from '../balancete-graficos/balancete-graficos.component';

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

  filtroTexto: string = '';
  filtroSubcategoria: string = '';
  subcategorias: string[] = [];

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
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

    dados.forEach((mesData, index) => {

      const mes = this.mesesSelecionados[index];
      this.totais[mes] = mesData.totais;

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