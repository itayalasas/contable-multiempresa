import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clipboard,
  Code2,
  Copy,
  Download,
  Eye,
  EyeOff,
  FileJson,
  KeyRound,
  Landmark,
  Link2,
  Loader2,
  Plug,
  RefreshCw,
  Save,
  Send,
  Settings,
  ShieldCheck,
  Terminal,
  WalletCards,
  X,
} from 'lucide-react';
import { useSesion } from '../../context/SesionContext';
import { empresasConfiguracionService, EmpresaConfigCFE } from '../../services/supabase/empresasConfiguracion';
import {
  EventoExterno,
  obtenerEstadisticasEventos,
  obtenerEventosExternos,
  reintentarEvento,
} from '../../services/supabase/eventosExternos';
import {
  ApiKeyConfig,
  AutoSendDGIConfig,
  ComisionMPConfig,
  IntegracionConfig,
  IntegracionTipo,
  LogIntegracion,
  integracionesSupabaseService,
} from '../../services/supabase/integraciones';

type EstadoIntegracion = 'activa' | 'inactiva' | 'configurando' | 'error';
type ActiveTab = 'resumen' | 'logs' | 'api';
type ModalKind = 'webhooks' | 'dgi' | 'mercadopago' | 'api-rest' | 'custom' | 'new';

interface IntegracionUi {
  id: string;
  nombre: string;
  tipo: string;
  estado: EstadoIntegracion;
  descripcion: string;
  icon: React.ElementType;
  ultimaSincronizacion?: string;
  customConfig?: IntegracionConfig;
}

interface TimelineItem {
  id: string;
  integrationId: string;
  source: string;
  event: string;
  result: 'EXITO' | 'ERROR' | 'PENDIENTE' | 'TIMEOUT';
  message: string;
  statusCode?: number;
  date?: string;
  body?: unknown;
  raw: unknown;
  eventoExterno?: EventoExterno;
}

interface EventStats {
  total: number;
  procesados: number;
  pendientes: number;
  errores: number;
  por_tipo?: Record<string, number>;
}

interface ExternalEventPayload {
  order?: {
    payment_method?: string;
  };
}

interface ApiEndpoint {
  id: string;
  title: string;
  method: 'POST';
  functionName: string;
  description: string;
  auth: 'webhook' | 'supabase';
  warning?: string;
  requestExample: (empresaId: string, usuarioId?: string) => unknown;
  responseExample: unknown;
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const webhookSecret = import.meta.env.VITE_WEBHOOK_SECRET || 'default-secret-change-in-production';

const emptyUuid = '00000000-0000-0000-0000-000000000000';

const codeTextareaClassName =
  'w-full rounded-lg border border-gray-300 bg-gray-950 p-3 font-mono text-xs text-white caret-white placeholder:text-gray-400 selection:bg-blue-500 selection:text-white';

const codeTextareaStyle: React.CSSProperties = {
  color: '#f9fafb',
  WebkitTextFillColor: '#f9fafb',
  colorScheme: 'dark',
};

const buildFunctionHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (anonKey) {
    headers.apikey = anonKey;
    headers.Authorization = `Bearer ${anonKey}`;
  }

  return headers;
};

const withSelectedCompany = (payload: unknown, empresaId: string) => {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return payload;
  }

  return {
    ...payload,
    empresa_id: empresaId,
  };
};

const integrationTypeOptions: IntegracionTipo[] = [
  'CRM',
  'DGI',
  'PASARELA_PAGO',
  'NOTIFICACIONES',
  'ERP',
  'ECOMMERCE',
  'CUSTOM',
];

const apiPermissionOptions = [
  'webhooks:write',
  'facturas:read',
  'facturas:write',
  'clientes:read',
  'pagos:write',
  'aprobaciones:write',
  'logs:read',
];

const formatDate = (value?: string) => {
  if (!value) return 'Sin datos';
  return new Date(value).toLocaleString();
};

const stringifyJson = (value: unknown) => JSON.stringify(value, null, 2);

const parseJson = (value: string) => {
  try {
    return { data: JSON.parse(value), error: null as string | null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'JSON invalido',
    };
  }
};

const getBadgeClass = (estado: EstadoIntegracion) => {
  const classes: Record<EstadoIntegracion, string> = {
    activa: 'bg-green-100 text-green-700',
    inactiva: 'bg-gray-100 text-gray-700',
    configurando: 'bg-yellow-100 text-yellow-700',
    error: 'bg-red-100 text-red-700',
  };
  return classes[estado];
};

const getResultClass = (result: TimelineItem['result']) => {
  const classes: Record<TimelineItem['result'], string> = {
    EXITO: 'bg-green-100 text-green-700',
    ERROR: 'bg-red-100 text-red-700',
    PENDIENTE: 'bg-yellow-100 text-yellow-700',
    TIMEOUT: 'bg-orange-100 text-orange-700',
  };
  return classes[result];
};

const createEmptyIntegration = (empresaId: string, usuarioId?: string): IntegracionConfig => ({
  empresa_id: empresaId,
  nombre: '',
  tipo: 'CUSTOM',
  proveedor: '',
  descripcion: '',
  url_base: '',
  estado: 'activo',
  activo: true,
  configuracion: {
    timeout_segundos: 30,
    max_reintentos: 3,
    habilitar_logs: true,
  },
  headers: {},
  creado_por: usuarioId,
});

const buildApiEndpoints = (empresaId: string, usuarioId?: string): ApiEndpoint[] => [
  {
    id: 'webhooks-orders',
    title: 'Webhook de ordenes',
    method: 'POST',
    functionName: 'webhooks-orders',
    description: 'Recibe ordenes externas y crea factura, cliente, cobro y asientos relacionados.',
    auth: 'webhook',
    warning: 'Puede crear facturas y movimientos reales en la empresa seleccionada.',
    requestExample: () => ({
      event: 'order.paid',
      empresa_id: empresaId,
      timestamp: new Date().toISOString(),
      order: {
        order_id: `TEST-${Date.now()}`,
        order_number: `TEST-${Date.now()}`,
        created_at: new Date().toISOString(),
        status: 'paid',
        payment_status: 'paid',
        payment_method: 'mercadopago',
        subtotal: 1000,
        tax: 220,
        discount: 0,
        shipping: 0,
        total: 1220,
        currency: 'UYU',
      },
      customer: {
        customer_id: 'cli-test',
        name: 'Cliente de prueba',
        email: 'cliente.prueba@example.com',
        document_type: 'RUT',
        document_number: '219357800013',
      },
      items: [
        {
          sku: 'SERV-001',
          name: 'Servicio de prueba',
          quantity: 1,
          unit_price: 1000,
          subtotal: 1000,
          tax_rate: 0.22,
          tax_amount: 220,
          total: 1220,
        },
      ],
      metadata: {
        source: 'integraciones-api-explorer',
        amounts_in_cents: false,
      },
    }),
    responseExample: {
      success: true,
      data: {
        factura_id: emptyUuid,
        numero_factura: '00000001',
        mensaje: 'Orden procesada correctamente',
      },
    },
  },
  {
    id: 'auto-send-dgi',
    title: 'Enviar factura a DGI',
    method: 'POST',
    functionName: 'auto-send-dgi',
    description: 'Envia una factura existente al proveedor DGI configurado.',
    auth: 'supabase',
    warning: 'Requiere una factura real y configuracion CFE activa.',
    requestExample: () => ({ facturaId: emptyUuid }),
    responseExample: {
      success: true,
      facturaId: emptyUuid,
      cae: 'CAE-123',
      mensaje: 'Factura enviada exitosamente a DGI',
    },
  },
  {
    id: 'actualizar-cfe-facturas',
    title: 'Actualizar datos CFE',
    method: 'POST',
    functionName: 'actualizar-cfe-facturas',
    description: 'Consulta DGI para completar CAE, serie, numero, hash y vencimiento pendientes.',
    auth: 'supabase',
    requestExample: () => ({}),
    responseExample: {
      success: true,
      actualizadas: 0,
      errores: 0,
    },
  },
  {
    id: 'generar-asiento-factura',
    title: 'Generar asiento de factura',
    method: 'POST',
    functionName: 'generar-asiento-factura',
    description: 'Genera o regenera el asiento contable de una factura de venta.',
    auth: 'supabase',
    requestExample: () => ({ factura_id: emptyUuid, manual: true }),
    responseExample: {
      success: true,
      asiento_id: emptyUuid,
    },
  },
  {
    id: 'procesar-cobro-cliente',
    title: 'Procesar cobro de cliente',
    method: 'POST',
    functionName: 'procesar-cobro-cliente',
    description: 'Registra un cobro, actualiza la factura y genera movimientos contables.',
    auth: 'supabase',
    warning: 'Registra pagos reales si el ID de factura existe.',
    requestExample: () => ({
      factura_id: emptyUuid,
      pago: {
        fechaPago: new Date().toISOString().split('T')[0],
        monto: 1000,
        tipoPago: 'TRANSFERENCIA',
        referencia: 'TEST-COBRO',
        observaciones: 'Prueba desde API Explorer',
        creadoPor: usuarioId || 'api-explorer',
      },
    }),
    responseExample: {
      success: true,
      pago_id: emptyUuid,
      asiento_id: emptyUuid,
    },
  },
  {
    id: 'procesar-pago-proveedor',
    title: 'Procesar pago a proveedor',
    method: 'POST',
    functionName: 'procesar-pago-proveedor',
    description: 'Registra un pago a proveedor y genera el asiento asociado.',
    auth: 'supabase',
    warning: 'Registra pagos reales si el ID de factura existe.',
    requestExample: () => ({
      factura_id: emptyUuid,
      pago: {
        fechaPago: new Date().toISOString().split('T')[0],
        monto: 1000,
        tipoPago: 'TRANSFERENCIA',
        referencia: 'TEST-PAGO',
        observaciones: 'Prueba desde API Explorer',
        creadoPor: usuarioId || 'api-explorer',
      },
    }),
    responseExample: {
      success: true,
      pago_id: emptyUuid,
      asiento_id: emptyUuid,
    },
  },
  {
    id: 'generar-asiento-tesoreria',
    title: 'Generar asiento tesoreria',
    method: 'POST',
    functionName: 'generar-asiento-tesoreria',
    description: 'Genera el asiento contable de un movimiento de tesoreria existente.',
    auth: 'supabase',
    requestExample: () => ({ movimientoTesoreriaId: emptyUuid }),
    responseExample: {
      success: true,
      asiento_id: emptyUuid,
    },
  },
  {
    id: 'solicitar-aprobacion-generica',
    title: 'Solicitar aprobacion',
    method: 'POST',
    functionName: 'solicitar-aprobacion-generica',
    description: 'Crea una solicitud de aprobacion para cambios sensibles.',
    auth: 'supabase',
    requestExample: () => ({
      empresaId,
      tablaAfectada: 'facturas_venta',
      registroId: emptyUuid,
      tipoSolicitud: 'modificacion',
      datosModificados: { observaciones: 'Cambio propuesto' },
      motivo: 'Prueba desde API Explorer',
      usuarioId: usuarioId || 'api-explorer',
    }),
    responseExample: {
      success: true,
      solicitud: { id: emptyUuid, estado: 'pendiente' },
    },
  },
  {
    id: 'aprobar-rechazar-solicitud',
    title: 'Aprobar o rechazar solicitud',
    method: 'POST',
    functionName: 'aprobar-rechazar-solicitud',
    description: 'Procesa una solicitud pendiente y ejecuta la accion aprobada cuando corresponde.',
    auth: 'supabase',
    warning: 'Puede modificar registros reales si la solicitud existe.',
    requestExample: () => ({
      solicitudId: emptyUuid,
      accion: 'aprobar',
      aprobadorId: usuarioId || 'api-explorer',
      comentarios: 'Aprobado desde API Explorer',
    }),
    responseExample: {
      success: true,
      solicitud: { id: emptyUuid, estado: 'aprobada' },
    },
  },
];

async function sha256Hex(value: string): Promise<string> {
  if (!crypto.subtle) {
    return `unsafe-${value}`;
  }

  const encoded = new TextEncoder().encode(value);
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(hashBuffer))
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
}

function generateApiKey() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const token = btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `ce_live_${token}`;
}

export default function Integraciones() {
  const { empresaActual, usuario } = useSesion();
  const [activeTab, setActiveTab] = useState<ActiveTab>('resumen');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [customConfigs, setCustomConfigs] = useState<IntegracionConfig[]>([]);
  const [eventos, setEventos] = useState<EventoExterno[]>([]);
  const [eventStats, setEventStats] = useState<EventStats | null>(null);
  const [logs, setLogs] = useState<LogIntegracion[]>([]);
  const [dgiConfig, setDgiConfig] = useState<AutoSendDGIConfig | null>(null);
  const [mpConfig, setMpConfig] = useState<ComisionMPConfig | null>(null);
  const [apiKeys, setApiKeys] = useState<ApiKeyConfig[]>([]);
  const [cfeConfig, setCfeConfig] = useState<EmpresaConfigCFE | null>(null);

  const [modalKind, setModalKind] = useState<ModalKind | null>(null);
  const [selectedIntegration, setSelectedIntegration] = useState<IntegracionUi | null>(null);
  const [selectedLog, setSelectedLog] = useState<TimelineItem | null>(null);
  const [logFilter, setLogFilter] = useState('todas');

  const [showSecret, setShowSecret] = useState(false);
  const [copyState, setCopyState] = useState<string | null>(null);
  const [testResponse, setTestResponse] = useState<string>('');

  const [dgiDraft, setDgiDraft] = useState({
    auto_send_enabled: false,
    enviar_solo_si_estado: 'pendiente,borrador',
  });
  const [mpDraft, setMpDraft] = useState({
    activo: false,
    porcentaje: '5.00',
    descripcion: 'Comision MercadoPago descontada en webhooks',
  });
  const [apiKeyDraft, setApiKeyDraft] = useState({
    nombre: 'Integracion externa',
    descripcion: '',
    permisos: ['webhooks:write', 'facturas:read'],
    rate_limit: '100',
    rate_limit_periodo: 'minute' as ApiKeyConfig['rate_limit_periodo'],
    fecha_expiracion: '',
  });
  const [generatedApiKey, setGeneratedApiKey] = useState('');
  const [customDraft, setCustomDraft] = useState<IntegracionConfig>(() => createEmptyIntegration('', ''));

  const webhookUrl = `${supabaseUrl}/functions/v1/webhooks-orders`;
  const apiEndpoints = useMemo(
    () => buildApiEndpoints(empresaActual?.id || emptyUuid, usuario?.id),
    [empresaActual?.id, usuario?.id]
  );
  const [selectedEndpointId, setSelectedEndpointId] = useState('webhooks-orders');
  const selectedEndpoint = apiEndpoints.find(endpoint => endpoint.id === selectedEndpointId) || apiEndpoints[0];
  const [apiBody, setApiBody] = useState('');
  const [apiResponse, setApiResponse] = useState('');

  const webhookExample = useMemo(() => {
    const endpoint = apiEndpoints.find(item => item.id === 'webhooks-orders');
    return endpoint ? stringifyJson(endpoint.requestExample(empresaActual?.id || emptyUuid, usuario?.id)) : '{}';
  }, [apiEndpoints, empresaActual?.id, usuario?.id]);

  const [webhookBody, setWebhookBody] = useState(webhookExample);

  useEffect(() => {
    setWebhookBody(webhookExample);
  }, [webhookExample]);

  useEffect(() => {
    if (selectedEndpoint) {
      setApiBody(stringifyJson(selectedEndpoint.requestExample(empresaActual?.id || emptyUuid, usuario?.id)));
      setApiResponse('');
    }
  }, [selectedEndpointId, selectedEndpoint, empresaActual?.id, usuario?.id]);

  const loadData = useCallback(async () => {
    if (!empresaActual) return;

    setLoading(true);
    setError(null);

    const [
      configsResult,
      eventosResult,
      statsResult,
      logsResult,
      dgiResult,
      mpResult,
      apiKeysResult,
      cfeResult,
    ] = await Promise.allSettled([
      integracionesSupabaseService.getIntegraciones(empresaActual.id),
      obtenerEventosExternos(empresaActual.id),
      obtenerEstadisticasEventos(empresaActual.id),
      integracionesSupabaseService.getLogs(empresaActual.id),
      integracionesSupabaseService.getAutoSendDGI(empresaActual.id),
      integracionesSupabaseService.getComisionMP(empresaActual.id),
      integracionesSupabaseService.getApiKeys(empresaActual.id),
      empresasConfiguracionService.getConfigCFE(empresaActual.id),
    ]);

    const warnings: string[] = [];
    const unwrap = <T,>(result: PromiseSettledResult<T>, fallback: T, label: string) => {
      if (result.status === 'fulfilled') return result.value;
      warnings.push(`${label}: ${result.reason?.message || 'no disponible'}`);
      return fallback;
    };

    const configs = unwrap(configsResult, [], 'Integraciones');
    const eventosData = unwrap(eventosResult, [], 'Eventos');
    const statsData = unwrap(statsResult, null as EventStats | null, 'Estadisticas de eventos');
    const logsData = unwrap(logsResult, [], 'Logs');
    const dgiData = unwrap(dgiResult, null, 'DGI');
    const mpData = unwrap(mpResult, null, 'MercadoPago');
    const apiKeysData = unwrap(apiKeysResult, [], 'API keys');
    const cfeData = unwrap(cfeResult, null, 'Config CFE');

    setCustomConfigs(configs);
    setEventos(eventosData);
    setEventStats(statsData);
    setLogs(logsData);
    setDgiConfig(dgiData);
    setMpConfig(mpData);
    setApiKeys(apiKeysData);
    setCfeConfig(cfeData);

    setDgiDraft({
      auto_send_enabled: dgiData?.auto_send_enabled || false,
      enviar_solo_si_estado: (dgiData?.enviar_solo_si_estado || ['pendiente', 'borrador']).join(','),
    });
    setMpDraft({
      activo: mpData?.activo || false,
      porcentaje: String(mpData?.porcentaje ?? '5.00'),
      descripcion: mpData?.descripcion || 'Comision MercadoPago descontada en webhooks',
    });

    if (warnings.length > 0) {
      setError(`Algunas fuentes no pudieron cargarse: ${warnings.join(' | ')}`);
    }

    setLoading(false);
  }, [empresaActual]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (empresaActual) {
      setCustomDraft(createEmptyIntegration(empresaActual.id, usuario?.id));
    }
  }, [empresaActual, usuario?.id]);

  const integraciones = useMemo<IntegracionUi[]>(() => {
    const lastEvent = eventos[0]?.created_at;
    const activeKeys = apiKeys.filter(key => key.activo !== false).length;
    const customCards: IntegracionUi[] = customConfigs.map(config => ({
      id: `custom-${config.id}`,
      nombre: config.nombre,
      tipo: config.tipo,
      estado: config.estado === 'error'
        ? 'error'
        : config.activo === false || config.estado === 'inactivo'
          ? 'inactiva'
          : config.estado === 'mantenimiento'
            ? 'configurando'
            : 'activa',
      descripcion: config.descripcion || `${config.proveedor} - ${config.url_base}`,
      icon: Plug,
      ultimaSincronizacion: config.ultima_sincronizacion,
      customConfig: config,
    }));

    return [
      {
        id: 'webhooks',
        nombre: 'Webhooks',
        tipo: 'api',
        estado: eventStats?.errores > 0 ? 'error' : 'activa',
        descripcion: 'Recepcion de eventos desde sistemas externos',
        icon: Link2,
        ultimaSincronizacion: lastEvent,
      },
      {
        id: 'dgi',
        nombre: 'DGI Uruguay',
        tipo: 'fiscal',
        estado: dgiConfig?.auto_send_enabled ? 'activa' : cfeConfig ? 'configurando' : 'inactiva',
        descripcion: cfeConfig
          ? `Facturacion electronica en ambiente ${cfeConfig.ambiente || 'testing'}`
          : 'Pendiente de configuracion CFE',
        icon: Landmark,
        ultimaSincronizacion: dgiConfig?.updated_at,
      },
      {
        id: 'mercadopago',
        nombre: 'MercadoPago',
        tipo: 'pagos',
        estado: mpConfig?.activo ? 'activa' : 'inactiva',
        descripcion: mpConfig?.activo
          ? `Comision automatica ${mpConfig.porcentaje}% en webhooks`
          : 'Procesamiento de pagos pendiente',
        icon: WalletCards,
        ultimaSincronizacion: mpConfig?.updated_at,
      },
      {
        id: 'api-rest',
        nombre: 'API REST',
        tipo: 'api',
        estado: activeKeys > 0 ? 'activa' : 'configurando',
        descripcion: activeKeys > 0
          ? `${activeKeys} clave${activeKeys === 1 ? '' : 's'} activa${activeKeys === 1 ? '' : 's'}`
          : 'Crea claves para consultar o probar datos',
        icon: Plug,
        ultimaSincronizacion: apiKeys[0]?.ultima_utilizacion || apiKeys[0]?.fecha_creacion,
      },
      ...customCards,
    ];
  }, [apiKeys, cfeConfig, customConfigs, dgiConfig, eventStats, eventos, mpConfig]);

  const timeline = useMemo<TimelineItem[]>(() => {
    const eventItems: TimelineItem[] = eventos.map(evento => {
      const payload = evento.payload as ExternalEventPayload;
      const paymentMethod = String(payload.order?.payment_method || '').toLowerCase();
      const integrationId = paymentMethod.includes('mercado') ? 'mercadopago' : 'webhooks';
      return {
        id: `evento-${evento.id}`,
        integrationId,
        source: 'Webhook',
        event: evento.tipo_evento,
        result: evento.error ? 'ERROR' : evento.procesado ? 'EXITO' : 'PENDIENTE',
        message: evento.error || evento.factura_id || 'Evento recibido',
        date: evento.created_at,
        body: evento.payload,
        raw: evento,
        eventoExterno: evento,
      };
    });

    const logItems: TimelineItem[] = logs.map(log => {
      const signature = `${log.evento || ''} ${log.url || ''} ${log.tipo_operacion || ''}`.toLowerCase();
      const integrationId = signature.includes('dgi')
        ? 'dgi'
        : signature.includes('mercado') || signature.includes('mp')
          ? 'mercadopago'
          : signature.includes('webhook')
            ? 'webhooks'
            : 'api-rest';

      return {
        id: `log-${log.id}`,
        integrationId,
        source: log.tipo_operacion,
        event: log.evento || log.url || 'api',
        result: log.resultado || 'PENDIENTE',
        message: log.mensaje_error || log.response_body || 'Log de integracion',
        statusCode: log.status_code,
        date: log.fecha_creacion,
        body: {
          request: log.request_body,
          response: log.response_body,
          headers: log.headers,
          metadata: log.metadata,
        },
        raw: log,
      };
    });

    return [...eventItems, ...logItems]
      .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
  }, [eventos, logs]);

  const filteredTimeline = useMemo(() => {
    if (logFilter === 'todas') return timeline;
    return timeline.filter(item => item.integrationId === logFilter);
  }, [logFilter, timeline]);

  const openApiSpec = useMemo(() => ({
    openapi: '3.0.3',
    info: {
      title: 'ContaEmpresa API',
      version: '1.0.0',
      description: 'Ejemplos de endpoints disponibles para integraciones externas.',
    },
    servers: [{ url: `${supabaseUrl}/functions/v1` }],
    paths: Object.fromEntries(apiEndpoints.map(endpoint => [
      `/${endpoint.functionName}`,
      {
        post: {
          summary: endpoint.title,
          description: endpoint.description,
          security: endpoint.auth === 'webhook'
            ? [{ webhookSecret: [] }]
            : [{ supabaseAnon: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                example: endpoint.requestExample(empresaActual?.id || emptyUuid, usuario?.id),
              },
            },
          },
          responses: {
            '200': {
              description: 'Respuesta exitosa',
              content: {
                'application/json': {
                  example: endpoint.responseExample,
                },
              },
            },
          },
        },
      },
    ])),
    components: {
      securitySchemes: {
        webhookSecret: {
          type: 'apiKey',
          in: 'header',
          name: 'X-Webhook-Secret',
        },
        supabaseAnon: {
          type: 'http',
          scheme: 'bearer',
        },
      },
    },
  }), [apiEndpoints, empresaActual?.id, usuario?.id]);

  const setTransientSuccess = (message: string) => {
    setSuccess(message);
    window.setTimeout(() => setSuccess(null), 2500);
  };

  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyState(key);
      window.setTimeout(() => setCopyState(null), 1800);
    } catch (err) {
      console.error('Error al copiar:', err);
      setError('No se pudo copiar al portapapeles');
    }
  };

  const downloadText = (filename: string, content: string, type = 'application/json') => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const openConfig = (integracion: IntegracionUi) => {
    setSelectedIntegration(integracion);
    setTestResponse('');
    setGeneratedApiKey('');

    if (integracion.customConfig) {
      setCustomDraft({
        ...integracion.customConfig,
        configuracion: integracion.customConfig.configuracion || {},
        headers: integracion.customConfig.headers || {},
      });
      setModalKind('custom');
      return;
    }

    setModalKind(integracion.id as ModalKind);
  };

  const openNewIntegration = () => {
    if (!empresaActual) return;
    setSelectedIntegration(null);
    setCustomDraft(createEmptyIntegration(empresaActual.id, usuario?.id));
    setModalKind('new');
  };

  const saveDgiConfig = async () => {
    if (!empresaActual) return;
    setSaving(true);
    setError(null);
    try {
      const estados = dgiDraft.enviar_solo_si_estado
        .split(',')
        .map(item => item.trim())
        .filter(Boolean);

      await integracionesSupabaseService.saveAutoSendDGI({
        empresa_id: empresaActual.id,
        auto_send_enabled: dgiDraft.auto_send_enabled,
        enviar_solo_si_estado: estados,
      });

      await loadData();
      setTransientSuccess('Configuracion DGI guardada');
      setModalKind(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar DGI');
    } finally {
      setSaving(false);
    }
  };

  const saveMpConfig = async () => {
    if (!empresaActual) return;
    setSaving(true);
    setError(null);
    try {
      const porcentaje = Number(mpDraft.porcentaje);
      if (!Number.isFinite(porcentaje) || porcentaje < 0 || porcentaje > 99) {
        throw new Error('El porcentaje debe estar entre 0 y 99');
      }

      await integracionesSupabaseService.saveComisionMP({
        empresa_id: empresaActual.id,
        activo: mpDraft.activo,
        porcentaje,
        descripcion: mpDraft.descripcion,
      });

      await loadData();
      setTransientSuccess('Configuracion MercadoPago guardada');
      setModalKind(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar MercadoPago');
    } finally {
      setSaving(false);
    }
  };

  const saveCustomIntegration = async () => {
    if (!empresaActual) return;
    setSaving(true);
    setError(null);
    try {
      if (!customDraft.nombre.trim()) throw new Error('El nombre es requerido');
      if (!customDraft.proveedor.trim()) throw new Error('El proveedor es requerido');
      if (!customDraft.url_base.trim()) throw new Error('La URL base es requerida');

      await integracionesSupabaseService.saveIntegracion({
        ...customDraft,
        empresa_id: empresaActual.id,
        creado_por: customDraft.creado_por || usuario?.id,
      });

      await loadData();
      setTransientSuccess('Integracion guardada');
      setModalKind(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la integracion');
    } finally {
      setSaving(false);
    }
  };

  const toggleCustomIntegration = async (config: IntegracionConfig) => {
    if (!config.id) return;
    setSaving(true);
    setError(null);
    try {
      await integracionesSupabaseService.setIntegracionActiva(config.id, config.activo === false);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cambiar el estado');
    } finally {
      setSaving(false);
    }
  };

  const createApiKey = async () => {
    if (!empresaActual) return;
    setSaving(true);
    setError(null);
    try {
      const plainKey = generateApiKey();
      const keyHash = await sha256Hex(plainKey);
      const created = await integracionesSupabaseService.createApiKey({
        empresa_id: empresaActual.id,
        nombre: apiKeyDraft.nombre || 'Integracion externa',
        descripcion: apiKeyDraft.descripcion,
        key_hash: keyHash,
        prefijo: plainKey.slice(0, 16),
        permisos: apiKeyDraft.permisos,
        ip_whitelist: [],
        rate_limit: Number(apiKeyDraft.rate_limit) || 100,
        rate_limit_periodo: apiKeyDraft.rate_limit_periodo,
        fecha_expiracion: apiKeyDraft.fecha_expiracion || undefined,
        activo: true,
        creado_por: usuario?.id,
      });

      setGeneratedApiKey(plainKey);
      setApiKeys(prev => [created, ...prev]);
      setTransientSuccess('API key creada');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la API key');
    } finally {
      setSaving(false);
    }
  };

  const toggleApiKey = async (key: ApiKeyConfig) => {
    if (!key.id) return;
    setSaving(true);
    setError(null);
    try {
      await integracionesSupabaseService.setApiKeyActiva(key.id, key.activo === false);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cambiar la API key');
    } finally {
      setSaving(false);
    }
  };

  const sendTestWebhook = async () => {
    if (!empresaActual) return;
    const parsed = parseJson(webhookBody);
    if (parsed.error) {
      setTestResponse(`JSON invalido: ${parsed.error}`);
      return;
    }

    setSaving(true);
    setTestResponse('Enviando...');
    const started = performance.now();

    try {
      const requestPayload = withSelectedCompany(parsed.data, empresaActual.id);
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: buildFunctionHeaders(),
        body: JSON.stringify(requestPayload),
      });
      const text = await response.text();
      const elapsed = Math.round(performance.now() - started);
      setTestResponse(`${response.status} ${response.statusText}\n${text}`);

      await integracionesSupabaseService.registrarLog({
        empresa_id: empresaActual.id,
        tipo_operacion: 'WEBHOOK_SENT',
        metodo: 'POST',
        url: webhookUrl,
        request_body: stringifyJson(requestPayload),
        response_body: text,
        status_code: response.status,
        tiempo_respuesta_ms: elapsed,
        evento: 'webhooks-orders:test',
        resultado: response.ok ? 'EXITO' : 'ERROR',
        mensaje_error: response.ok ? undefined : text.slice(0, 500),
      });

      await loadData();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setTestResponse(message);
    } finally {
      setSaving(false);
    }
  };

  const executeEndpoint = async () => {
    if (!empresaActual || !selectedEndpoint) return;
    const parsed = parseJson(apiBody);
    if (parsed.error) {
      setApiResponse(`JSON invalido: ${parsed.error}`);
      return;
    }

    setSaving(true);
    setApiResponse('Ejecutando...');
    const started = performance.now();
    const endpointUrl = `${supabaseUrl}/functions/v1/${selectedEndpoint.functionName}`;

    try {
      const requestPayload = selectedEndpoint.auth === 'webhook'
        ? withSelectedCompany(parsed.data, empresaActual.id)
        : parsed.data;

      const response = await fetch(endpointUrl, {
        method: selectedEndpoint.method,
        headers: buildFunctionHeaders(),
        body: JSON.stringify(requestPayload),
      });
      const text = await response.text();
      const elapsed = Math.round(performance.now() - started);
      setApiResponse(`${response.status} ${response.statusText}\n${text}`);

      await integracionesSupabaseService.registrarLog({
        empresa_id: empresaActual.id,
        tipo_operacion: 'API_REQUEST',
        metodo: selectedEndpoint.method,
        url: endpointUrl,
        request_body: stringifyJson(requestPayload),
        response_body: text,
        status_code: response.status,
        tiempo_respuesta_ms: elapsed,
        evento: selectedEndpoint.id,
        resultado: response.ok ? 'EXITO' : 'ERROR',
        mensaje_error: response.ok ? undefined : text.slice(0, 500),
      });

      await loadData();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setApiResponse(message);
    } finally {
      setSaving(false);
    }
  };

  const retryEvent = async (item: TimelineItem) => {
    if (!item.eventoExterno) return;
    setSaving(true);
    setError(null);
    try {
      await reintentarEvento(item.eventoExterno.id);
      await loadData();
      setTransientSuccess('Evento reintentado');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo reintentar el evento');
    } finally {
      setSaving(false);
    }
  };

  const copyCurlForEndpoint = (endpoint: ApiEndpoint, body: string) => {
    const endpointUrl = `${supabaseUrl}/functions/v1/${endpoint.functionName}`;
    const headerLines = [
      '  -H "Content-Type: application/json"',
      ...(anonKey
        ? [
          `  -H "Authorization: Bearer ${anonKey}"`,
          `  -H "apikey: ${anonKey}"`,
        ]
        : []),
    ];
    const escapedBody = endpoint.auth === 'webhook'
      ? stringifyJson(withSelectedCompany(parseJson(body).data || {}, empresaActual.id)).replace(/'/g, "'\\''")
      : body.replace(/'/g, "'\\''");
    const curl = [
      `curl -X ${endpoint.method} ${endpointUrl} \\`,
      ...headerLines.map(line => `${line} \\`),
      `  -d '${escapedBody}'`,
    ].join('\n');
    copyToClipboard(curl, `curl-${endpoint.id}`);
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
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Integraciones</h1>
          <p className="text-gray-600 mt-1">
            Consola de conectores, webhooks, logs y pruebas de API.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={loadData}
            disabled={loading || saving}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
          <button
            onClick={openNewIntegration}
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            <Plug className="h-4 w-4" />
            Nueva Integracion
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {success && (
        <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
          <p>{success}</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Metric label="Total" value={integraciones.length} tone="text-gray-900" />
        <Metric label="Activas" value={integraciones.filter(i => i.estado === 'activa').length} tone="text-green-600" />
        <Metric label="Configurando" value={integraciones.filter(i => i.estado === 'configurando').length} tone="text-yellow-600" />
        <Metric label="Errores" value={timeline.filter(item => item.result === 'ERROR').length} tone="text-red-600" />
      </div>

      <div className="border-b border-gray-200">
        <nav className="flex flex-wrap gap-1">
          {[
            { id: 'resumen', label: 'Conectores', icon: Plug },
            { id: 'logs', label: 'Logs', icon: Activity },
            { id: 'api', label: 'API Explorer', icon: Code2 },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as ActiveTab)}
              className={`inline-flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-500">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Cargando integraciones...
        </div>
      ) : (
        <>
          {activeTab === 'resumen' && (
            <ResumenTab
              integraciones={integraciones}
              webhookUrl={webhookUrl}
              webhookSecret={webhookSecret}
              showSecret={showSecret}
              setShowSecret={setShowSecret}
              copyState={copyState}
              copyToClipboard={copyToClipboard}
              empresaId={empresaActual.id}
              eventStats={eventStats}
              cfeConfig={cfeConfig}
              apiKeys={apiKeys}
              onConfig={openConfig}
              onLogs={(id) => {
                setLogFilter(id);
                setActiveTab('logs');
              }}
              onToggleCustom={toggleCustomIntegration}
              saving={saving}
            />
          )}

          {activeTab === 'logs' && (
            <LogsTab
              timeline={filteredTimeline}
              integraciones={integraciones}
              logFilter={logFilter}
              setLogFilter={setLogFilter}
              onDetail={setSelectedLog}
              onRetry={retryEvent}
              saving={saving}
            />
          )}

          {activeTab === 'api' && (
            <ApiExplorerTab
              apiEndpoints={apiEndpoints}
              selectedEndpoint={selectedEndpoint}
              selectedEndpointId={selectedEndpointId}
              setSelectedEndpointId={setSelectedEndpointId}
              apiBody={apiBody}
              setApiBody={setApiBody}
              apiResponse={apiResponse}
              openApiSpec={openApiSpec}
              onExecute={executeEndpoint}
              onCopyCurl={copyCurlForEndpoint}
              onCopy={copyToClipboard}
              onDownload={downloadText}
              copyState={copyState}
              saving={saving}
            />
          )}
        </>
      )}

      {modalKind && (
        <ConfigModal
          kind={modalKind}
          selectedIntegration={selectedIntegration}
          onClose={() => setModalKind(null)}
          webhookUrl={webhookUrl}
          webhookSecret={webhookSecret}
          showSecret={showSecret}
          setShowSecret={setShowSecret}
          copyState={copyState}
          copyToClipboard={copyToClipboard}
          empresaId={empresaActual.id}
          webhookBody={webhookBody}
          setWebhookBody={setWebhookBody}
          sendTestWebhook={sendTestWebhook}
          testResponse={testResponse}
          dgiDraft={dgiDraft}
          setDgiDraft={setDgiDraft}
          saveDgiConfig={saveDgiConfig}
          cfeConfig={cfeConfig}
          mpDraft={mpDraft}
          setMpDraft={setMpDraft}
          saveMpConfig={saveMpConfig}
          apiKeyDraft={apiKeyDraft}
          setApiKeyDraft={setApiKeyDraft}
          apiKeys={apiKeys}
          generatedApiKey={generatedApiKey}
          createApiKey={createApiKey}
          toggleApiKey={toggleApiKey}
          customDraft={customDraft}
          setCustomDraft={setCustomDraft}
          saveCustomIntegration={saveCustomIntegration}
          saving={saving}
        />
      )}

      {selectedLog && (
        <JsonModal
          title={`${selectedLog.source} - ${selectedLog.event}`}
          value={selectedLog.raw}
          onClose={() => setSelectedLog(null)}
        />
      )}
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200">
      <div className="text-sm text-gray-600">{label}</div>
      <div className={`text-2xl font-bold mt-1 ${tone}`}>{value}</div>
    </div>
  );
}

interface ResumenProps {
  integraciones: IntegracionUi[];
  webhookUrl: string;
  webhookSecret: string;
  showSecret: boolean;
  setShowSecret: (value: boolean) => void;
  copyState: string | null;
  copyToClipboard: (text: string, key: string) => void;
  empresaId: string;
  eventStats: EventStats | null;
  cfeConfig: EmpresaConfigCFE | null;
  apiKeys: ApiKeyConfig[];
  onConfig: (integracion: IntegracionUi) => void;
  onLogs: (integrationId: string) => void;
  onToggleCustom: (config: IntegracionConfig) => void;
  saving: boolean;
}

function ResumenTab({
  integraciones,
  webhookUrl,
  webhookSecret,
  showSecret,
  setShowSecret,
  copyState,
  copyToClipboard,
  empresaId,
  eventStats,
  cfeConfig,
  apiKeys,
  onConfig,
  onLogs,
  onToggleCustom,
  saving,
}: ResumenProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {integraciones.map(integracion => {
          const Icon = integracion.icon;
          return (
            <div key={integracion.id} className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{integracion.nombre}</h3>
                    <p className="text-sm text-gray-500 mt-1">{integracion.descripcion}</p>
                  </div>
                </div>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getBadgeClass(integracion.estado)}`}>
                  {integracion.estado}
                </span>
              </div>

              {integracion.ultimaSincronizacion && (
                <div className="mt-4 border-t border-gray-200 pt-4 text-xs text-gray-500">
                  Ultima sincronizacion: {formatDate(integracion.ultimaSincronizacion)}
                </div>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={() => onConfig(integracion)}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-50 px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-100"
                >
                  <Settings className="h-4 w-4" />
                  Configurar
                </button>
                <button
                  onClick={() => onLogs(integracion.id === 'custom-' ? 'api-rest' : integracion.id)}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  <Activity className="h-4 w-4" />
                  Ver Logs
                </button>
                {integracion.customConfig && (
                  <button
                    onClick={() => onToggleCustom(integracion.customConfig!)}
                    disabled={saving}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    {integracion.customConfig.activo === false ? 'Activar' : 'Pausar'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Informacion de Webhooks</h2>
          <div className="space-y-4">
            <ReadOnlyField
              label="ID de Empresa"
              value={empresaId}
              copyKey="empresa"
              copyState={copyState}
              onCopy={copyToClipboard}
              helper="Usalo como empresa_id en las llamadas externas."
            />
            <ReadOnlyField
              label="URL del Webhook"
              value={webhookUrl}
              copyKey="webhook-url"
              copyState={copyState}
              onCopy={copyToClipboard}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Webhook Secret</label>
              <div className="flex gap-2">
                <input
                  type={showSecret ? 'text' : 'password'}
                  value={showSecret ? webhookSecret : '***************'}
                  readOnly
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 text-sm"
                />
                <button
                  onClick={() => setShowSecret(!showSecret)}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  {showSecret ? 'Ocultar' : 'Ver'}
                </button>
                {showSecret && (
                  <button
                    onClick={() => copyToClipboard(webhookSecret, 'secret')}
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
                  >
                    <Copy className="h-4 w-4" />
                    {copyState === 'secret' ? 'Copiado' : 'Copiar'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Estado Operativo</h2>
          <div className="space-y-4 text-sm">
            <StatusRow label="Eventos totales" value={eventStats?.total ?? 0} />
            <StatusRow label="Procesados" value={eventStats?.procesados ?? 0} tone="text-green-700" />
            <StatusRow label="Pendientes" value={eventStats?.pendientes ?? 0} tone="text-yellow-700" />
            <StatusRow label="Errores" value={eventStats?.errores ?? 0} tone="text-red-700" />
            <StatusRow label="Config CFE" value={cfeConfig ? `${cfeConfig.ambiente || 'testing'}` : 'No configurada'} />
            <StatusRow label="API keys activas" value={apiKeys.filter(key => key.activo !== false).length} />
          </div>
        </div>
      </div>
    </div>
  );
}

function ReadOnlyField({
  label,
  value,
  helper,
  copyKey,
  copyState,
  onCopy,
}: {
  label: string;
  value: string;
  helper?: string;
  copyKey: string;
  copyState: string | null;
  onCopy: (text: string, key: string) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          readOnly
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 text-sm font-mono"
        />
        <button
          onClick={() => onCopy(value, copyKey)}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
        >
          <Copy className="h-4 w-4" />
          {copyState === copyKey ? 'Copiado' : 'Copiar'}
        </button>
      </div>
      {helper && <p className="text-xs text-gray-500 mt-1">{helper}</p>}
    </div>
  );
}

function StatusRow({ label, value, tone = 'text-gray-900' }: { label: string; value: React.ReactNode; tone?: string }) {
  return (
    <div className="flex items-center justify-between border-b border-gray-100 pb-2 last:border-0">
      <span className="text-gray-600">{label}</span>
      <span className={`font-semibold ${tone}`}>{value}</span>
    </div>
  );
}

interface LogsTabProps {
  timeline: TimelineItem[];
  integraciones: IntegracionUi[];
  logFilter: string;
  setLogFilter: (value: string) => void;
  onDetail: (item: TimelineItem) => void;
  onRetry: (item: TimelineItem) => void;
  saving: boolean;
}

function LogsTab({ timeline, integraciones, logFilter, setLogFilter, onDetail, onRetry, saving }: LogsTabProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="flex flex-col gap-3 border-b border-gray-200 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Logs de Integracion</h2>
          <p className="text-sm text-gray-500">Eventos externos, pruebas del explorer y respuestas de API.</p>
        </div>
        <select
          value={logFilter}
          onChange={(event) => setLogFilter(event.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="todas">Todas</option>
          {integraciones.map(item => (
            <option key={item.id} value={item.id}>{item.nombre}</option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Fecha</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Origen</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Evento</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Resultado</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Mensaje</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {timeline.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-500">
                  No hay logs para el filtro seleccionado.
                </td>
              </tr>
            ) : (
              timeline.map(item => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">{formatDate(item.date)}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{item.source}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{item.event}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getResultClass(item.result)}`}>
                      {item.result}
                    </span>
                  </td>
                  <td className="max-w-md truncate px-4 py-3 text-sm text-gray-600">{item.message}</td>
                  <td className="px-4 py-3 text-right text-sm">
                    <div className="inline-flex items-center gap-2">
                      {item.eventoExterno && item.result !== 'EXITO' && (
                        <button
                          onClick={() => onRetry(item)}
                          disabled={saving}
                          className="rounded-md border border-gray-300 px-3 py-1.5 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                        >
                          Reintentar
                        </button>
                      )}
                      <button
                        onClick={() => onDetail(item)}
                        className="rounded-md bg-blue-50 px-3 py-1.5 text-blue-700 hover:bg-blue-100"
                      >
                        Detalle
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface ApiExplorerProps {
  apiEndpoints: ApiEndpoint[];
  selectedEndpoint: ApiEndpoint;
  selectedEndpointId: string;
  setSelectedEndpointId: (value: string) => void;
  apiBody: string;
  setApiBody: (value: string) => void;
  apiResponse: string;
  openApiSpec: unknown;
  onExecute: () => void;
  onCopyCurl: (endpoint: ApiEndpoint, body: string) => void;
  onCopy: (text: string, key: string) => void;
  onDownload: (filename: string, content: string, type?: string) => void;
  copyState: string | null;
  saving: boolean;
}

function ApiExplorerTab({
  apiEndpoints,
  selectedEndpoint,
  selectedEndpointId,
  setSelectedEndpointId,
  apiBody,
  setApiBody,
  apiResponse,
  openApiSpec,
  onExecute,
  onCopyCurl,
  onCopy,
  onDownload,
  copyState,
  saving,
}: ApiExplorerProps) {
  const openApiText = stringifyJson(openApiSpec);

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[360px_1fr]">
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="border-b border-gray-200 p-4">
          <h2 className="text-lg font-semibold text-gray-900">Endpoints</h2>
          <p className="text-sm text-gray-500">Catalogo estilo OpenAPI para probar funciones.</p>
        </div>
        <div className="divide-y divide-gray-100">
          {apiEndpoints.map(endpoint => (
            <button
              key={endpoint.id}
              onClick={() => setSelectedEndpointId(endpoint.id)}
              className={`w-full p-4 text-left hover:bg-gray-50 ${
                selectedEndpointId === endpoint.id ? 'bg-blue-50' : ''
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-bold text-green-700">
                  {endpoint.method}
                </span>
                <span className="font-medium text-gray-900">{endpoint.title}</span>
              </div>
              <p className="mt-1 truncate font-mono text-xs text-gray-500">/functions/v1/{endpoint.functionName}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-bold text-green-700">
                  {selectedEndpoint.method}
                </span>
                <h2 className="text-xl font-semibold text-gray-900">{selectedEndpoint.title}</h2>
              </div>
              <p className="mt-2 text-sm text-gray-600">{selectedEndpoint.description}</p>
              <p className="mt-2 font-mono text-sm text-gray-500">
                {supabaseUrl}/functions/v1/{selectedEndpoint.functionName}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => onCopyCurl(selectedEndpoint, apiBody)}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <Terminal className="h-4 w-4" />
                {copyState === `curl-${selectedEndpoint.id}` ? 'Copiado' : 'Copiar cURL'}
              </button>
              <button
                onClick={() => onCopy(openApiText, 'openapi')}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <Clipboard className="h-4 w-4" />
                {copyState === 'openapi' ? 'Copiado' : 'Copiar OpenAPI'}
              </button>
              <button
                onClick={() => onDownload('contaempresa-openapi.json', openApiText)}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <Download className="h-4 w-4" />
                Descargar
              </button>
            </div>
          </div>

          {selectedEndpoint.warning && (
            <div className="mt-4 flex items-start gap-3 rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
              <AlertTriangle className="h-5 w-5 flex-shrink-0" />
              <span>{selectedEndpoint.warning}</span>
            </div>
          )}

          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm font-semibold text-gray-900">Request JSON</label>
                <button
                  onClick={() => setApiBody(stringifyJson(selectedEndpoint.requestExample('', '')))}
                  className="text-xs text-blue-600 hover:text-blue-700"
                >
                  Restaurar ejemplo
                </button>
              </div>
              <textarea
                value={apiBody}
                onChange={(event) => setApiBody(event.target.value)}
                rows={18}
                spellCheck={false}
                className={codeTextareaClassName}
                style={codeTextareaStyle}
              />
              <button
                onClick={onExecute}
                disabled={saving}
                className="mt-3 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Ejecutar prueba
              </button>
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-900">Response</label>
              <pre className="min-h-[434px] overflow-auto rounded-lg border border-gray-300 bg-gray-950 p-3 text-xs text-gray-100">
                {apiResponse || stringifyJson(selectedEndpoint.responseExample)}
              </pre>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="mb-3 flex items-center gap-2">
            <FileJson className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">OpenAPI JSON</h2>
          </div>
          <pre className="max-h-80 overflow-auto rounded-lg bg-gray-950 p-3 text-xs text-gray-100">
            {openApiText}
          </pre>
        </div>
      </div>
    </div>
  );
}

interface ConfigModalProps {
  kind: ModalKind;
  selectedIntegration: IntegracionUi | null;
  onClose: () => void;
  webhookUrl: string;
  webhookSecret: string;
  showSecret: boolean;
  setShowSecret: (value: boolean) => void;
  copyState: string | null;
  copyToClipboard: (text: string, key: string) => void;
  empresaId: string;
  webhookBody: string;
  setWebhookBody: (value: string) => void;
  sendTestWebhook: () => void;
  testResponse: string;
  dgiDraft: { auto_send_enabled: boolean; enviar_solo_si_estado: string };
  setDgiDraft: React.Dispatch<React.SetStateAction<{ auto_send_enabled: boolean; enviar_solo_si_estado: string }>>;
  saveDgiConfig: () => void;
  cfeConfig: EmpresaConfigCFE | null;
  mpDraft: { activo: boolean; porcentaje: string; descripcion: string };
  setMpDraft: React.Dispatch<React.SetStateAction<{ activo: boolean; porcentaje: string; descripcion: string }>>;
  saveMpConfig: () => void;
  apiKeyDraft: {
    nombre: string;
    descripcion: string;
    permisos: string[];
    rate_limit: string;
    rate_limit_periodo: ApiKeyConfig['rate_limit_periodo'];
    fecha_expiracion: string;
  };
  setApiKeyDraft: React.Dispatch<React.SetStateAction<{
    nombre: string;
    descripcion: string;
    permisos: string[];
    rate_limit: string;
    rate_limit_periodo: ApiKeyConfig['rate_limit_periodo'];
    fecha_expiracion: string;
  }>>;
  apiKeys: ApiKeyConfig[];
  generatedApiKey: string;
  createApiKey: () => void;
  toggleApiKey: (key: ApiKeyConfig) => void;
  customDraft: IntegracionConfig;
  setCustomDraft: React.Dispatch<React.SetStateAction<IntegracionConfig>>;
  saveCustomIntegration: () => void;
  saving: boolean;
}

function ConfigModal(props: ConfigModalProps) {
  const {
    kind,
    selectedIntegration,
    onClose,
    webhookUrl,
    webhookSecret,
    showSecret,
    setShowSecret,
    copyState,
    copyToClipboard,
    empresaId,
    webhookBody,
    setWebhookBody,
    sendTestWebhook,
    testResponse,
    dgiDraft,
    setDgiDraft,
    saveDgiConfig,
    cfeConfig,
    mpDraft,
    setMpDraft,
    saveMpConfig,
    apiKeyDraft,
    setApiKeyDraft,
    apiKeys,
    generatedApiKey,
    createApiKey,
    toggleApiKey,
    customDraft,
    setCustomDraft,
    saveCustomIntegration,
    saving,
  } = props;

  const title = kind === 'new'
    ? 'Nueva Integracion'
    : selectedIntegration?.nombre || 'Configuracion';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-lg bg-white shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
            <p className="text-sm text-gray-500">Empresa: {empresaId}</p>
          </div>
          <button onClick={onClose} className="rounded-md p-2 text-gray-500 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          {kind === 'webhooks' && (
            <div className="space-y-6">
              <ReadOnlyField
                label="Endpoint"
                value={webhookUrl}
                copyKey="modal-webhook-url"
                copyState={copyState}
                onCopy={copyToClipboard}
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Secret</label>
                <div className="flex gap-2">
                  <input
                    value={showSecret ? webhookSecret : '***************'}
                    readOnly
                    className="flex-1 rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm"
                  />
                  <button
                    onClick={() => setShowSecret(!showSecret)}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    {showSecret ? 'Ocultar' : 'Ver'}
                  </button>
                  {showSecret && (
                    <button
                      onClick={() => copyToClipboard(webhookSecret, 'modal-secret')}
                      className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
                    >
                      {copyState === 'modal-secret' ? 'Copiado' : 'Copiar'}
                    </button>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-900">Payload de prueba</label>
                  <textarea
                    value={webhookBody}
                    onChange={(event) => setWebhookBody(event.target.value)}
                    rows={18}
                    spellCheck={false}
                    className={codeTextareaClassName}
                    style={codeTextareaStyle}
                  />
                  <button
                    onClick={sendTestWebhook}
                    disabled={saving}
                    className="mt-3 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Enviar prueba
                  </button>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-900">Respuesta</label>
                  <pre className="min-h-[434px] overflow-auto rounded-lg border border-gray-300 bg-gray-950 p-3 text-xs text-gray-100">
                    {testResponse || 'La respuesta aparecera aqui.'}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {kind === 'dgi' && (
            <div className="space-y-6">
              <div className="rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-gray-900">Envio automatico a DGI</h3>
                    <p className="text-sm text-gray-500">El webhook intenta enviar facturas nuevas cuando esta activo.</p>
                  </div>
                  <label className="inline-flex items-center gap-2 text-sm font-medium text-gray-700">
                    <input
                      type="checkbox"
                      checked={dgiDraft.auto_send_enabled}
                      onChange={(event) => setDgiDraft(prev => ({ ...prev, auto_send_enabled: event.target.checked }))}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600"
                    />
                    Activo
                  </label>
                </div>
                <div className="mt-4">
                  <label className="mb-1 block text-sm font-medium text-gray-700">Estados habilitados</label>
                  <input
                    value={dgiDraft.enviar_solo_si_estado}
                    onChange={(event) => setDgiDraft(prev => ({ ...prev, enviar_solo_si_estado: event.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                  <p className="mt-1 text-xs text-gray-500">Separados por coma. Ejemplo: pendiente,borrador</p>
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 p-4">
                <h3 className="font-semibold text-gray-900">Configuracion CFE detectada</h3>
                {cfeConfig ? (
                  <div className="mt-3 grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
                    <StatusRow label="RUT emisor" value={cfeConfig.rut_emisor || 'Sin dato'} />
                    <StatusRow label="Ambiente" value={cfeConfig.ambiente || 'testing'} />
                    <StatusRow label="Casa principal" value={cfeConfig.codigo_casa_principal || '-'} />
                    <StatusRow label="Sucursal" value={cfeConfig.codigo_sucursal || '-'} />
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-yellow-700">
                    No hay configuracion CFE. Revisar Administracion / Empresas antes de activar DGI.
                  </p>
                )}
              </div>

              <div className="flex justify-end">
                <button
                  onClick={saveDgiConfig}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Guardar DGI
                </button>
              </div>
            </div>
          )}

          {kind === 'mercadopago' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <label className="flex items-center gap-2 rounded-lg border border-gray-200 p-4 text-sm font-medium text-gray-700">
                  <input
                    type="checkbox"
                    checked={mpDraft.activo}
                    onChange={(event) => setMpDraft(prev => ({ ...prev, activo: event.target.checked }))}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600"
                  />
                  Calculo automatico activo
                </label>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Porcentaje</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="99"
                    value={mpDraft.porcentaje}
                    onChange={(event) => setMpDraft(prev => ({ ...prev, porcentaje: event.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Descripcion</label>
                  <input
                    value={mpDraft.descripcion}
                    onChange={(event) => setMpDraft(prev => ({ ...prev, descripcion: event.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
                Esta tasa se usa en el webhook para registrar comision MP, ingreso neto y movimientos asociados.
              </div>
              <div className="flex justify-end">
                <button
                  onClick={saveMpConfig}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Guardar MercadoPago
                </button>
              </div>
            </div>
          )}

          {kind === 'api-rest' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Nombre</label>
                  <input
                    value={apiKeyDraft.nombre}
                    onChange={(event) => setApiKeyDraft(prev => ({ ...prev, nombre: event.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Rate limit</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={apiKeyDraft.rate_limit}
                      onChange={(event) => setApiKeyDraft(prev => ({ ...prev, rate_limit: event.target.value }))}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                    <select
                      value={apiKeyDraft.rate_limit_periodo}
                      onChange={(event) => setApiKeyDraft(prev => ({
                        ...prev,
                        rate_limit_periodo: event.target.value as ApiKeyConfig['rate_limit_periodo'],
                      }))}
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    >
                      <option value="minute">minuto</option>
                      <option value="hour">hora</option>
                      <option value="day">dia</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Expira</label>
                  <input
                    type="date"
                    value={apiKeyDraft.fecha_expiracion}
                    onChange={(event) => setApiKeyDraft(prev => ({ ...prev, fecha_expiracion: event.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Descripcion</label>
                  <input
                    value={apiKeyDraft.descripcion}
                    onChange={(event) => setApiKeyDraft(prev => ({ ...prev, descripcion: event.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Permisos</label>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {apiPermissionOptions.map(permission => (
                    <label key={permission} className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={apiKeyDraft.permisos.includes(permission)}
                        onChange={(event) => {
                          setApiKeyDraft(prev => ({
                            ...prev,
                            permisos: event.target.checked
                              ? [...prev.permisos, permission]
                              : prev.permisos.filter(item => item !== permission),
                          }));
                        }}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600"
                      />
                      {permission}
                    </label>
                  ))}
                </div>
              </div>
              <button
                onClick={createApiKey}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                Crear API key
              </button>

              {generatedApiKey && (
                <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-green-900">
                    <ShieldCheck className="h-4 w-4" />
                    Clave generada. Este valor se muestra una sola vez.
                  </div>
                  <div className="flex gap-2">
                    <input
                      value={generatedApiKey}
                      readOnly
                      className="flex-1 rounded-lg border border-green-300 bg-white px-3 py-2 font-mono text-xs"
                    />
                    <button
                      onClick={() => copyToClipboard(generatedApiKey, 'generated-api-key')}
                      className="rounded-lg bg-green-700 px-4 py-2 text-sm text-white hover:bg-green-800"
                    >
                      {copyState === 'generated-api-key' ? 'Copiado' : 'Copiar'}
                    </button>
                  </div>
                </div>
              )}

              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Nombre</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Prefijo</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Uso</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Estado</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-gray-500">Accion</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {apiKeys.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">No hay claves creadas.</td>
                      </tr>
                    ) : (
                      apiKeys.map(key => (
                        <tr key={key.id}>
                          <td className="px-4 py-3 text-sm text-gray-900">{key.nombre}</td>
                          <td className="px-4 py-3 font-mono text-xs text-gray-600">{key.prefijo}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{key.total_requests || 0} requests</td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`rounded-full px-2 py-1 text-xs font-semibold ${key.activo === false ? 'bg-gray-100 text-gray-700' : 'bg-green-100 text-green-700'}`}>
                              {key.activo === false ? 'inactiva' : 'activa'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-sm">
                            <button
                              onClick={() => toggleApiKey(key)}
                              disabled={saving}
                              className="rounded-md border border-gray-300 px-3 py-1.5 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                            >
                              {key.activo === false ? 'Activar' : 'Desactivar'}
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {(kind === 'custom' || kind === 'new') && (
            <CustomIntegrationForm
              draft={customDraft}
              setDraft={setCustomDraft}
              onSave={saveCustomIntegration}
              saving={saving}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function CustomIntegrationForm({
  draft,
  setDraft,
  onSave,
  saving,
}: {
  draft: IntegracionConfig;
  setDraft: React.Dispatch<React.SetStateAction<IntegracionConfig>>;
  onSave: () => void;
  saving: boolean;
}) {
  const [headersText, setHeadersText] = useState(stringifyJson(draft.headers || {}));
  const [configText, setConfigText] = useState(stringifyJson(draft.configuracion || {}));
  const [jsonError, setJsonError] = useState<string | null>(null);

  useEffect(() => {
    setHeadersText(stringifyJson(draft.headers || {}));
    setConfigText(stringifyJson(draft.configuracion || {}));
  }, [draft.configuracion, draft.headers, draft.id]);

  const save = () => {
    const headers = parseJson(headersText);
    const config = parseJson(configText);
    if (headers.error || config.error) {
      setJsonError(headers.error || config.error);
      return;
    }
    setJsonError(null);
    setDraft(prev => ({
      ...prev,
      headers: headers.data as Record<string, string>,
      configuracion: config.data as Record<string, unknown>,
    }));
    window.setTimeout(onSave, 0);
  };

  return (
    <div className="space-y-6">
      {jsonError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{jsonError}</div>
      )}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Nombre</label>
          <input
            value={draft.nombre}
            onChange={(event) => setDraft(prev => ({ ...prev, nombre: event.target.value }))}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Proveedor</label>
          <input
            value={draft.proveedor}
            onChange={(event) => setDraft(prev => ({ ...prev, proveedor: event.target.value }))}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Tipo</label>
          <select
            value={draft.tipo}
            onChange={(event) => setDraft(prev => ({ ...prev, tipo: event.target.value as IntegracionTipo }))}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            {integrationTypeOptions.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Estado</label>
          <select
            value={draft.estado || 'activo'}
            onChange={(event) => setDraft(prev => ({
              ...prev,
              estado: event.target.value as IntegracionConfig['estado'],
              activo: event.target.value !== 'inactivo',
            }))}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="activo">activo</option>
            <option value="inactivo">inactivo</option>
            <option value="mantenimiento">mantenimiento</option>
            <option value="error">error</option>
          </select>
        </div>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">URL base</label>
        <input
          value={draft.url_base}
          onChange={(event) => setDraft(prev => ({ ...prev, url_base: event.target.value }))}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Descripcion</label>
        <textarea
          value={draft.descripcion || ''}
          onChange={(event) => setDraft(prev => ({ ...prev, descripcion: event.target.value }))}
          rows={3}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Headers JSON</label>
          <textarea
            value={headersText}
            onChange={(event) => setHeadersText(event.target.value)}
            rows={8}
            spellCheck={false}
            className={codeTextareaClassName}
            style={codeTextareaStyle}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Configuracion JSON</label>
          <textarea
            value={configText}
            onChange={(event) => setConfigText(event.target.value)}
            rows={8}
            spellCheck={false}
            className={codeTextareaClassName}
            style={codeTextareaStyle}
          />
        </div>
      </div>
      <div className="flex justify-end">
        <button
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Guardar Integracion
        </button>
      </div>
    </div>
  );
}

function JsonModal({ title, value, onClose }: { title: string; value: unknown; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="rounded-md p-2 text-gray-500 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        <pre className="max-h-[75vh] overflow-auto bg-gray-950 p-4 text-xs text-gray-100">
          {stringifyJson(value)}
        </pre>
      </div>
    </div>
  );
}
