import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BalancetePeriodoComponent } from './balancete-periodo.component';

describe('BalancetePeriodoComponent', () => {
  let component: BalancetePeriodoComponent;
  let fixture: ComponentFixture<BalancetePeriodoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BalancetePeriodoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BalancetePeriodoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
