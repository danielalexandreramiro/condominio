import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, defer, map, shareReplay, throwError } from 'rxjs';
import {
  BalanceteAuditoria,
  BalanceteOriginalAuditoria
} from '../models/auditoria-balancete.model';

export type TipoErroLeituraAuditoria =
  | 'referencia-invalida'
  | 'leitura'
  | 'json-invalido'
  | 'campo-ausente'
  | 'campo-invalido';

export class ErroLeituraAuditoria extends Error {
  constructor(
    readonly tipo: TipoErroLeituraAuditoria,
    readonly arquivo: string,
    mensagem: string,
    readonly campo?: string,
    causa?: unknown
  ) {
    super(mensagem, { cause: causa });
    this.name = 'ErroLeituraAuditoria';
  }
}

function objeto(valor: unknown, arquivo: string, campo: string): Record<string, unknown> {
  if (typeof valor !== 'object' || valor === null || Array.isArray(valor)) {
    throw new ErroLeituraAuditoria('campo-invalido', arquivo, `Objeto inválido: ${campo}`, campo);
  }
  return valor as Record<string, unknown>;
}

function propriedade(
  registro: Record<string, unknown>,
  nome: string,
  arquivo: string,
  caminho: string
): unknown {
  const campo = `${caminho}.${nome}`;
  if (!Object.hasOwn(registro, nome)) {
    throw new ErroLeituraAuditoria('campo-ausente', arquivo, `Campo ausente: ${campo}`, campo);
  }
  return registro[nome];
}

function texto(valor: unknown, arquivo: string, campo: string): void {
  if (typeof valor !== 'string') {
    throw new ErroLeituraAuditoria('campo-invalido', arquivo, `Texto inválido: ${campo}`, campo);
  }
}

function numero(valor: unknown, arquivo: string, campo: string): void {
  if (typeof valor !== 'number' || !Number.isFinite(valor)) {
    throw new ErroLeituraAuditoria('campo-invalido', arquivo, `Número inválido: ${campo}`, campo);
  }
}

function lista(valor: unknown, arquivo: string, campo: string): unknown[] {
  if (!Array.isArray(valor)) {
    throw new ErroLeituraAuditoria('campo-invalido', arquivo, `Lista inválida: ${campo}`, campo);
  }
  return valor;
}

function validarCampos(
  registro: Record<string, unknown>,
  nomes: readonly string[],
  arquivo: string,
  caminho: string,
  validar: (valor: unknown, arquivo: string, campo: string) => void
): void {
  for (const nome of nomes) {
    validar(propriedade(registro, nome, arquivo, caminho), arquivo, `${caminho}.${nome}`);
  }
}

function dataValida(valor: unknown, arquivo: string, campo: string): void {
  texto(valor, arquivo, campo);
  if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    throw new ErroLeituraAuditoria('campo-invalido', arquivo, `Data inválida: ${campo}`, campo);
  }
  const data = new Date(`${valor}T00:00:00Z`);
  if (Number.isNaN(data.getTime()) || data.toISOString().slice(0, 10) !== valor) {
    throw new ErroLeituraAuditoria('campo-invalido', arquivo, `Data inválida: ${campo}`, campo);
  }
}

function validarBalancete(valor: unknown, arquivo: string): asserts valor is BalanceteOriginalAuditoria {
  const raiz = objeto(valor, arquivo, '$');
  validarCampos(raiz, ['arquivo'], arquivo, '$', texto);
  for (const grupo of ['receitas', 'despesas']) {
    const registros = lista(propriedade(raiz, grupo, arquivo, '$'), arquivo, `$.${grupo}`);
    registros.forEach((item, indice) => {
      const caminho = `$.${grupo}[${indice}]`;
      const registro = objeto(item, arquivo, caminho);
      validarCampos(registro, ['categoria', 'subcategoria', 'descricao'], arquivo, caminho, texto);
      validarCampos(registro, ['valor'], arquivo, caminho, numero);
    });
  }

  const totais = objeto(propriedade(raiz, 'totais', arquivo, '$'), arquivo, '$.totais');
  validarCampos(totais, ['total_receitas', 'total_despesas', 'saldo'], arquivo, '$.totais', numero);

  const resumo = objeto(propriedade(raiz, 'resumo_financeiro', arquivo, '$'), arquivo, '$.resumo_financeiro');
  const caminhoPeriodo = '$.resumo_financeiro.periodo';
  const periodo = objeto(propriedade(resumo, 'periodo', arquivo, '$.resumo_financeiro'), arquivo, caminhoPeriodo);
  validarCampos(periodo, ['inicio', 'fim'], arquivo, caminhoPeriodo, dataValida);
  if (typeof periodo['inicio'] === 'string' && typeof periodo['fim'] === 'string' && periodo['inicio'] > periodo['fim']) {
    throw new ErroLeituraAuditoria('campo-invalido', arquivo, `Período inválido: ${caminhoPeriodo}`, caminhoPeriodo);
  }

  const camposValores = ['saldo_anterior', 'creditos', 'debitos', 'saldo_final'];
  const contas = lista(propriedade(resumo, 'contas', arquivo, '$.resumo_financeiro'), arquivo, '$.resumo_financeiro.contas');
  contas.forEach((item, indice) => {
    const caminho = `$.resumo_financeiro.contas[${indice}]`;
    const conta = objeto(item, arquivo, caminho);
    validarCampos(conta, ['nome'], arquivo, caminho, texto);
    validarCampos(conta, camposValores, arquivo, caminho, numero);
  });
  const caminhoTotal = '$.resumo_financeiro.total';
  const total = objeto(propriedade(resumo, 'total', arquivo, '$.resumo_financeiro'), arquivo, caminhoTotal);
  validarCampos(total, camposValores, arquivo, caminhoTotal, numero);
}

function mesValido(mes: string): boolean {
  return /^\d{4}(0[1-9]|1[0-2])$/.test(mes);
}

@Injectable({ providedIn: 'root' })
export class AuditoriaLeituraService {
  private mesesCache?: Observable<readonly string[]>;
  private readonly balancetesCache = new Map<string, Observable<BalanceteAuditoria>>();

  constructor(private readonly http: HttpClient) {}

  getMeses(): Observable<readonly string[]> {
    return defer(() => {
      if (!this.mesesCache) {
        this.mesesCache = this.lerJson('index.json').pipe(
          map(dados => {
            const indice = objeto(dados, 'index.json', '$');
            const meses = lista(propriedade(indice, 'meses', 'index.json', '$'), 'index.json', '$.meses');
            if (!meses.every(mes => typeof mes === 'string' && mesValido(mes)) || new Set(meses).size !== meses.length) {
              throw new ErroLeituraAuditoria('campo-invalido', 'index.json', 'Índice de meses inválido.', '$.meses');
            }
            return meses as string[];
          }),
          catchError((erro: unknown) => {
            this.mesesCache = undefined;
            return throwError(() => erro);
          }),
          shareReplay({ bufferSize: 1, refCount: false })
        );
      }
      return this.mesesCache;
    });
  }

  getBalancete(mesReferencia: string): Observable<BalanceteAuditoria> {
    return defer(() => {
      if (!mesValido(mesReferencia)) {
        return throwError(() => new ErroLeituraAuditoria(
          'referencia-invalida', mesReferencia, 'A referência do arquivo deve estar no formato AAAAMM.'
        ));
      }
      let resultado = this.balancetesCache.get(mesReferencia);
      if (!resultado) {
        const arquivo = `${mesReferencia}.json`;
        resultado = this.lerJson(arquivo).pipe(
          map(dados => {
            validarBalancete(dados, arquivo);
            return {
              origem: {
                arquivoJson: arquivo,
                mesReferencia,
                periodoCompetencia: dados.resumo_financeiro.periodo
              },
              dados
            };
          }),
          catchError((erro: unknown) => {
            this.balancetesCache.delete(mesReferencia);
            return throwError(() => erro);
          }),
          shareReplay({ bufferSize: 1, refCount: false })
        );
        this.balancetesCache.set(mesReferencia, resultado);
      }
      return resultado;
    });
  }

  private lerJson(arquivo: string): Observable<unknown> {
    return this.http.get(`assets/data/${arquivo}`, { responseType: 'text' }).pipe(
      catchError((erro: unknown) => throwError(() => new ErroLeituraAuditoria(
        'leitura', arquivo, `Não foi possível carregar ${arquivo}.`, undefined, erro
      ))),
      map(conteudo => {
        try {
          return JSON.parse(conteudo) as unknown;
        } catch (erro: unknown) {
          if (!(erro instanceof SyntaxError)) {
            throw erro;
          }
          throw new ErroLeituraAuditoria('json-invalido', arquivo, `JSON inválido em ${arquivo}.`, undefined, erro);
        }
      })
    );
  }
}
