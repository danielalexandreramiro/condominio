import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BalanceteService } from '../services/balancete.service';

interface ItemBalancete {
  categoria: string;
  subcategoria: string;
  descricao: string;
  valor: number;
}

interface LinhaComparativa {
  tipo: string;
  categoria: string;
  subcategoria: string;
  valores: Record<string, number>;
}

type TotaisMes = {
  total_receitas: number;
  total_despesas: number;
  saldo: number;
};

@Component({
  selector: 'app-balancete-periodo',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './balancete-periodo.component.html',
  styleUrls: ['./balancete-periodo.component.scss']
})
export class BalancetePeriodoComponent implements OnInit {

  mesesDisponiveis: string[] = [];
  mesesSelecionados: string[] = [];

  receitas: LinhaComparativa[] = [];
  despesas: LinhaComparativa[] = [];

  receitasFiltradas: LinhaComparativa[] = [];
  despesasFiltradas: LinhaComparativa[] = [];

  filtroSubcategoria: string = '';

  totais: Record<string, TotaisMes> = {};

  ordemAtual: { [key: string]: 'asc' | 'desc' } = {};

  constructor(private service: BalanceteService) {}

  ngOnInit(): void {
    this.service.getMeses().subscribe(meses => {
      this.mesesDisponiveis = meses;
      this.mesesSelecionados = [...meses];
      this.carregar();
    });
  }

  aplicarFiltro() {
  const texto = this.filtroSubcategoria.toLowerCase();

  this.receitasFiltradas = this.receitas.filter(l =>
    l.subcategoria.toLowerCase().includes(texto)
  );

  this.despesasFiltradas = this.despesas.filter(l =>
    l.subcategoria.toLowerCase().includes(texto)
  );
}

  async carregar() {
    const balancetes = await Promise.all(
      this.mesesSelecionados.map(async m => {
        try {
          return await this.service.getBalancete(m).toPromise();
        } catch {
          return { receitas: [], despesas: [], totais: {} };
        }
      })
    );

    const mapaReceitas = new Map<string, LinhaComparativa>();
    const mapaDespesas = new Map<string, LinhaComparativa>();

    balancetes.forEach((balancete, i) => {
      const mes = this.mesesSelecionados[i];

      // RECEITAS
      (balancete.receitas ?? []).forEach((item: ItemBalancete) => {
        const chave = `${item.categoria}|${item.subcategoria}`;

        if (!mapaReceitas.has(chave)) {
          mapaReceitas.set(chave, {
            tipo: 'Receita',
            categoria: item.categoria,
            subcategoria: item.subcategoria,
            valores: {} as Record<string, number>
          });
        }

        mapaReceitas.get(chave)!.valores[mes] = item.valor;
      });

      // DESPESAS
      (balancete.despesas ?? []).forEach((item: ItemBalancete) => {
        const chave = `${item.categoria}|${item.subcategoria}`;

        if (!mapaDespesas.has(chave)) {
          mapaDespesas.set(chave, {
            tipo: 'Despesa',
            categoria: item.categoria,
            subcategoria: item.subcategoria,
            valores: {} as Record<string, number>
          });
        }

        mapaDespesas.get(chave)!.valores[mes] = item.valor;
      });

      // TOTAIS
      if (balancete.totais) {
        this.totais[mes] = {
          total_receitas: balancete.totais.total_receitas,
          total_despesas: balancete.totais.total_despesas,
          saldo: balancete.totais.saldo
        };
      }
    });

    // ORDENAR INICIALMENTE
    const ordenarCatSub = (a: LinhaComparativa, b: LinhaComparativa) => {
      const c = a.categoria.localeCompare(b.categoria);
      return c !== 0 ? c : a.subcategoria.localeCompare(b.subcategoria);
    };

    this.receitas = Array.from(mapaReceitas.values()).sort(ordenarCatSub);
    this.despesas = Array.from(mapaDespesas.values()).sort(ordenarCatSub);

    this.aplicarFiltro();
  }

  ordenarPorMes(mes: string, tipo: 'receitas' | 'despesas') {
    const lista = tipo === 'receitas' ? this.receitasFiltradas : this.despesasFiltradas;

    const chave = `${tipo}_${mes}`;
    const ordem = this.ordemAtual[chave] === 'asc' ? 'desc' : 'asc';
    this.ordemAtual[chave] = ordem;

    lista.sort((a, b) => {
      const v1 = a.valores[mes] ?? 0;
      const v2 = b.valores[mes] ?? 0;
      return ordem === 'asc' ? v1 - v2 : v2 - v1;
    });
  }

  ordenarPorCampo(campo: 'categoria' | 'subcategoria', tipo: 'receitas' | 'despesas') {
    const lista = tipo === 'receitas' ? this.receitasFiltradas : this.despesasFiltradas;

    const chave = `${tipo}_${campo}`;
    const ordem = this.ordemAtual[chave] === 'asc' ? 'desc' : 'asc';
    this.ordemAtual[chave] = ordem;

    lista.sort((a, b) => {
      const v1 = a[campo].toLowerCase();
      const v2 = b[campo].toLowerCase();
      return ordem === 'asc' ? v1.localeCompare(v2) : v2.localeCompare(v1);
    });
  }
}
