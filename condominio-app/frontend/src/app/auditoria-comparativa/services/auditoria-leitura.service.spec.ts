import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { BalanceteAuditoria } from '../models/auditoria-balancete.model';
import { AuditoriaLeituraService, ErroLeituraAuditoria } from './auditoria-leitura.service';

describe('AuditoriaLeituraService', () => {
  let service: AuditoriaLeituraService;
  let http: HttpTestingController;

  function balancete() {
    return {
      arquivo: '202310.xlsx',
      receitas: [
        { categoria: 'Taxa Condomínio', subcategoria: 'Descontos', descricao: '', valor: -5127.1 }
      ],
      despesas: [
        { categoria: 'Conservação', subcategoria: 'Material', descricao: '', valor: 0 }
      ],
      totais: { total_receitas: -5127.1, total_despesas: 0, saldo: -5127.1 },
      resumo_financeiro: {
        periodo: { inicio: '2023-08-01', fim: '2023-08-31' },
        contas: [
          { nome: 'Conta', saldo_anterior: 1, creditos: 2, debitos: 3, saldo_final: 0 }
        ],
        total: { saldo_anterior: 1, creditos: 2, debitos: 3, saldo_final: 0 }
      },
      campo_adicional: { valor: 'preservado' }
    };
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(AuditoriaLeituraService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('carrega e preserva o índice de meses', () => {
    let meses: readonly string[] | undefined;
    service.getMeses().subscribe(valor => meses = valor);
    http.expectOne('assets/data/index.json').flush(JSON.stringify({ meses: ['202309', '202310'] }));
    expect(meses).toEqual(['202309', '202310']);
  });

  it('preserva os dados originais e identifica arquivo e período interno separadamente', () => {
    const original = balancete();
    let resultado: BalanceteAuditoria | undefined;
    service.getBalancete('202310').subscribe(valor => resultado = valor);
    http.expectOne('assets/data/202310.json').flush(JSON.stringify(original));

    expect(resultado?.dados).toEqual(original);
    expect(resultado?.origem).toEqual({
      arquivoJson: '202310.json',
      mesReferencia: '202310',
      periodoCompetencia: { inicio: '2023-08-01', fim: '2023-08-31' }
    });
    expect(resultado?.dados.receitas[0].valor).toBe(-5127.1);
    expect(resultado?.dados.despesas[0].valor).toBe(0);
    expect(resultado?.dados.arquivo).toBe('202310.xlsx');
  });

  it('compartilha requisições simultâneas e reutiliza o cache em memória', () => {
    const resultados: BalanceteAuditoria[] = [];
    service.getBalancete('202310').subscribe(valor => resultados.push(valor));
    service.getBalancete('202310').subscribe(valor => resultados.push(valor));
    http.expectOne('assets/data/202310.json').flush(JSON.stringify(balancete()));
    service.getBalancete('202310').subscribe(valor => resultados.push(valor));
    http.expectNone('assets/data/202310.json');
    expect(resultados.length).toBe(3);
    expect(resultados[0]).toBe(resultados[2]);
  });

  it('reutiliza o índice em memória', () => {
    let meses: readonly string[] | undefined;
    service.getMeses().subscribe();
    http.expectOne('assets/data/index.json').flush('{"meses":["202310"]}');
    service.getMeses().subscribe(valor => meses = valor);
    http.expectNone('assets/data/index.json');
    expect(meses).toEqual(['202310']);
  });

  it('informa JSON inválido sem armazenar a falha no cache', () => {
    let erro: ErroLeituraAuditoria | undefined;
    service.getBalancete('202310').subscribe({ error: valor => erro = valor });
    http.expectOne('assets/data/202310.json').flush('{invalido');
    expect(erro?.tipo).toBe('json-invalido');
    expect(erro?.arquivo).toBe('202310.json');

    let resultado: BalanceteAuditoria | undefined;
    service.getBalancete('202310').subscribe(valor => resultado = valor);
    http.expectOne('assets/data/202310.json').flush(JSON.stringify(balancete()));
    expect(resultado?.origem.mesReferencia).toBe('202310');
  });

  it('informa arquivo indisponível e permite nova tentativa', () => {
    let erro: ErroLeituraAuditoria | undefined;
    service.getBalancete('202310').subscribe({ error: valor => erro = valor });
    http.expectOne('assets/data/202310.json').flush('Não encontrado', { status: 404, statusText: 'Not Found' });
    expect(erro?.tipo).toBe('leitura');
    expect(erro?.arquivo).toBe('202310.json');
    expect(erro?.cause).toBeDefined();

    service.getBalancete('202310').subscribe();
    http.expectOne('assets/data/202310.json').flush(JSON.stringify(balancete()));
  });

  it('informa o caminho de campo ausente sem substituí-lo por zero', () => {
    const original = balancete();
    const { valor: _valor, ...despesaSemValor } = original.despesas[0];
    let erro: ErroLeituraAuditoria | undefined;
    service.getBalancete('202310').subscribe({ error: valor => erro = valor });
    http.expectOne('assets/data/202310.json').flush(JSON.stringify({
      ...original, despesas: [despesaSemValor]
    }));
    expect(erro?.tipo).toBe('campo-ausente');
    expect(erro?.campo).toBe('$.despesas[0].valor');
    expect(erro?.arquivo).toBe('202310.json');
  });

  it('rejeita tipos inválidos e datas de competência inexistentes', () => {
    const original = balancete();
    let erro: ErroLeituraAuditoria | undefined;
    service.getBalancete('202310').subscribe({ error: valor => erro = valor });
    http.expectOne('assets/data/202310.json').flush(JSON.stringify({
      ...original,
      resumo_financeiro: { ...original.resumo_financeiro, periodo: { inicio: '2023-02-30', fim: '2023-08-31' } }
    }));
    expect(erro?.tipo).toBe('campo-invalido');
    expect(erro?.campo).toBe('$.resumo_financeiro.periodo.inicio');

    service.getBalancete('202310').subscribe({ error: valor => erro = valor });
    http.expectOne('assets/data/202310.json').flush(JSON.stringify({
      ...original, totais: { ...original.totais, saldo: '0' }
    }));
    expect(erro?.tipo).toBe('campo-invalido');
    expect(erro?.campo).toBe('$.totais.saldo');
  });

  it('rejeita referência inválida sem fazer requisição', () => {
    let erro: ErroLeituraAuditoria | undefined;
    service.getBalancete('../index').subscribe({ error: valor => erro = valor });
    expect(erro?.tipo).toBe('referencia-invalida');
    http.expectNone(() => true);
  });

  it('valida o índice e permite nova tentativa após falha', () => {
    let erro: ErroLeituraAuditoria | undefined;
    service.getMeses().subscribe({ error: valor => erro = valor });
    http.expectOne('assets/data/index.json').flush('{"meses":["202313"]}');
    expect(erro?.tipo).toBe('campo-invalido');
    expect(erro?.campo).toBe('$.meses');

    let meses: readonly string[] | undefined;
    service.getMeses().subscribe(valor => meses = valor);
    http.expectOne('assets/data/index.json').flush('{"meses":["202310"]}');
    expect(meses).toEqual(['202310']);
  });

  it('informa falha ao carregar o índice', () => {
    let erro: ErroLeituraAuditoria | undefined;
    service.getMeses().subscribe({ error: valor => erro = valor });
    http.expectOne('assets/data/index.json').flush('Não encontrado', { status: 404, statusText: 'Not Found' });
    expect(erro?.tipo).toBe('leitura');
    expect(erro?.arquivo).toBe('index.json');
  });

  it('informa resumo financeiro ausente sem inventar competência', () => {
    const { resumo_financeiro: _resumo, ...original } = balancete();
    let erro: ErroLeituraAuditoria | undefined;
    service.getBalancete('202310').subscribe({ error: valor => erro = valor });
    http.expectOne('assets/data/202310.json').flush(JSON.stringify(original));
    expect(erro?.tipo).toBe('campo-ausente');
    expect(erro?.campo).toBe('$.resumo_financeiro');
  });
});
