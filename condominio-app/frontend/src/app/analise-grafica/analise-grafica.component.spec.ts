import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AnaliseGraficaComponent } from './analise-grafica.component';

describe('AnaliseGraficaComponent', () => {
  let component: AnaliseGraficaComponent;
  let fixture: ComponentFixture<AnaliseGraficaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AnaliseGraficaComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AnaliseGraficaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
