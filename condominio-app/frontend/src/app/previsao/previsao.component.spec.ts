import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PrevisaoComponent } from './previsao.component';

describe('PrevisaoComponent', () => {
  let component: PrevisaoComponent;
  let fixture: ComponentFixture<PrevisaoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PrevisaoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PrevisaoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
