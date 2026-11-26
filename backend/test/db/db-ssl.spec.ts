import { dbSsl } from 'src/db/db-ssl';

describe('dbSsl', () => {
  it('con CA verifica el certificado contra ella', () => {
    expect(dbSsl('PEM')).toEqual({ ca: 'PEM', rejectUnauthorized: true });
  });

  it('sin CA no define ssl, para que siga mandando PGSSLMODE', () => {
    expect(dbSsl(undefined)).toBeUndefined();
    expect(dbSsl('')).toBeUndefined();
  });
});
