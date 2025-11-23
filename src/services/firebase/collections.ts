import {
  collection,
  doc,
  query,
  where,
  orderBy,
  limit,
  CollectionReference,
  DocumentReference
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Usuario, Empresa, CuentaContable, AsientoContable } from '../../types';

// Tipos para las colecciones
type UsuarioDoc = Usuario;
type EmpresaDoc = Empresa;
type CuentaContableDoc = CuentaContable;
type AsientoContableDoc = AsientoContable;

// Referencias a colecciones principales (lazy loaded para evitar errores cuando db es null)
export const usuariosRef = (db ? collection(db, 'usuarios') : null) as CollectionReference<UsuarioDoc>;
const empresasRef = (db ? collection(db, 'empresas') : null) as CollectionReference<EmpresaDoc>;

// Funciones para obtener referencias de documentos
export const getUsuarioRef = (userId: string): DocumentReference<UsuarioDoc> => 
  doc(usuariosRef, userId);

const getEmpresaRef = (empresaId: string): DocumentReference<EmpresaDoc> => 
  doc(empresasRef, empresaId);

// Referencias a subcolecciones por empresa
const getCuentasRef = (empresaId: string): CollectionReference<CuentaContableDoc> =>
  (db ? collection(db, `empresas/${empresaId}/cuentas`) : null) as CollectionReference<CuentaContableDoc>;

const getAsientosRef = (empresaId: string): CollectionReference<AsientoContableDoc> =>
  (db ? collection(db, `empresas/${empresaId}/asientos`) : null) as CollectionReference<AsientoContableDoc>;

// Queries comunes
const getEmpresasByUsuario = (userId: string) =>
  query(empresasRef, where('usuarios', 'array-contains', userId));

const getCuentasActivas = (empresaId: string) =>
  query(getCuentasRef(empresaId), where('activa', '==', true), orderBy('codigo'));

const getAsientosRecientes = (empresaId: string, limitCount = 10) =>
  query(
    getAsientosRef(empresaId), 
    where('estado', '!=', 'ANULADO'),
    orderBy('fechaCreacion', 'desc'), 
    limit(limitCount)
  );

// Estructura de datos para multi-tenant
interface TenantData {
  tenantId: string;
  empresaId: string;
  subdominio: string;
  configuracion: {
    tema: string;
    moneda: string;
    idioma: string;
    timezone: string;
  };
}

const getTenantsRef = (): CollectionReference<TenantData> =>
  (db ? collection(db, 'tenants') : null) as CollectionReference<TenantData>;

const getTenantBySubdominio = (subdominio: string) =>
  query(getTenantsRef(), where('subdominio', '==', subdominio), limit(1));