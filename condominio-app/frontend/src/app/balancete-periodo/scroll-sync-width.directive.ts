import { AfterViewInit, Directive, ElementRef, Input, OnDestroy } from '@angular/core';

@Directive({
  selector: '[appScrollSyncWidth]',
  standalone: true
})
export class ScrollSyncWidthDirective implements AfterViewInit, OnDestroy {
  @Input({ required: true }) appScrollSyncWidth!: HTMLElement;

  private observer?: ResizeObserver;

  constructor(private element: ElementRef<HTMLElement>) {}

  ngAfterViewInit(): void {
    const top = this.element.nativeElement;
    const content = top.firstElementChild as HTMLElement;
    const table = this.appScrollSyncWidth.querySelector('table');

    this.observer = new ResizeObserver(() => {
      content.style.width = `${this.appScrollSyncWidth.scrollWidth + top.clientWidth - this.appScrollSyncWidth.clientWidth}px`;
      top.scrollLeft = this.appScrollSyncWidth.scrollLeft;
    });
    this.observer.observe(top);
    this.observer.observe(this.appScrollSyncWidth);
    if (table) {
      this.observer.observe(table);
    }
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }
}
