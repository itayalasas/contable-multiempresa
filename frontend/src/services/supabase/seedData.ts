import { supabase } from '../../config/supabase';
import { PlanCuenta } from '../../types';

// Plan de cuentas base según PCGE (Plan Contable General Empresarial - Perú)
const planCuentasBase: Omit<PlanCuenta, 'id' | 'empresaId' | 'fechaCreacion' | 'fechaModificacion'>[] = [
  // CLASE 1: ACTIVO
  { codigo: '10', nombre: 'EFECTIVO Y EQUIVALENTES DE EFECTIVO', tipo: 'ACTIVO', nivel: 1, paisId: 'peru', activa: true, saldo: 0 },
  { codigo: '101', nombre: 'Caja', tipo: 'ACTIVO', nivel: 2, cuentaPadre: '10', paisId: 'peru', activa: true, saldo: 0 },
  { codigo: '1011', nombre: 'Caja MN', tipo: 'ACTIVO', nivel: 3, cuentaPadre: '101', paisId: 'peru', activa: true, saldo: 0 },
  { codigo: '1012', nombre: 'Caja ME', tipo: 'ACTIVO', nivel: 3, cuentaPadre: '101', paisId: 'peru', activa: true, saldo: 0 },
  { codigo: '104', nombre: 'Cuentas corrientes en instituciones financieras', tipo: 'ACTIVO', nivel: 2, cuentaPadre: '10', paisId: 'peru', activa: true, saldo: 0 },
  { codigo: '1041', nombre: 'Cuentas corrientes operativas', tipo: 'ACTIVO', nivel: 3, cuentaPadre: '104', paisId: 'peru', activa: true, saldo: 0 },

  { codigo: '12', nombre: 'CUENTAS POR COBRAR COMERCIALES - TERCEROS', tipo: 'ACTIVO', nivel: 1, paisId: 'peru', activa: true, saldo: 0 },
  { codigo: '121', nombre: 'Facturas, boletas y otros comprobantes por cobrar', tipo: 'ACTIVO', nivel: 2, cuentaPadre: '12', paisId: 'peru', activa: true, saldo: 0 },
  { codigo: '1211', nombre: 'No emitidas', tipo: 'ACTIVO', nivel: 3, cuentaPadre: '121', paisId: 'peru', activa: true, saldo: 0 },
  { codigo: '1212', nombre: 'Emitidas en cartera', tipo: 'ACTIVO', nivel: 3, cuentaPadre: '121', paisId: 'peru', activa: true, saldo: 0 },

  { codigo: '20', nombre: 'MERCADERÍAS', tipo: 'ACTIVO', nivel: 1, paisId: 'peru', activa: true, saldo: 0 },
  { codigo: '201', nombre: 'Mercaderías manufacturadas', tipo: 'ACTIVO', nivel: 2, cuentaPadre: '20', paisId: 'peru', activa: true, saldo: 0 },

  { codigo: '33', nombre: 'INMUEBLES, MAQUINARIA Y EQUIPO', tipo: 'ACTIVO', nivel: 1, paisId: 'peru', activa: true, saldo: 0 },
  { codigo: '331', nombre: 'Terrenos', tipo: 'ACTIVO', nivel: 2, cuentaPadre: '33', paisId: 'peru', activa: true, saldo: 0 },
  { codigo: '333', nombre: 'Maquinarias y equipos de explotación', tipo: 'ACTIVO', nivel: 2, cuentaPadre: '33', paisId: 'peru', activa: true, saldo: 0 },
  { codigo: '334', nombre: 'Unidades de transporte', tipo: 'ACTIVO', nivel: 2, cuentaPadre: '33', paisId: 'peru', activa: true, saldo: 0 },

  // CLASE 4: PASIVO
  { codigo: '40', nombre: 'TRIBUTOS, CONTRAPRESTACIONES Y APORTES AL SISTEMA DE PENSIONES Y DE SALUD POR PAGAR', tipo: 'PASIVO', nivel: 1, paisId: 'peru', activa: true, saldo: 0 },
  { codigo: '401', nombre: 'Gobierno central', tipo: 'PASIVO', nivel: 2, cuentaPadre: '40', paisId: 'peru', activa: true, saldo: 0 },
  { codigo: '4011', nombre: 'Impuesto general a las ventas', tipo: 'PASIVO', nivel: 3, cuentaPadre: '401', paisId: 'peru', activa: true, saldo: 0 },
  { codigo: '40111', nombre: 'IGV - Cuenta propia', tipo: 'PASIVO', nivel: 4, cuentaPadre: '4011', paisId: 'peru', activa: true, saldo: 0 },

  { codigo: '42', nombre: 'CUENTAS POR PAGAR COMERCIALES - TERCEROS', tipo: 'PASIVO', nivel: 1, paisId: 'peru', activa: true, saldo: 0 },
  { codigo: '421', nombre: 'Facturas, boletas y otros comprobantes por pagar', tipo: 'PASIVO', nivel: 2, cuentaPadre: '42', paisId: 'peru', activa: true, saldo: 0 },
  { codigo: '4212', nombre: 'Emitidas', tipo: 'PASIVO', nivel: 3, cuentaPadre: '421', paisId: 'peru', activa: true, saldo: 0 },

  { codigo: '46', nombre: 'CUENTAS POR PAGAR DIVERSAS - TERCEROS', tipo: 'PASIVO', nivel: 1, paisId: 'peru', activa: true, saldo: 0 },
  { codigo: '465', nombre: 'Pasivos por compra de activo inmovilizado', tipo: 'PASIVO', nivel: 2, cuentaPadre: '46', paisId: 'peru', activa: true, saldo: 0 },

  // CLASE 5: PATRIMONIO
  { codigo: '50', nombre: 'CAPITAL', tipo: 'PATRIMONIO', nivel: 1, paisId: 'peru', activa: true, saldo: 0 },
  { codigo: '501', nombre: 'Capital social', tipo: 'PATRIMONIO', nivel: 2, cuentaPadre: '50', paisId: 'peru', activa: true, saldo: 0 },
  { codigo: '5011', nombre: 'Acciones', tipo: 'PATRIMONIO', nivel: 3, cuentaPadre: '501', paisId: 'peru', activa: true, saldo: 0 },

  { codigo: '59', nombre: 'RESULTADOS ACUMULADOS', tipo: 'PATRIMONIO', nivel: 1, paisId: 'peru', activa: true, saldo: 0 },
  { codigo: '591', nombre: 'Utilidades no distribuidas', tipo: 'PATRIMONIO', nivel: 2, cuentaPadre: '59', paisId: 'peru', activa: true, saldo: 0 },
  { codigo: '592', nombre: 'Pérdidas acumuladas', tipo: 'PATRIMONIO', nivel: 2, cuentaPadre: '59', paisId: 'peru', activa: true, saldo: 0 },

  // CLASE 7: INGRESOS
  { codigo: '70', nombre: 'VENTAS', tipo: 'INGRESO', nivel: 1, paisId: 'peru', activa: true, saldo: 0 },
  { codigo: '701', nombre: 'Mercaderías', tipo: 'INGRESO', nivel: 2, cuentaPadre: '70', paisId: 'peru', activa: true, saldo: 0 },
  { codigo: '7011', nombre: 'Mercaderías manufacturadas', tipo: 'INGRESO', nivel: 3, cuentaPadre: '701', paisId: 'peru', activa: true, saldo: 0 },

  { codigo: '75', nombre: 'OTROS INGRESOS DE GESTIÓN', tipo: 'INGRESO', nivel: 1, paisId: 'peru', activa: true, saldo: 0 },
  { codigo: '751', nombre: 'Servicios en beneficio del personal', tipo: 'INGRESO', nivel: 2, cuentaPadre: '75', paisId: 'peru', activa: true, saldo: 0 },
  { codigo: '759', nombre: 'Otros ingresos de gestión', tipo: 'INGRESO', nivel: 2, cuentaPadre: '75', paisId: 'peru', activa: true, saldo: 0 },

  // CLASE 6: GASTOS
  { codigo: '60', nombre: 'COMPRAS', tipo: 'GASTO', nivel: 1, paisId: 'peru', activa: true, saldo: 0 },
  { codigo: '601', nombre: 'Mercaderías', tipo: 'GASTO', nivel: 2, cuentaPadre: '60', paisId: 'peru', activa: true, saldo: 0 },
  { codigo: '6011', nombre: 'Mercaderías manufacturadas', tipo: 'GASTO', nivel: 3, cuentaPadre: '601', paisId: 'peru', activa: true, saldo: 0 },

  { codigo: '63', nombre: 'GASTOS DE SERVICIOS PRESTADOS POR TERCEROS', tipo: 'GASTO', nivel: 1, paisId: 'peru', activa: true, saldo: 0 },
  { codigo: '631', nombre: 'Transporte, correos y gastos de viaje', tipo: 'GASTO', nivel: 2, cuentaPadre: '63', paisId: 'peru', activa: true, saldo: 0 },
  { codigo: '634', nombre: 'Mantenimiento y reparaciones', tipo: 'GASTO', nivel: 2, cuentaPadre: '63', paisId: 'peru', activa: true, saldo: 0 },
  { codigo: '636', nombre: 'Servicios básicos', tipo: 'GASTO', nivel: 2, cuentaPadre: '63', paisId: 'peru', activa: true, saldo: 0 },
  { codigo: '6361', nombre: 'Energía eléctrica', tipo: 'GASTO', nivel: 3, cuentaPadre: '636', paisId: 'peru', activa: true, saldo: 0 },
  { codigo: '6362', nombre: 'Gas', tipo: 'GASTO', nivel: 3, cuentaPadre: '636', paisId: 'peru', activa: true, saldo: 0 },
  { codigo: '6363', nombre: 'Agua', tipo: 'GASTO', nivel: 3, cuentaPadre: '636', paisId: 'peru', activa: true, saldo: 0 },
  { codigo: '6364', nombre: 'Teléfono', tipo: 'GASTO', nivel: 3, cuentaPadre: '636', paisId: 'peru', activa: true, saldo: 0 },
  { codigo: '6365', nombre: 'Internet', tipo: 'GASTO', nivel: 3, cuentaPadre: '636', paisId: 'peru', activa: true, saldo: 0 },

  { codigo: '65', nombre: 'OTROS GASTOS DE GESTIÓN', tipo: 'GASTO', nivel: 1, paisId: 'peru', activa: true, saldo: 0 },
  { codigo: '651', nombre: 'Seguros', tipo: 'GASTO', nivel: 2, cuentaPadre: '65', paisId: 'peru', activa: true, saldo: 0 },
  { codigo: '656', nombre: 'Suministros', tipo: 'GASTO', nivel: 2, cuentaPadre: '65', paisId: 'peru', activa: true, saldo: 0 },
  { codigo: '659', nombre: 'Otros gastos de gestión', tipo: 'GASTO', nivel: 2, cuentaPadre: '65', paisId: 'peru', activa: true, saldo: 0 }
];

export class SeedDataSupabaseService {
  static async insertTestData(empresaId: string): Promise<void> {
    try {
      console.log(`Insertando datos de prueba para empresa ${empresaId}...`);

      // Verificar si ya existe plan de cuentas
      const { data: existingCuentas, error: checkError } = await supabase
        .from('plan_cuentas')
        .select('id')
        .eq('empresa_id', empresaId)
        .limit(1);

      if (checkError) throw checkError;

      if (existingCuentas && existingCuentas.length > 0) {
        console.log('⚠️ Ya existen cuentas para esta empresa. No se insertarán datos duplicados.');
        throw new Error('Ya existe un plan de cuentas para esta empresa. Elimine las cuentas existentes antes de insertar datos de prueba.');
      }

      // Preparar datos para inserción
      const cuentasToInsert = planCuentasBase.map(cuenta => ({
        codigo: cuenta.codigo,
        nombre: cuenta.nombre,
        tipo: cuenta.tipo,
        nivel: cuenta.nivel,
        cuenta_padre: cuenta.cuentaPadre,
        descripcion: cuenta.descripcion,
        saldo: cuenta.saldo || 0,
        activa: cuenta.activa,
        pais_id: cuenta.paisId,
        empresa_id: empresaId,
        configuracion: cuenta.configuracion
      }));

      console.log(`Insertando ${cuentasToInsert.length} cuentas...`);

      // Insertar en lotes de 50 para evitar límites de Supabase
      const batchSize = 50;
      for (let i = 0; i < cuentasToInsert.length; i += batchSize) {
        const batch = cuentasToInsert.slice(i, i + batchSize);
        const { error: insertError } = await supabase
          .from('plan_cuentas')
          .insert(batch);

        if (insertError) {
          console.error('Error insertando lote:', insertError);
          throw insertError;
        }

        console.log(`✅ Insertado lote ${Math.floor(i / batchSize) + 1}/${Math.ceil(cuentasToInsert.length / batchSize)}`);
      }

      console.log(`✅ Plan de cuentas inicializado exitosamente para empresa ${empresaId}`);
    } catch (error) {
      console.error('❌ Error insertando datos de prueba:', error);
      throw error;
    }
  }
}
