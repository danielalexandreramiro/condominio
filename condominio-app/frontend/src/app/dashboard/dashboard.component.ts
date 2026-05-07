import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BalanceteService } from '../services/balancete.service';
import { Balancete } from '../models/balancete.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {

  balancete?: Balancete;

  meses: string[] = [];
  mesSelecionado = '';

  constructor(private balanceteService: BalanceteService) {}

  ngOnInit(): void {
    this.carregarMeses();
  }

  carregarMeses(): void {
    this.balanceteService.getMeses().subscribe({
      next: (meses) => {
        this.meses = meses;

        // último mês automático
        this.mesSelecionado = this.meses[this.meses.length - 1];

        this.carregarBalancete();
      },
      error: (err) => console.error('Erro ao carregar meses:', err)
    });
  }

  carregarBalancete(): void {
    if (!this.mesSelecionado) return;

    this.balanceteService.getBalancete(this.mesSelecionado)
      .subscribe({
        next: (data) => this.balancete = data,
        error: (err) => console.error('Erro ao carregar balancete:', err)
      });
  }

  getDespesasFinanceiras(): any[] {
    if (!this.balancete) return [];
    return this.balancete.despesas.filter(d => d.categoria === 'Financeiras');
  }

  formatarMes(valor: string): string {
    const ano = valor.substring(0, 4);
    const mes = valor.substring(4, 6);

    const nomes: any = {
      '01': 'Janeiro',
      '02': 'Fevereiro',
      '03': 'Março',
      '04': 'Abril',
      '05': 'Maio',
      '06': 'Junho',
      '07': 'Julho',
      '08': 'Agosto',
      '09': 'Setembro',
      '10': 'Outubro',
      '11': 'Novembro',
      '12': 'Dezembro'
    };

    return `${nomes[mes]}/${ano}`;
  }

}