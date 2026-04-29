import { supabase } from '../../config/supabase';
import type { Usuario } from '../../types';

export interface ProvisionarUsuarioInput {
  nombre: string;
  email: string;
  rol: Usuario['rol'];
  empresasAsignadas: string[];
  permisos: string[];
  paisId?: string;
  configuracion?: Usuario['configuracion'];
  metadata?: Record<string, any>;
  solicitadoPorId?: string;
  modo?: 'create' | 'invite';
}

export interface ProvisionarUsuarioResult {
  success: boolean;
  message: string;
  authUserId: string;
  usuarioId: string;
  invitacionEnviada: boolean;
  publicUser: Record<string, any>;
}

export const buildProvisionUsuarioPayload = (input: ProvisionarUsuarioInput) => ({
  nombre: input.nombre.trim(),
  email: input.email.trim().toLowerCase(),
  rol: input.rol,
  empresasAsignadas: input.empresasAsignadas,
  permisos: input.permisos,
  paisId: input.paisId || null,
  configuracion: input.configuracion,
  metadata: input.metadata || {},
  solicitadoPorId: input.solicitadoPorId,
  modo: input.modo || 'invite',
});

export async function provisionarUsuarioSistema(
  input: ProvisionarUsuarioInput,
): Promise<ProvisionarUsuarioResult> {
  const { data, error } = await supabase.functions.invoke('provision-user', {
    body: buildProvisionUsuarioPayload(input),
  });

  if (error) {
    throw new Error(await getFunctionsErrorMessage(error));
  }

  if (!data?.success) {
    throw new Error(data?.error || 'No se pudo provisionar el usuario');
  }

  return data as ProvisionarUsuarioResult;
}

const getFunctionsErrorMessage = async (error: any): Promise<string> => {
  const fallback = error?.message || 'Error al invocar la provisión de usuarios';

  const extractJsonError = (value: any): string | null => {
    if (!value) return null;
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return parsed?.error || parsed?.message || null;
      } catch {
        return null;
      }
    }

    return value?.error || value?.message || null;
  };

  const fromContextBody = extractJsonError(error?.context?.body);
  if (fromContextBody) return fromContextBody;

  const context = error?.context;
  if (context && typeof context === 'object' && typeof context.text === 'function') {
    try {
      const text = await context.clone().text();
      const fromResponse = extractJsonError(text);
      if (fromResponse) return fromResponse;
    } catch {
      return fallback;
    }
  }

  return fallback;
};
