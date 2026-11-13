import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { catchError, forkJoin, map, of, switchMap } from 'rxjs';
import { BalanceteAuditoria } from './models/auditoria-balancete.model';
import { AuditoriaAnaliseService, FiltrosAuditoria, ResultadoAuditoria, ResumoMes } from './services/auditoria-analise.service';
import { AuditoriaLeituraService } from './services/auditoria-leitura.service';
import { PRIVATE } from '../../environments/private';

type Aba = 'visao' | 'comparativos' | 'lancamentos' | 'alertas';

@Component({
  selector: 'app-auditoria-comparativa',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './auditoria-comparativa.component.html',
  styleUrls: ['./auditoria-comparativa.component.scss']
})
export class AuditoriaComparativaComponent {
  codigo = '';
  codigoIncorreto = false;
  acessoLiberado = false;
  aba: Aba = 'visao';
  carregando = false;
  erroIndice = '';
  falhas: string[] = [];
  balancetes: BalanceteAuditoria[] = [];
  resultado?: ResultadoAuditoria;
  tipoAlerta = '';
  filtros: FiltrosAuditoria = {
    inicio: '', fim: '', ano: '', mes: '', tipo: '', categoria: '', subcategoria: '',
    descricao: '', limitePercentual: 30, limiteValor: 500
  };

  constructor(private readonly leitura: AuditoriaLeituraService, private readonly analise: AuditoriaAnaliseService) {}

  validarCodigo(): void {
    if (this.codigo === PRIVATE.entity) {
      this.codigo = '';
      this.codigoIncorreto = false;
      this.acessoLiberado = true;
      this.carregar();
    } else {
      this.codigoIncorreto = true;
    }
  }

  carregar(): void {
    this.carregando = true;
    this.erroIndice = '';
    this.falhas = [];
    this.leitura.getMeses().pipe(
      switchMap(meses => meses.length ? forkJoin(meses.map(mes =>
        this.leitura.getBalancete(mes).pipe(
          map(dados => ({ dados, falha: '' })),
          catchError((erro: unknown) => of({ dados: null, falha: `${mes}.json: ${this.mensagemErro(erro)}` }))
        )
      )) : of([]))
    ).subscribe({
      next: resultados => {
        this.balancetes = resultados.flatMap(r => r.dados ? [r.dados] : []);
        this.falhas = resultados.flatMap(r => r.falha ? [r.falha] : []);
        this.carregando = false;
        this.aplicar();
      },
      error: (erro: unknown) => {
        this.carregando = false;
        this.erroIndice = `Não foi possível carregar o índice: ${this.mensagemErro(erro)}`;
      }
    });
  }

  aplicar(): void {
    this.resultado = this.analise.analisar(this.balancetes, this.filtros);
  }

  limpar(): void {
    this.filtros = { inicio: '', fim: '', ano: '', mes: '', tipo: '', categoria: '', subcategoria: '', descricao: '', limitePercentual: 30, limiteValor: 500 };
    this.tipoAlerta = '';
    this.aplicar();
  }

  get anosDisponiveis(): string[] {
    return [...new Set(this.balancetes.map(b => b.origem.periodoCompetencia.inicio.slice(0, 4)))].sort();
  }

  get categorias(): string[] {
    return [...new Set(this.balancetes.flatMap(b => [...(!this.filtros.tipo || this.filtros.tipo === 'receitas' ? b.dados.receitas : []), ...(!this.filtros.tipo || this.filtros.tipo === 'despesas' ? b.dados.despesas : [])].map(r => r.categoria)))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }

  get subcategorias(): string[] {
    return [...new Set(this.balancetes.flatMap(b => [...(!this.filtros.tipo || this.filtros.tipo === 'receitas' ? b.dados.receitas : []), ...(!this.filtros.tipo || this.filtros.tipo === 'despesas' ? b.dados.despesas : [])].filter(r => !this.filtros.categoria || r.categoria === this.filtros.categoria).map(r => r.subcategoria)))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }

  get tiposAlerta(): string[] {
    return [...new Set(this.resultado?.alertas.map(a => a.tipo) ?? [])].sort();
  }

  get alertasVisiveis() {
    return this.resultado?.alertas.filter(a => !this.tipoAlerta || a.tipo === this.tipoAlerta) ?? [];
  }

  get escalaGrafico(): number {
    return Math.max(1, ...(this.resultado?.meses.flatMap(m => [Math.abs(m.receitas ?? 0), Math.abs(m.despesas ?? 0)]) ?? []));
  }

  anterior(mes: ResumoMes, meses: number): ResumoMes | undefined {
    const data = new Date(`${mes.competencia}-01T00:00:00Z`);
    data.setUTCMonth(data.getUTCMonth() - meses);
    const chave = data.toISOString().slice(0, 7);
    return this.resultado?.meses.find(m => m.competencia === chave);
  }

  anoAnterior(ano: string) {
    return this.resultado?.anos.find(item => item.ano === String(Number(ano) - 1));
  }

  mostrarMes(competencia: string): void {
    this.filtros.inicio = competencia;
    this.filtros.fim = competencia;
    this.filtros.ano = '';
    this.filtros.mes = '';
    this.aplicar();
    this.aba = 'lancamentos';
  }

  variacao(atual: number | null, base: number | null | undefined): number | null {
    return atual === null || base === null || base === undefined ? null : atual - base;
  }

  percentual(atual: number | null, base: number | null | undefined): number | null {
    const diferenca = this.variacao(atual, base);
    return diferenca === null || !base ? null : diferenca / Math.abs(base) * 100;
  }

  mudarTipo(): void {
    this.filtros.categoria = '';
    this.filtros.subcategoria = '';
    this.aplicar();
  }

  mudarCategoria(): void {
    this.filtros.subcategoria = '';
    this.aplicar();
  }

  private mensagemErro(erro: unknown): string {
    return erro instanceof Error ? erro.message : String(erro);
  }
}
