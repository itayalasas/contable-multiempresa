import React from 'react';
import { Building2, FileText, Receipt, Users, Briefcase, CheckCircle } from 'lucide-react';

interface StepResumenProps {
  data: any;
}

export const StepResumen: React.FC<StepResumenProps> = ({ data }) => {
  const InfoRow = ({ label, value }: { label: string; value: any }) => {
    if (!value) return null;
    return (
      <div className="flex justify-between py-2 border-b border-gray-200">
        <span className="text-sm font-medium text-gray-600">{label}:</span>
        <span className="text-sm text-gray-900">{value}</span>
      </div>
    );
  };

  const Section = ({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) => (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center space-x-2 mb-4">
        {icon}
        <h4 className="text-md font-semibold text-gray-900">{title}</h4>
      </div>
      <div className="space-y-2">
        {children}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Resumen de la Nueva Empresa</h3>
        <p className="text-sm text-gray-600">
          Revise la información antes de finalizar. Puede volver atrás para hacer cambios.
        </p>
      </div>

      <div className="space-y-4">
        {/* Datos Básicos */}
        <Section title="Datos Básicos" icon={<Building2 className="w-5 h-5 text-blue-600" />}>
          <InfoRow label="Nombre" value={data.nombre} />
          <InfoRow label="Razón Social" value={data.razon_social} />
          <InfoRow label="Nombre Fantasía" value={data.nombre_fantasia} />
          <InfoRow label="País" value={data.pais_nombre} />
          <InfoRow label="RUT/Identificación" value={data.numero_identificacion} />
          <InfoRow label="Fecha Inicio Actividades" value={data.fecha_inicio_actividades} />
          <InfoRow label="Email" value={data.email} />
          <InfoRow label="Teléfono" value={data.telefono} />
          <InfoRow label="Ciudad" value={data.ciudad} />
        </Section>

        {/* Configuración Fiscal */}
        <Section title="Configuración Fiscal" icon={<FileText className="w-5 h-5 text-purple-600" />}>
          <InfoRow label="Responsabilidad IVA" value={data.responsabilidad_iva} />
          <InfoRow label="Régimen Tributario" value={data.regimen_tributario} />
          <InfoRow label="Número BPS" value={data.numero_bps} />
          <InfoRow label="Número MTSS" value={data.numero_mtss} />
          <InfoRow label="Ejercicio Fiscal" value={data.ejercicio_fiscal} />
          <InfoRow label="Método de Costeo" value={data.metodo_costeo} />
          <InfoRow label="Tipo de Inventario" value={data.tipo_inventario} />
          <InfoRow
            label="Maneja Inventario"
            value={data.maneja_inventario ? 'Sí' : 'No'}
          />
        </Section>

        {/* Facturación Electrónica */}
        {data.cfe_habilitado && (
          <Section title="Facturación Electrónica" icon={<Receipt className="w-5 h-5 text-green-600" />}>
            <InfoRow label="CFE Habilitado" value="Sí" />
            <InfoRow label="RUC Emisor" value={data.cfe_ruc_emisor} />
            <InfoRow label="Código Sucursal" value={data.cfe_codigo_sucursal} />
            <InfoRow label="Punto de Venta" value={data.cfe_punto_venta} />
            <InfoRow label="Serie" value={data.cfe_serie} />
            <InfoRow label="Ambiente" value={data.cfe_ambiente} />
            <InfoRow
              label="Certificado Configurado"
              value={data.cfe_certificado_path ? 'Sí' : 'No'}
            />
          </Section>
        )}

        {/* Nómina BPS */}
        {data.bps_habilitado && (
          <Section title="Nómina (BPS)" icon={<Users className="w-5 h-5 text-orange-600" />}>
            <InfoRow label="BPS Habilitado" value="Sí" />
            <InfoRow label="Número Patrono BPS" value={data.bps_numero_patrono} />
            <InfoRow label="Representante Legal" value={data.bps_representante_nombre} />
            <InfoRow label="CI Representante" value={data.bps_representante_ci} />
            <InfoRow label="Cargo" value={data.bps_representante_cargo} />
            <InfoRow label="Día de Pago" value={data.bps_dia_pago} />
            <InfoRow label="Periodicidad" value={data.bps_periodicidad_pago} />
            <InfoRow label="Tipo de Aporte" value={data.bps_tipo_aporte} />
          </Section>
        )}

        {/* Actividades Económicas */}
        {data.actividades_economicas && data.actividades_economicas.length > 0 && (
          <Section title="Actividades Económicas" icon={<Briefcase className="w-5 h-5 text-indigo-600" />}>
            <div className="space-y-2">
              {data.actividades_economicas.map((actividad: any, index: number) => (
                <div key={index} className="p-2 bg-gray-50 rounded">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-sm font-semibold text-gray-700">
                      {actividad.codigo}
                    </span>
                    {actividad.principal && (
                      <span className="px-2 py-0.5 text-xs font-semibold text-blue-700 bg-blue-100 rounded">
                        Principal
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 mt-1">{actividad.descripcion}</p>
                </div>
              ))}
            </div>
          </Section>
        )}
      </div>

      {/* Mensaje Final */}
      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="text-sm font-semibold text-blue-900 mb-2">Próximos Pasos</h4>
        <ul className="text-xs text-blue-800 space-y-1">
          <li>• La empresa será creada con la información proporcionada</li>
          <li>• Podrá modificar esta información más adelante desde la configuración</li>
          <li>• Se generará automáticamente un plan de cuentas básico</li>
          <li>• Podrá comenzar a registrar transacciones inmediatamente</li>
        </ul>
      </div>
    </div>
  );
};
