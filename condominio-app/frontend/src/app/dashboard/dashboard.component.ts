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
  mesSelecionado = '202602';

  constructor(private balanceteService: BalanceteService) {}

  ngOnInit(): void {
    this.carregarBalancete();
  }

  carregarBalancete(): void {
    this.balanceteService.getBalancete(this.mesSelecionado)
      .subscribe({
        next: data => this.balancete = data,
        error: err => console.error('Erro ao carregar balancete:', err)
      });
  }
}
