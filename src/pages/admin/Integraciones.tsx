import React, { useState } from 'react';
import { useSesion } from '../../context/SesionContext';

interface Integracion {
  id: string;
  nombre: string;
  tipo: string;
  estado: 'activa' | 'inactiva' | 'configurando';
  descripcion: string;
  icono: string;
  ultimaSincronizacion?: string;
}

export default function Integraciones() {
  const { empresaActual } = useSesion();
  const [showSecret, setShowSecret] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);

  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/webhooks-orders`;
  const webhookSecret = 'default-secret-change-in-production';

  const copyToClipboard = async (text: string, type: 'url' | 'secret') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'url') {
        setCopiedUrl(true);
        setTimeout(() => setCopiedUrl(false), 2000);
      } else {
        setCopiedSecret(true);
        setTimeout(() => setCopiedSecret(false), 2000);
      }
    } catch (err) {
      console.error('Error al copiar:', err);
    }
  };

  const [integraciones] = useState<Integracion[]>([
    {
      id: '1',
      nombre: 'Webhooks',
      tipo: 'api',
      estado: 'activa',
      descripcion: 'Recepción de eventos desde sistemas externos',
      icono: '🔗',
      ultimaSincronizacion: new Date().toISOString(),
    },
    {
      id: '2',
      nombre: 'DGI Uruguay',
      tipo: 'fiscal',
      estado: 'configurando',
      descripcion: 'Facturación electrónica con DGI',
      icono: '🏛️',
    },
    {
      id: '3',
      nombre: 'MercadoPago',
      tipo: 'pagos',
      estado: 'inactiva',
      descripcion: 'Procesamiento de pagos',
      icono: '💳',
    },
    {
      id: '4',
      nombre: 'API REST',
      tipo: 'api',
      estado: 'activa',
      descripcion: 'API para consultar datos del sistema',
      icono: '🔌',
      ultimaSincronizacion: new Date().toISOString(),
    },
  ]);

  const getEstadoBadge = (estado: string) => {
    const badges = {
      activa: 'bg-green-100 text-green-700',
      inactiva: 'bg-gray-100 text-gray-700',
      configurando: 'bg-yellow-100 text-yellow-700',
    };
    return badges[estado as keyof typeof badges];
  };

  const getEstadoLabel = (estado: string) => {
    const labels = {
      activa: 'Activa',
      inactiva: 'Inactiva',
      configurando: 'Configurando',
    };
    return labels[estado as keyof typeof labels];
  };

  if (!empresaActual) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Seleccione una empresa para continuar</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Integraciones</h1>
          <p className="text-gray-600 mt-1">
            Conecta el sistema contable con aplicaciones externas
          </p>
        </div>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
          Nueva Integración
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-600">Total</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{integraciones.length}</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-600">Activas</div>
          <div className="text-2xl font-bold text-green-600 mt-1">
            {integraciones.filter((i) => i.estado === 'activa').length}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-600">Configurando</div>
          <div className="text-2xl font-bold text-yellow-600 mt-1">
            {integraciones.filter((i) => i.estado === 'configurando').length}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-600">Inactivas</div>
          <div className="text-2xl font-bold text-gray-600 mt-1">
            {integraciones.filter((i) => i.estado === 'inactiva').length}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {integraciones.map((integracion) => (
          <div key={integracion.id} className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className="text-4xl">{integracion.icono}</div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{integracion.nombre}</h3>
                  <p className="text-sm text-gray-500 mt-1">{integracion.descripcion}</p>
                </div>
              </div>
              <span
                className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getEstadoBadge(
                  integracion.estado
                )}`}
              >
                {getEstadoLabel(integracion.estado)}
              </span>
            </div>

            {integracion.ultimaSincronizacion && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-500">
                  Última sincronización:{' '}
                  {new Date(integracion.ultimaSincronizacion).toLocaleString()}
                </p>
              </div>
            )}

            <div className="mt-4 flex gap-2">
              <button className="flex-1 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium">
                Configurar
              </button>
              <button className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium">
                Ver Logs
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Información de Webhooks
        </h2>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ID de Empresa
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={empresaActual?.id || ''}
                readOnly
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 text-sm font-mono"
              />
              <button
                onClick={() => empresaActual && copyToClipboard(empresaActual.id, 'url')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                {copiedUrl ? '✓ Copiado' : 'Copiar'}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Usa este UUID como <code className="bg-gray-100 px-1 py-0.5 rounded">empresa_id</code> en tus llamadas al webhook
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              URL del Webhook
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={webhookUrl}
                readOnly
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 text-sm"
              />
              <button
                onClick={() => copyToClipboard(webhookUrl, 'url')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                {copiedUrl ? '✓ Copiado' : 'Copiar'}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Webhook Secret
            </label>
            <div className="flex gap-2">
              <input
                type={showSecret ? 'text' : 'password'}
                value={showSecret ? webhookSecret : '****-****-****-****'}
                readOnly
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 text-sm"
              />
              <button
                onClick={() => setShowSecret(!showSecret)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
              >
                {showSecret ? 'Ocultar' : 'Ver'}
              </button>
              {showSecret && (
                <button
                  onClick={() => copyToClipboard(webhookSecret, 'secret')}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                >
                  {copiedSecret ? '✓ Copiado' : 'Copiar'}
                </button>
              )}
            </div>
          </div>
        </div>
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            <strong>Importante:</strong> No compartas el Webhook Secret públicamente. Este valor
            se usa para autenticar las solicitudes de sistemas externos.
          </p>
        </div>

        {empresaActual && (
          <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Ejemplo de Prueba (cURL)</h3>
            <pre className="text-xs bg-gray-900 text-green-400 p-3 rounded overflow-x-auto">
{`curl -X POST ${webhookUrl} \\
  -H "Content-Type: application/json" \\
  -H "X-Webhook-Secret: ${webhookSecret}" \\
  -d '{
  "event": "order.paid",
  "order_id": "ORD-12345",
  "empresa_id": "${empresaActual.id}",
  "customer": {
    "nombre": "Juan Pérez",
    "documento": "12345678-9",
    "email": "juan@email.com"
  },
  "service": {
    "tipo": "veterinaria",
    "descripcion": "Consulta veterinaria"
  },
  "amounts": {
    "total": 1000,
    "tax": 180
  },
  "payment": {
    "method": "mercadopago",
    "transaction_id": "MP-98765",
    "paid_at": "${new Date().toISOString()}"
  }
}'`}
            </pre>
            <p className="text-xs text-gray-600 mt-2">
              Copia y pega este comando en tu terminal para probar el webhook
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
