import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BalanceteGraficosComponent } from './balancete-graficos.component';

describe('BalanceteGraficosComponent', () => {
  let component: BalanceteGraficosComponent;
  let fixture: ComponentFixture<BalanceteGraficosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BalanceteGraficosComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BalanceteGraficosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
