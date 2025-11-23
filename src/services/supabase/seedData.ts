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

      // Obtener el país de la empresa
      const { data: empresa, error: empresaError } = await supabase
        .from('empresas')
        .select('pais_id')
        .eq('id', empresaId)
        .single();

      if (empresaError) throw empresaError;
      if (!empresa || !empresa.pais_id) {
        throw new Error('No se pudo obtener el país de la empresa');
      }

      const paisId = empresa.pais_id;
      console.log(`País de la empresa: ${paisId}`);

      // Verificar si ya existe plan de cuentas
      const { data: existingCuentas, error: checkError } = await supabase
        .from('plan_cuentas')
        .select('id, codigo, nombre')
        .eq('empresa_id', empresaId);

      if (checkError) throw checkError;

      // Si ya hay cuentas, solo insertar asientos de prueba
      if (existingCuentas && existingCuentas.length > 0) {
        console.log('⚠️ Ya existe un plan de cuentas. Insertando solo asientos de prueba...');
        await this.insertAsientosPrueba(empresaId, paisId, existingCuentas);
        return;
      }

      // Insertar cuentas por niveles para respetar la jerarquía
      // y crear mapeo de códigos a IDs
      const codigoToIdMap = new Map<string, string>();

      // Obtener el máximo nivel
      const maxNivel = Math.max(...planCuentasBase.map(c => c.nivel));

      console.log(`Insertando ${planCuentasBase.length} cuentas en ${maxNivel} niveles...`);

      // Insertar por niveles
      for (let nivel = 1; nivel <= maxNivel; nivel++) {
        const cuentasNivel = planCuentasBase.filter(c => c.nivel === nivel);

        if (cuentasNivel.length === 0) continue;

        console.log(`📊 Insertando ${cuentasNivel.length} cuentas de nivel ${nivel}...`);

        const cuentasToInsert = cuentasNivel.map(cuenta => {
          const cuentaPadreId = cuenta.cuentaPadre ? codigoToIdMap.get(cuenta.cuentaPadre) : null;

          return {
            codigo: cuenta.codigo,
            nombre: cuenta.nombre,
            tipo: cuenta.tipo,
            nivel: cuenta.nivel,
            cuenta_padre: cuentaPadreId,
            descripcion: cuenta.descripcion,
            saldo: cuenta.saldo || 0,
            activa: cuenta.activa,
            pais_id: paisId,
            empresa_id: empresaId,
            configuracion: cuenta.configuracion
          };
        });

        // Insertar cuentas del nivel actual
        const { data: insertedCuentas, error: insertError } = await supabase
          .from('plan_cuentas')
          .insert(cuentasToInsert)
          .select('id, codigo');

        if (insertError) {
          console.error(`Error insertando cuentas de nivel ${nivel}:`, insertError);
          throw insertError;
        }

        // Actualizar mapeo de códigos a IDs
        if (insertedCuentas) {
          insertedCuentas.forEach(cuenta => {
            codigoToIdMap.set(cuenta.codigo, cuenta.id);
          });
        }

        console.log(`✅ Insertadas ${cuentasNivel.length} cuentas de nivel ${nivel}`);
      }

      console.log(`✅ Plan de cuentas inicializado exitosamente para empresa ${empresaId}`);

      // Insertar asientos de prueba
      await this.insertAsientosPrueba(empresaId, paisId, Array.from(codigoToIdMap.entries()).map(([codigo, id]) => ({ id, codigo, nombre: '' })));
    } catch (error) {
      console.error('❌ Error insertando datos de prueba:', error);
      throw error;
    }
  }

  private static async insertAsientosPrueba(empresaId: string, paisId: string, cuentas: Array<{ id: string; codigo: string; nombre: string }>): Promise<void> {
    try {
      console.log('📝 Insertando asientos de prueba...');

      // Buscar cuentas necesarias para los asientos
      const caja = cuentas.find(c => c.codigo === '1011' || c.codigo.startsWith('10'));
      const banco = cuentas.find(c => c.codigo === '1041' || c.codigo.startsWith('104'));
      const capital = cuentas.find(c => c.codigo === '5011' || c.codigo.startsWith('50'));
      const ventas = cuentas.find(c => c.codigo === '7011' || c.codigo.startsWith('70'));
      const compras = cuentas.find(c => c.codigo === '6011' || c.codigo.startsWith('60'));
      const gastosServicios = cuentas.find(c => c.codigo === '6361' || c.codigo.startsWith('63'));

      if (!caja && !banco) {
        console.log('⚠️ No se encontraron cuentas de efectivo. No se pueden crear asientos de prueba.');
        return;
      }

      const asientosPrueba = [];

      // Asiento 1: Apertura de capital
      if (caja && capital) {
        asientosPrueba.push({
          numero: 'ASI-000001',
          fecha: new Date(new Date().getFullYear(), 0, 2).toISOString().split('T')[0],
          descripcion: 'Asiento de apertura - Aporte de capital inicial',
          referencia: 'APE-001',
          estado: 'confirmado',
          empresa_id: empresaId,
          pais_id: paisId,
          creado_por: 'sistema',
          movimientos: [
            {
              cuenta_id: caja.id,
              cuenta: `${caja.codigo} - ${caja.nombre}`,
              debito: 50000,
              credito: 0,
              descripcion: 'Aporte inicial en efectivo'
            },
            {
              cuenta_id: capital.id,
              cuenta: `${capital.codigo} - ${capital.nombre}`,
              debito: 0,
              credito: 50000,
              descripcion: 'Capital social inicial'
            }
          ]
        });
      }

      // Asiento 2: Venta de mercadería
      if (caja && ventas) {
        asientosPrueba.push({
          numero: 'ASI-000002',
          fecha: new Date(new Date().getFullYear(), 0, 15).toISOString().split('T')[0],
          descripcion: 'Venta de mercadería al contado',
          referencia: 'FAC-001',
          estado: 'confirmado',
          empresa_id: empresaId,
          pais_id: paisId,
          creado_por: 'sistema',
          movimientos: [
            {
              cuenta_id: caja.id,
              cuenta: `${caja.codigo} - ${caja.nombre}`,
              debito: 15000,
              credito: 0,
              descripcion: 'Cobro de venta'
            },
            {
              cuenta_id: ventas.id,
              cuenta: `${ventas.codigo} - ${ventas.nombre}`,
              debito: 0,
              credito: 15000,
              descripcion: 'Ingreso por ventas'
            }
          ]
        });
      }

      // Asiento 3: Compra de mercadería
      if (banco && compras) {
        asientosPrueba.push({
          numero: 'ASI-000003',
          fecha: new Date(new Date().getFullYear(), 0, 20).toISOString().split('T')[0],
          descripcion: 'Compra de mercadería con transferencia bancaria',
          referencia: 'COM-001',
          estado: 'confirmado',
          empresa_id: empresaId,
          pais_id: paisId,
          creado_por: 'sistema',
          movimientos: [
            {
              cuenta_id: compras.id,
              cuenta: `${compras.codigo} - ${compras.nombre}`,
              debito: 8000,
              credito: 0,
              descripcion: 'Compra de mercadería'
            },
            {
              cuenta_id: banco.id,
              cuenta: `${banco.codigo} - ${banco.nombre}`,
              debito: 0,
              credito: 8000,
              descripcion: 'Pago mediante transferencia'
            }
          ]
        });
      }

      // Asiento 4: Pago de servicios
      if (caja && gastosServicios) {
        asientosPrueba.push({
          numero: 'ASI-000004',
          fecha: new Date(new Date().getFullYear(), 0, 25).toISOString().split('T')[0],
          descripcion: 'Pago de servicios básicos',
          referencia: 'SERV-001',
          estado: 'confirmado',
          empresa_id: empresaId,
          pais_id: paisId,
          creado_por: 'sistema',
          movimientos: [
            {
              cuenta_id: gastosServicios.id,
              cuenta: `${gastosServicios.codigo} - ${gastosServicios.nombre}`,
              debito: 1500,
              credito: 0,
              descripcion: 'Pago de luz, agua, internet'
            },
            {
              cuenta_id: caja.id,
              cuenta: `${caja.codigo} - ${caja.nombre}`,
              debito: 0,
              credito: 1500,
              descripcion: 'Pago en efectivo'
            }
          ]
        });
      }

      // Insertar los asientos
      for (const asiento of asientosPrueba) {
        const movimientos = asiento.movimientos;
        delete (asiento as any).movimientos;

        // Insertar el asiento
        const { data: asientoCreado, error: asientoError } = await supabase
          .from('asientos_contables')
          .insert(asiento)
          .select()
          .single();

        if (asientoError) {
          console.error('Error insertando asiento:', asientoError);
          continue;
        }

        // Insertar los movimientos
        const movimientosToInsert = movimientos.map(mov => ({
          ...mov,
          asiento_id: asientoCreado.id
        }));

        const { error: movError } = await supabase
          .from('movimientos_contables')
          .insert(movimientosToInsert);

        if (movError) {
          console.error('Error insertando movimientos:', movError);
        } else {
          console.log(`✅ Asiento ${asiento.numero} creado exitosamente`);
        }
      }

      console.log(`✅ ${asientosPrueba.length} asientos de prueba insertados exitosamente`);
    } catch (error) {
      console.error('❌ Error insertando asientos de prueba:', error);
      throw error;
    }
  }
}
