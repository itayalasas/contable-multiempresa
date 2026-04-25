import { supabase } from '../../config/supabase';

export interface Cliente {
  id: string;
  empresa_id: string;
  pais_id?: string;
  nombre?: string;
  razon_social?: string;
  nombre_comercial?: string;
  tipo_documento: string;
  tipo_documento_id?: string;
  numero_documento: string;
  email?: string;
  telefono?: string;
  direccion?: string;
  contacto?: string;
  activo: boolean;
  fecha_creacion?: string;
  limite_credito?: number;
  dias_credito?: number;
  condicion_pago?: string;
  descuento_default?: number;
  observaciones?: string;
  metadata?: {
    tipo_persona?: 'fisica' | 'juridica';
    nombre_completo?: string;
    nombre_comercial?: string;
    external_id?: string;
    pais_codigo?: string;
    ciudad?: string;
    departamento?: string;
    codigo_postal?: string;
    condicion_pago?: string;
    descuento_default?: number;
  };
}

type ClienteWritePayload = Omit<Cliente, 'id' | 'fecha_creacion' | 'fecha_modificacion'>;

type ClienteDbPayload = Partial<Cliente>;

function normalizeClienteFromDb(cliente: Cliente): Cliente {
  return {
    ...cliente,
    nombre: cliente.nombre ?? cliente.metadata?.nombre_completo ?? cliente.razon_social ?? undefined,
    contacto: cliente.contacto ?? cliente.nombre_comercial ?? undefined,
  };
}

function toClienteDbPayload(cliente: Partial<Cliente>): Partial<Cliente> {
  const {
    contacto,
    nombre,
    nombre_comercial,
    razon_social,
    tipo_documento,
    tipo_documento_id,
    ...rest
  } = cliente;

  const payload: Partial<Cliente> = {
    ...rest,
    razon_social: razon_social ?? nombre ?? null,
    nombre_comercial: nombre_comercial ?? contacto ?? null,
  };

  // Preferir esquema moderno (tipo_documento_id) para evitar reintentos por columna inexistente.
  if (tipo_documento_id) {
    payload.tipo_documento_id = tipo_documento_id;
  } else if (tipo_documento) {
    payload.tipo_documento = tipo_documento;
  }

  return payload;
}

function extractMissingColumnFromPostgrestError(error: any): string | null {
  if (!error || error.code !== 'PGRST204' || typeof error.message !== 'string') {
    return null;
  }

  const match = error.message.match(/'([^']+)' column/);
  return match?.[1] || null;
}

async function insertClienteWithSchemaFallback(payload: ClienteDbPayload) {
  let currentPayload: ClienteDbPayload = { ...payload };

  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, error } = await supabase
      .from('clientes')
      .insert([currentPayload])
      .select()
      .single();

    if (!error) {
      return data;
    }

    const missingColumn = extractMissingColumnFromPostgrestError(error);
    if (!missingColumn || !(missingColumn in currentPayload)) {
      throw error;
    }

    delete currentPayload[missingColumn as keyof ClienteDbPayload];
  }

  throw new Error('No se pudo guardar el cliente por incompatibilidad de esquema.');
}

async function updateClienteWithSchemaFallback(id: string, payload: ClienteDbPayload) {
  let currentPayload: ClienteDbPayload = { ...payload };

  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, error } = await supabase
      .from('clientes')
      .update(currentPayload)
      .eq('id', id)
      .select()
      .single();

    if (!error) {
      return data;
    }

    const missingColumn = extractMissingColumnFromPostgrestError(error);
    if (!missingColumn || !(missingColumn in currentPayload)) {
      throw error;
    }

    delete currentPayload[missingColumn as keyof ClienteDbPayload];
  }

  throw new Error('No se pudo actualizar el cliente por incompatibilidad de esquema.');
}

export async function obtenerClientes(empresaId: string): Promise<Cliente[]> {
  const { data, error } = await supabase
    .from('clientes')
    .select('*')
    .eq('empresa_id', empresaId)
    .order('fecha_creacion', { ascending: false });

  if (error) throw error;
  return (data || []).map(normalizeClienteFromDb);
}

export async function obtenerClientePorId(id: string): Promise<Cliente | null> {
  const { data, error } = await supabase
    .from('clientes')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data ? normalizeClienteFromDb(data) : null;
}

export async function crearCliente(cliente: ClienteWritePayload): Promise<Cliente> {
  const payload = toClienteDbPayload(cliente);
  const data = await insertClienteWithSchemaFallback(payload);
  return normalizeClienteFromDb(data);
}

export async function actualizarCliente(id: string, cambios: Partial<Cliente>): Promise<Cliente> {
  const payload = toClienteDbPayload(cambios);
  const data = await updateClienteWithSchemaFallback(id, payload);
  return normalizeClienteFromDb(data);
}

export async function eliminarCliente(id: string): Promise<void> {
  const { error } = await supabase
    .from('clientes')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function buscarClientes(empresaId: string, termino: string): Promise<Cliente[]> {
  const { data, error } = await supabase
    .from('clientes')
    .select('*')
    .eq('empresa_id', empresaId)
    .or(`razon_social.ilike.%${termino}%,numero_documento.ilike.%${termino}%`)
    .order('fecha_creacion', { ascending: false })
    .limit(10);

  if (error) throw error;
  return (data || []).map(normalizeClienteFromDb);
}

export async function obtenerClientesActivos(empresaId: string): Promise<Cliente[]> {
  const { data, error } = await supabase
    .from('clientes')
    .select('*')
    .eq('empresa_id', empresaId)
    .eq('activo', true)
    .order('razon_social', { ascending: true });

  if (error) throw error;
  return (data || []).map(normalizeClienteFromDb);
}
