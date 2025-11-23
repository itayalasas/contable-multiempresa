import { supabase } from '../../config/supabase';

export interface Proveedor {
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
  tipo_proveedor: string;
  condicion_pago: string;
  dias_credito: number;
  cuenta_contable_id?: string;
  cuenta_bancaria?: string;
  banco?: string;
  notas?: string;
  activo: boolean;
  metadata?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export async function obtenerProveedores(empresaId: string): Promise<Proveedor[]> {
  const { data, error } = await supabase
    .from('proveedores')
    .select('*')
    .eq('empresa_id', empresaId)
    .order('fecha_creacion', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function obtenerProveedorPorId(id: string): Promise<Proveedor | null> {
  const { data, error } = await supabase
    .from('proveedores')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function crearProveedor(proveedor: Omit<Proveedor, 'id' | 'created_at' | 'updated_at'>): Promise<Proveedor> {
  const { data, error } = await supabase
    .from('proveedores')
    .insert([proveedor])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function actualizarProveedor(id: string, cambios: Partial<Proveedor>): Promise<Proveedor> {
  const { data, error } = await supabase
    .from('proveedores')
    .update(cambios)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function eliminarProveedor(id: string): Promise<void> {
  const { error } = await supabase
    .from('proveedores')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function buscarProveedores(empresaId: string, termino: string): Promise<Proveedor[]> {
  const { data, error } = await supabase
    .from('proveedores')
    .select('*')
    .eq('empresa_id', empresaId)
    .or(`nombre_completo.ilike.%${termino}%,razon_social.ilike.%${termino}%,documento_numero.ilike.%${termino}%`)
    .order('fecha_creacion', { ascending: false})
    .limit(10);

  if (error) throw error;
  return data || [];
}

export async function obtenerProveedoresActivos(empresaId: string): Promise<Proveedor[]> {
  const { data, error } = await supabase
    .from('proveedores')
    .select('*')
    .eq('empresa_id', empresaId)
    .eq('activo', true)
    .order('razon_social', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function obtenerProveedoresPorTipo(empresaId: string, tipoProveedor: string): Promise<Proveedor[]> {
  const { data, error } = await supabase
    .from('proveedores')
    .select('*')
    .eq('empresa_id', empresaId)
    .eq('tipo_proveedor', tipoProveedor)
    .eq('activo', true)
    .order('razon_social', { ascending: true });

  if (error) throw error;
  return data || [];
}
