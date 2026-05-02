import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class BalanceteService {

  constructor(private http: HttpClient) {}

  getMeses(): Observable<string[]> {
    return this.http.get<{ meses: string[] }>('assets/data/index.json').pipe(
      map((data: { meses: string[] }) => data.meses)
    );
  }

  getBalancete(mes: string): Observable<any> {
    return this.http.get<any>(`assets/data/${mes}.json`);
  }
}
