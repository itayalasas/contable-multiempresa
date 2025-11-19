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
}

export const EmpresaWizard: React.FC<EmpresaWizardProps> = ({
  isOpen,
  onClose,
  onComplete,
  paisId
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<any>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [canProceed, setCanProceed] = useState(false);

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

  const { user } = useAuth();

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      console.log('Guardando empresa:', formData);

      // Convertir fecha de dd/mm/aaaa a yyyy-mm-dd
      let fechaInicioISO = null;
      if (formData.fecha_inicio_actividades) {
        const [dia, mes, anio] = formData.fecha_inicio_actividades.split('/');
        if (dia && mes && anio) {
          fechaInicioISO = `${anio}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
        }
      }

      // Preparar configuración contable básica
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

      // Insertar empresa en Supabase
      const { data: nuevaEmpresa, error } = await supabase
        .from('empresas')
        .insert({
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
          moneda_principal: 'UYU',
          activa: true,
          usuarios_asignados: user?.uid ? [user.uid] : [],
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
          <h2 className="text-2xl font-bold text-gray-900">Nueva Empresa</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
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
          {steps[currentStep].component}
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
                  Guardando...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Crear Empresa
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Placeholder components (se crearán posteriormente)
const StepConfigFiscal: React.FC<any> = ({ data, onChange, paisId }) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Configuración Fiscal</h3>
      <p className="text-gray-600">Este paso se implementará en la próxima iteración.</p>
      <p className="text-sm text-gray-500">Incluirá: Responsabilidad IVA, Número BPS, Número MTSS, Régimen tributario, etc.</p>
    </div>
  );
};

const StepConfigCFE: React.FC<any> = ({ data, onChange, paisId }) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Facturación Electrónica (CFE)</h3>
      <p className="text-gray-600">Este paso se implementará en la próxima iteración.</p>
      <p className="text-sm text-gray-500">Incluirá: Certificado digital, Series de documentos, Configuración DGI, etc.</p>
    </div>
  );
};

const StepConfigBPS: React.FC<any> = ({ data, onChange }) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Nómina (BPS)</h3>
      <p className="text-gray-600">Este paso se implementará en la próxima iteración.</p>
      <p className="text-sm text-gray-500">Incluirá: Número BPS, Clase/Subclase, Seguro de accidentes, Responsable técnico, etc.</p>
    </div>
  );
};

const StepActividades: React.FC<any> = ({ data, onChange, paisId }) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Actividades Económicas</h3>
      <p className="text-gray-600">Este paso se implementará en la próxima iteración.</p>
      <p className="text-sm text-gray-500">Incluirá: Selección de actividades DGI/CNAE, Actividad principal, Fechas de inicio/fin, etc.</p>
    </div>
  );
};

const StepResumen: React.FC<any> = ({ data }) => {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Resumen de la Empresa</h3>
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-blue-800">
          Por favor revise la información antes de crear la empresa.
        </p>
      </div>

      {data.nombre && (
        <div className="border border-gray-200 rounded-lg p-4 space-y-2">
          <h4 className="font-semibold text-gray-900">Datos Básicos</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div><span className="text-gray-600">Nombre:</span> {data.nombre}</div>
            <div><span className="text-gray-600">Razón Social:</span> {data.razon_social}</div>
            <div><span className="text-gray-600">RUT:</span> {data.numero_identificacion}</div>
            <div><span className="text-gray-600">Email:</span> {data.email}</div>
          </div>
        </div>
      )}
    </div>
  );
};
