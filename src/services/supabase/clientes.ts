import { supabase } from '../../config/supabase';

export interface Cliente {
  id: string;
  empresa_id: string;
  pais_id: string;
  tipo_documento_id?: string;
  numero_documento: string;
  razon_social: string;
  nombre_comercial?: string;
  email?: string;
  telefono?: string;
  direccion?: string;
  ciudad?: string;
  departamento?: string;
  codigo_postal?: string;
  tipo_cliente?: string;
  condicion_iva?: string;
  limite_credito?: number;
  dias_credito?: number;
  descuento_predeterminado?: number;
  observaciones?: string;
  activo: boolean;
  fecha_creacion?: string;
  fecha_modificacion?: string;
  creado_por?: string;
}

export async function obtenerClientes(empresaId: string): Promise<Cliente[]> {
  const { data, error } = await supabase
    .from('clientes')
    .select('*')
    .eq('empresa_id', empresaId)
    .order('fecha_creacion', { ascending: false });

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

export async function crearCliente(cliente: Omit<Cliente, 'id' | 'fecha_creacion' | 'fecha_modificacion'>): Promise<Cliente> {
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
    .or(`nombre_completo.ilike.%${termino}%,razon_social.ilike.%${termino}%,numero_documento.ilike.%${termino}%`)
    .order('fecha_creacion', { ascending: false })
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
    .order('razon_social', { ascending: true });

  if (error) throw error;
  return data || [];
}
