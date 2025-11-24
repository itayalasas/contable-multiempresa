import React, { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, Check, Building2, FileText, Receipt, Users, Briefcase, MapPin } from 'lucide-react';
import { StepDatosBasicos, validateStepDatosBasicos } from './steps/StepDatosBasicos';
import { StepConfigFiscal } from './steps/StepConfigFiscal';
import { StepConfigCFE } from './steps/StepConfigCFE';
import { StepConfigBPS } from './steps/StepConfigBPS';
import { StepActividades } from './steps/StepActividades';
import { StepResumen } from './steps/StepResumen';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../context/AuthContext';

interface WizardStep {
  id: number;
  title: string;
  icon: React.ReactNode;
  component: React.ReactNode;
}

interface EmpresaWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (empresaId: string) => void;
  paisId?: string;
  mode?: 'create' | 'edit';
  empresaId?: string;
}

export const EmpresaWizard: React.FC<EmpresaWizardProps> = ({
  isOpen,
  onClose,
  onComplete,
  paisId,
  mode = 'create',
  empresaId
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<any>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [canProceed, setCanProceed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const steps: WizardStep[] = [
    {
      id: 0,
      title: 'Datos Básicos',
      icon: <Building2 className="w-5 h-5" />,
      component: <StepDatosBasicos data={formData} onChange={setFormData} paisId={paisId} />
    },
    {
      id: 1,
      title: 'Configuración Fiscal',
      icon: <FileText className="w-5 h-5" />,
      component: <StepConfigFiscal data={formData} onChange={setFormData} paisId={paisId} />
    },
    {
      id: 2,
      title: 'Facturación Electrónica',
      icon: <Receipt className="w-5 h-5" />,
      component: <StepConfigCFE data={formData} onChange={setFormData} paisId={paisId} />
    },
    {
      id: 3,
      title: 'Nómina (BPS)',
      icon: <Users className="w-5 h-5" />,
      component: <StepConfigBPS data={formData} onChange={setFormData} />
    },
    {
      id: 4,
      title: 'Actividades Económicas',
      icon: <Briefcase className="w-5 h-5" />,
      component: <StepActividades data={formData} onChange={setFormData} paisId={paisId} />
    },
    {
      id: 5,
      title: 'Resumen',
      icon: <Check className="w-5 h-5" />,
      component: <StepResumen data={formData} />
    }
  ];

  const handleNext = () => {
    if (currentStep === 0 && !validateStepDatosBasicos(formData)) {
      alert('Por favor complete todos los campos obligatorios marcados con *');
      return;
    }
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  useEffect(() => {
    if (currentStep === 0) {
      setCanProceed(validateStepDatosBasicos(formData));
    } else {
      setCanProceed(true);
    }
  }, [currentStep, formData]);

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const { usuario } = useAuth();

  // Cargar datos de empresa en modo edición
  useEffect(() => {
    const cargarEmpresa = async () => {
      if (mode === 'edit' && empresaId && isOpen) {
        try {
          setIsLoading(true);
          const { data: empresa, error } = await supabase
            .from('empresas')
            .select('*')
            .eq('id', empresaId)
            .single();

          if (error) throw error;

          if (empresa) {
            // Convertir fecha ISO a dd/mm/aaaa
            let fechaFormateada = '';
            if (empresa.fecha_inicio_actividades) {
              const fecha = new Date(empresa.fecha_inicio_actividades);
              fechaFormateada = `${fecha.getDate().toString().padStart(2, '0')}/${(fecha.getMonth() + 1).toString().padStart(2, '0')}/${fecha.getFullYear()}`;
            }

            setFormData({
              pais_id: empresa.pais_id,
              nombre: empresa.nombre,
              razon_social: empresa.razon_social,
              nombre_fantasia: empresa.nombre_fantasia || '',
              numero_identificacion: empresa.numero_identificacion,
              tipo_contribuyente_id: empresa.tipo_contribuyente_id || '',
              fecha_inicio_actividades: fechaFormateada,
              estado_tributario: empresa.estado_tributario || 'activa',
              email: empresa.email,
              telefono: empresa.telefono || '',
              ciudad: empresa.direccion || ''
            });
          }
        } catch (error) {
          console.error('Error cargando empresa:', error);
          alert('Error al cargar los datos de la empresa');
        } finally {
          setIsLoading(false);
        }
      }
    };

    cargarEmpresa();
  }, [mode, empresaId, isOpen]);

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      console.log('Guardando empresa:', formData);
      console.log('Modo:', mode);

      // Convertir fecha de dd/mm/aaaa a yyyy-mm-dd
      let fechaInicioISO = null;
      if (formData.fecha_inicio_actividades) {
        const [dia, mes, anio] = formData.fecha_inicio_actividades.split('/');
        if (dia && mes && anio) {
          fechaInicioISO = `${anio}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
        }
      }

      const empresaData = {
        nombre: formData.nombre,
        razon_social: formData.razon_social,
        nombre_fantasia: formData.nombre_fantasia || null,
        numero_identificacion: formData.numero_identificacion,
        pais_id: formData.pais_id,
        tipo_contribuyente_id: formData.tipo_contribuyente_id || null,
        fecha_inicio_actividades: fechaInicioISO,
        estado_tributario: formData.estado_tributario || 'activa',
        email: formData.email,
        telefono: formData.telefono || null,
        direccion: formData.ciudad || null,
        moneda_principal: 'UYU'
      };

      if (mode === 'edit' && empresaId) {
        // Actualizar empresa existente
        const { error } = await supabase
          .from('empresas')
          .update(empresaData)
          .eq('id', empresaId);

        if (error) {
          console.error('Error al actualizar empresa:', error);
          alert('Error al actualizar la empresa: ' + error.message);
          return;
        }

        console.log('Empresa actualizada exitosamente');
        onComplete(empresaId);
      } else {
        // Crear nueva empresa
        const configuracionContable = {
          ejercicio_fiscal: new Date().getFullYear(),
          fecha_inicio_ejercicio: `${new Date().getFullYear()}-01-01`,
          fecha_fin_ejercicio: `${new Date().getFullYear()}-12-31`,
          metodo_costeo: 'promedio',
          tipo_inventario: 'perpetuo',
          maneja_inventario: false,
          decimales_moneda: 2,
          decimales_cantidades: 2,
          numeracion_automatica: true,
          prefijo_asientos: 'ASI',
          longitud_numeracion: 6,
          regimen_tributario: 'general',
          configuracion_impuestos: []
        };

        const { data: nuevaEmpresa, error } = await supabase
          .from('empresas')
          .insert({
            ...empresaData,
            activa: true,
            usuarios_asignados: usuario?.id ? [usuario.id] : [],
            configuracion_contable: configuracionContable
          })
          .select()
          .single();

        if (error) {
          console.error('Error al crear empresa:', error);
          alert('Error al crear la empresa: ' + error.message);
          return;
        }

        console.log('Empresa creada exitosamente:', nuevaEmpresa);
        onComplete(nuevaEmpresa.id);
      }
    } catch (error: any) {
      console.error('Error guardando empresa:', error);
      alert('Error al guardar: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">
            {mode === 'edit' ? 'Editar Empresa' : 'Nueva Empresa'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isLoading}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <React.Fragment key={step.id}>
                <div className="flex items-center">
                  <div
                    className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all ${
                      index === currentStep
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : index < currentStep
                        ? 'border-green-500 bg-green-500 text-white'
                        : 'border-gray-300 bg-white text-gray-400'
                    }`}
                  >
                    {index < currentStep ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      step.icon
                    )}
                  </div>
                  <div className="ml-3 hidden md:block">
                    <p
                      className={`text-sm font-medium ${
                        index === currentStep
                          ? 'text-blue-600'
                          : index < currentStep
                          ? 'text-green-600'
                          : 'text-gray-500'
                      }`}
                    >
                      {step.title}
                    </p>
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-2 ${
                      index < currentStep ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-gray-600">Cargando datos de la empresa...</p>
              </div>
            </div>
          ) : (
            steps[currentStep].component
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Anterior
          </button>

          <div className="text-sm text-gray-600">
            Paso {currentStep + 1} de {steps.length}
          </div>

          {currentStep < steps.length - 1 ? (
            <button
              onClick={handleNext}
              disabled={currentStep === 0 && !canProceed}
              className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              Siguiente
              <ChevronRight className="w-4 h-4 ml-2" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex items-center px-6 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  {mode === 'edit' ? 'Actualizando...' : 'Guardando...'}
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  {mode === 'edit' ? 'Actualizar Empresa' : 'Crear Empresa'}
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
