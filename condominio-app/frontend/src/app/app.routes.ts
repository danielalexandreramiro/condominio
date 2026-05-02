import { Routes } from '@angular/router';
import { BalancetePeriodoComponent } from './balancete-periodo/balancete-periodo.component';
import { DashboardComponent } from './dashboard/dashboard.component';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'balancete-periodo', component: BalancetePeriodoComponent }
];

