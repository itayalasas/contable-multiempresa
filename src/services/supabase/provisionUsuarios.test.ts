import { describe, expect, it } from 'vitest';
import { buildProvisionUsuarioPayload } from './provisionUsuarios';

describe('provisionUsuarios', () => {
  it('normaliza email y completa valores por defecto', () => {
    const payload = buildProvisionUsuarioPayload({
      nombre: ' Ana Perez ',
      email: ' ANA@MAIL.COM ',
      rol: 'contador',
      empresasAsignadas: ['empresa-1'],
      permisos: ['reportes:ver'],
      solicitadoPorId: 'admin-1',
    });

    expect(payload.nombre).toBe('Ana Perez');
    expect(payload.email).toBe('ana@mail.com');
    expect(payload.modo).toBe('invite');
    expect(payload.paisId).toBeNull();
    expect(payload.metadata).toEqual({});
  });
});
