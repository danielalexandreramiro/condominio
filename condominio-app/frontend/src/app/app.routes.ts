import { Routes } from '@angular/router';
import { BalancetePeriodoComponent } from './balancete-periodo/balancete-periodo.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { HomeComponent } from './home/home.component';
import { EntityComponent } from './entity/entity.component';
import { AnaliseGraficaComponent } from './analise-grafica/analise-grafica.component';
import { PrevisaoComponent } from './previsao/previsao.component';

export const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: 'home', component: HomeComponent },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'balancete-periodo', component: BalancetePeriodoComponent },
  { path: 'entity/:destino', component: EntityComponent },
  { path: 'analise-grafica', component: AnaliseGraficaComponent },  
  { path: 'previsao', component: PrevisaoComponent }
];
