import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { provideRouter } from '@angular/router';
import { routes } from './app/app.routes';
import { provideHttpClient } from '@angular/common/http';

const retornoAuditoria = new URLSearchParams(window.location.search).get('auditoria-retorno');
if (retornoAuditoria && URL.canParse(retornoAuditoria, window.location.origin)) {
  const destino = new URL(retornoAuditoria, window.location.origin);
  const base = new URL(document.baseURI);
  if (destino.origin === window.location.origin && destino.pathname === `${base.pathname}auditoria-comparativa`) {
    window.history.replaceState(null, '', destino.pathname + destino.search + destino.hash);
  }
}

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes),
    provideHttpClient()
  ]
});
