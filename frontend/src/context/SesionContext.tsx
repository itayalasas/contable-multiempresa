import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { SesionUsuario, Usuario, Empresa, Pais, ConfiguracionSesion } from '../types';
import { useAuth } from './AuthContext';
import { EmpresasService } from '../services/empresas/empresasService';
import { PaisesService } from '../services/paises/paisesService';

interface SesionContextType {
  sesion: SesionUsuario | null;
  empresaActual: Empresa | null;
  paisActual: Pais | null;
  empresasDisponibles: Empresa[];
  cargando: boolean;
  error: string | null;
  
  // Acciones
  seleccionarEmpresa: (empresa: Empresa) => Promise<void>;
  actualizarConfiguracion: (config: Partial<ConfiguracionSesion>) => void;
  refrescarSesion: () => Promise<void>;
  
  // Utilidades
  formatearMoneda: (cantidad: number) => string;
  formatearFecha: (fecha: Date) => string;
  tienePermiso: (permiso: string) => boolean;
  tieneAccesoEmpresa: (empresaId: string) => boolean;
}

const SesionContext = createContext<SesionContextType | undefined>(undefined);

interface SesionProviderProps {
  children: ReactNode;
}

export const SesionProvider: React.FC<SesionProviderProps> = ({ children }) => {
  const { usuario, isAuthenticated } = useAuth();
  const [sesion, setSesion] = useState<SesionUsuario | null>(null);
  const [empresaActual, setEmpresaActual] = useState<Empresa | null>(null);
  const [paisActual, setPaisActual] = useState<Pais | null>(null);
  const [empresasDisponibles, setEmpresasDisponibles] = useState<Empresa[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Inicializar sesión cuando el usuario se autentica
  useEffect(() => {
    if (isAuthenticated && usuario) {
      inicializarSesion(usuario);
    } else {
      limpiarSesion();
    }
  }, [isAuthenticated, usuario]);

  const inicializarSesion = async (user: Usuario) => {
    try {
      setCargando(true);
      setError(null);

      console.log('🔄 Inicializando sesión para usuario:', user.id);

      // Cargar empresas disponibles para el usuario desde Firebase
      const empresas = await EmpresasService.getEmpresasByUsuario(user.id);
      console.log('✅ Empresas cargadas desde Firebase:', empresas.length);
      
      setEmpresasDisponibles(empresas);

      // Seleccionar empresa por defecto
      let empresaSeleccionada: Empresa | null = null;
      
      // Intentar recuperar empresa guardada en localStorage
      const empresaGuardada = localStorage.getItem('empresaActual');
      if (empresaGuardada) {
        try {
          const empresaParsed = JSON.parse(empresaGuardada);
          empresaSeleccionada = empresas.find(e => e.id === empresaParsed.id) || null;
          console.log('📱 Empresa recuperada del localStorage:', empresaSeleccionada?.nombre);
        } catch {
          localStorage.removeItem('empresaActual');
        }
      }

      // Si no hay empresa guardada o no es válida, seleccionar la primera disponible
      if (!empresaSeleccionada && empresas.length > 0) {
        empresaSeleccionada = empresas[0];
        console.log('🎯 Seleccionando primera empresa disponible:', empresaSeleccionada.nombre);
      }

      if (empresaSeleccionada) {
        await seleccionarEmpresaInterna(empresaSeleccionada);
      } else {
        console.log('⚠️ No hay empresas disponibles para el usuario');
      }

      // Crear configuración de sesión por defecto
      const configuracion: ConfiguracionSesion = {
        idioma: user.configuracion?.idioma || 'es',
        timezone: user.configuracion?.timezone || 'America/Lima',
        formatoFecha: user.configuracion?.formatoFecha || 'DD/MM/YYYY',
        formatoMoneda: user.configuracion?.formatoMoneda || 'es-PE',
        monedaDisplay: paisActual?.monedaPrincipal || 'PEN',
        decimales: 2
      };

      // Crear sesión completa
      const nuevaSesion: SesionUsuario = {
        usuario: user,
        empresaActual,
        paisActual,
        empresasDisponibles: empresas,
        permisos: user.permisos,
        configuracion
      };

      setSesion(nuevaSesion);
      console.log('✅ Sesión inicializada correctamente');
    } catch (err) {
      console.error('❌ Error inicializando sesión:', err);
      setError('Error al inicializar la sesión');
    } finally {
      setCargando(false);
    }
  };

  const seleccionarEmpresaInterna = async (empresa: Empresa) => {
    try {
      console.log('🏢 Seleccionando empresa:', empresa.nombre);
      
      // Cargar información del país
      const pais = await PaisesService.getPais(empresa.paisId);
      if (!pais) {
        throw new Error('País no encontrado');
      }

      console.log('🌍 País cargado:', pais.nombre);

      setEmpresaActual(empresa);
      setPaisActual(pais);

      // Guardar en localStorage
      localStorage.setItem('empresaActual', JSON.stringify({
        id: empresa.id,
        nombre: empresa.nombre
      }));

      // Actualizar configuración de sesión con datos del país
      if (sesion) {
        const nuevaConfiguracion: ConfiguracionSesion = {
          ...sesion.configuracion,
          monedaDisplay: pais.monedaPrincipal,
          formatoMoneda: PaisesService.getLocaleFromPais ? 
            PaisesService.getLocaleFromPais(pais.codigo) : 
            sesion.configuracion.formatoMoneda
        };

        setSesion({
          ...sesion,
          empresaActual: empresa,
          paisActual: pais,
          configuracion: nuevaConfiguracion
        });
      }
    } catch (err) {
      console.error('❌ Error seleccionando empresa:', err);
      setError('Error al seleccionar la empresa');
    }
  };

  const seleccionarEmpresa = async (empresa: Empresa) => {
    await seleccionarEmpresaInterna(empresa);
  };

  const actualizarConfiguracion = (config: Partial<ConfiguracionSesion>) => {
    if (sesion) {
      const nuevaConfiguracion = { ...sesion.configuracion, ...config };
      setSesion({ ...sesion, configuracion: nuevaConfiguracion });
      
      // Guardar en localStorage
      localStorage.setItem('configuracionSesion', JSON.stringify(nuevaConfiguracion));
    }
  };

  const refrescarSesion = async () => {
    if (usuario) {
      await inicializarSesion(usuario);
    }
  };

  const limpiarSesion = () => {
    setSesion(null);
    setEmpresaActual(null);
    setPaisActual(null);
    setEmpresasDisponibles([]);
    setCargando(false);
    setError(null);
    localStorage.removeItem('empresaActual');
    localStorage.removeItem('configuracionSesion');
  };

  // Utilidades
  const formatearMoneda = (cantidad: number): string => {
    if (!paisActual || !sesion) {
      return cantidad.toFixed(2);
    }

    return PaisesService.formatearMoneda(cantidad, paisActual.id, paisActual);
  };

  const formatearFecha = (fecha: Date): string => {
    if (!sesion) {
      return fecha.toLocaleDateString();
    }

    const opciones: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    };

    return fecha.toLocaleDateString(sesion.configuracion.formatoMoneda, opciones);
  };

  const tienePermiso = (permiso: string): boolean => {
    if (!sesion || !sesion.usuario) {
      return false;
    }

    // Super admin tiene todos los permisos
    if (sesion.usuario.rol === 'super_admin') {
      return true;
    }

    return sesion.permisos.includes(permiso) || sesion.permisos.includes('admin:all');
  };

  const tieneAccesoEmpresa = (empresaId: string): boolean => {
    if (!sesion || !sesion.usuario) {
      return false;
    }

    // En modo desarrollo, permitir acceso a todas las empresas
    return true;
  };

  const value: SesionContextType = {
    sesion,
    empresaActual,
    paisActual,
    empresasDisponibles,
    cargando,
    error,
    seleccionarEmpresa,
    actualizarConfiguracion,
    refrescarSesion,
    formatearMoneda,
    formatearFecha,
    tienePermiso,
    tieneAccesoEmpresa
  };

  return (
    <SesionContext.Provider value={value}>
      {children}
    </SesionContext.Provider>
  );
};

export const useSesion = (): SesionContextType => {
  const context = useContext(SesionContext);
  if (context === undefined) {
    throw new Error('useSesion debe ser usado dentro de un SesionProvider');
  }
  return context;
};

