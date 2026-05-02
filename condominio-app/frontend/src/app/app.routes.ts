import { Routes } from '@angular/router';
import { BalancetePeriodoComponent } from './balancete-periodo/balancete-periodo.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { HomeComponent } from './home/home.component';
import { EntityComponent } from './entity/entity.component';

export const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: 'home', component: HomeComponent },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'balancete-periodo', component: BalancetePeriodoComponent },
  { path: 'entity/:destino', component: EntityComponent },
];
