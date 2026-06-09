import { describe, expect, it } from 'vitest';
import {
  brDateToIso,
  formatBRL,
  formatClienteAutocompleteMeta,
  isValidBRDate,
  isoToBrDate,
  maskBRLInput,
  maskCEP,
  maskDateBR,
  maskPhone,
  md5,
  parseBRL,
  unmask,
} from './format';

describe('formatBRL', () => {
  it('formata número em reais', () => {
    expect(formatBRL(1234.5)).toMatch(/1\.234,50/);
  });

  it('aceita string numérica', () => {
    expect(formatBRL('10')).toMatch(/10,00/);
  });

  it('trata valores inválidos como zero', () => {
    expect(formatBRL(null)).toMatch(/0,00/);
    expect(formatBRL('abc')).toMatch(/0,00/);
  });
});

describe('parseBRL', () => {
  it('converte moeda pt-BR', () => {
    expect(parseBRL('R$ 1.234,56')).toBe(1234.56);
    expect(parseBRL('12,34')).toBe(12.34);
  });

  it('retorna zero para string vazia', () => {
    expect(parseBRL('')).toBe(0);
  });
});

describe('maskBRLInput', () => {
  it('aplica centavos enquanto digita', () => {
    expect(maskBRLInput('1234')).toBe('12,34');
    expect(maskBRLInput('1')).toBe('0,01');
  });

  it('retorna vazio sem dígitos', () => {
    expect(maskBRLInput('abc')).toBe('');
  });
});

describe('maskPhone', () => {
  it('formata telefone fixo', () => {
    expect(maskPhone('1133334444')).toBe('(11) 3333-4444');
  });

  it('formata celular', () => {
    expect(maskPhone('11999887766')).toBe('(11) 99988-7766');
  });
});

describe('maskCEP e unmask', () => {
  it('aplica máscara de CEP', () => {
    expect(maskCEP('01310100')).toBe('01310-100');
  });

  it('remove não-dígitos', () => {
    expect(unmask('(11) 99999-8888')).toBe('11999998888');
  });
});

describe('formatClienteAutocompleteMeta', () => {
  it('monta telefone e bairro', () => {
    expect(
      formatClienteAutocompleteMeta({
        celular: '11999998888',
        telefone: '',
        bairro: 'Centro',
      }),
    ).toBe('(11) 99999-8888 · Centro');
  });

  it('retorna undefined sem dados', () => {
    expect(
      formatClienteAutocompleteMeta({ celular: '', telefone: '', bairro: '' }),
    ).toBeUndefined();
  });
});

describe('datas BR', () => {
  it('valida data brasileira', () => {
    expect(isValidBRDate('31/12/2024')).toBe(true);
    expect(isValidBRDate('31/02/2024')).toBe(false);
    expect(isValidBRDate('2024-12-31')).toBe(false);
  });

  it('aplica máscara dd/mm/aaaa', () => {
    expect(maskDateBR('09062026')).toBe('09/06/2026');
    expect(maskDateBR('09')).toBe('09');
  });

  it('converte entre BR e ISO', () => {
    expect(brDateToIso('09/06/2026')).toBe('2026-06-09');
    expect(isoToBrDate('2026-06-09')).toBe('09/06/2026');
    expect(brDateToIso('invalid')).toBe('');
    expect(isoToBrDate('bad')).toBe('');
  });
});

describe('md5', () => {
  it('é compatível com hashes legados', async () => {
    await expect(md5('')).resolves.toBe('d41d8cd98f00b204e9800998ecf8427e');
    await expect(md5('admin')).resolves.toBe('21232f297a57a5a743894a0e4a801fc3');
  });
});
