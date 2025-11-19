import { supabase } from '../../config/supabase';

export interface Cliente {
  id: string;
  empresa_id: string;
  tipo_persona: 'fisica' | 'juridica';
  nombre_completo?: string;
  razon_social?: string;
  nombre_comercial?: string;
  documento_tipo: string;
  documento_numero: string;
  email?: string;
  telefono?: string;
  direccion?: string;
  ciudad?: string;
  departamento?: string;
  codigo_postal?: string;
  pais_codigo: string;
  condicion_pago: string;
  dias_credito: number;
  limite_credito?: number;
  descuento_default?: number;
  lista_precio_id?: string;
  cuenta_contable_id?: string;
  notas?: string;
  activo: boolean;
  external_id?: string;
  metadata?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export async function obtenerClientes(empresaId: string): Promise<Cliente[]> {
  const { data, error } = await supabase
    .from('clientes')
    .select('*')
    .eq('empresa_id', empresaId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function obtenerClientePorId(id: string): Promise<Cliente | null> {
  const { data, error } = await supabase
    .from('clientes')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function crearCliente(cliente: Omit<Cliente, 'id' | 'created_at' | 'updated_at'>): Promise<Cliente> {
  const { data, error } = await supabase
    .from('clientes')
    .insert([cliente])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function actualizarCliente(id: string, cambios: Partial<Cliente>): Promise<Cliente> {
  const { data, error } = await supabase
    .from('clientes')
    .update(cambios)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
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
    .or(`nombre_completo.ilike.%${termino}%,razon_social.ilike.%${termino}%,documento_numero.ilike.%${termino}%`)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) throw error;
  return data || [];
}

export async function obtenerClientesActivos(empresaId: string): Promise<Cliente[]> {
  const { data, error } = await supabase
    .from('clientes')
    .select('*')
    .eq('empresa_id', empresaId)
    .eq('activo', true)
    .order('nombre_completo', { ascending: true });

  if (error) throw error;
  return data || [];
}
