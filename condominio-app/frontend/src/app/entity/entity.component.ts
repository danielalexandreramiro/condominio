import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PRIVATE } from '../../environments/private';

@Component({
  selector: 'app-entity',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './entity.component.html',
  styleUrls: ['./entity.component.scss']   // deixe aqui SE o arquivo existir
})
export class EntityComponent {

  entity = '';
  erro = false;
  rotaDestino = '';

  constructor(
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.rotaDestino = this.route.snapshot.paramMap.get('destino') || '';
  }

  validarEntity() {
    if (this.entity === PRIVATE.entity) {
      this.router.navigate([this.rotaDestino]);
    } else {
      this.erro = true;
    }
  }
}
