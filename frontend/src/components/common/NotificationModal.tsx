import React, { useEffect } from 'react';
import { CheckCircle, AlertTriangle, XCircle, Info, X } from 'lucide-react';

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  autoClose?: boolean;
  autoCloseDelay?: number;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({
  isOpen,
  onClose,
  title,
  message,
  type = 'info',
  autoClose = true,
  autoCloseDelay = 3000
}) => {
  useEffect(() => {
    if (isOpen && autoClose) {
      const timer = setTimeout(() => {
        onClose();
      }, autoCloseDelay);

      return () => clearTimeout(timer);
    }
  }, [isOpen, autoClose, autoCloseDelay, onClose]);

  if (!isOpen) return null;

  const getTypeConfig = () => {
    switch (type) {
      case 'success':
        return {
          icon: CheckCircle,
          iconBg: 'bg-green-100',
          iconColor: 'text-green-600',
          borderColor: 'border-green-200',
          bgColor: 'bg-green-50',
          titleColor: 'text-green-900',
          messageColor: 'text-green-700'
        };
      case 'error':
        return {
          icon: XCircle,
          iconBg: 'bg-red-100',
          iconColor: 'text-red-600',
          borderColor: 'border-red-200',
          bgColor: 'bg-red-50',
          titleColor: 'text-red-900',
          messageColor: 'text-red-700'
        };
      case 'warning':
        return {
          icon: AlertTriangle,
          iconBg: 'bg-yellow-100',
          iconColor: 'text-yellow-600',
          borderColor: 'border-yellow-200',
          bgColor: 'bg-yellow-50',
          titleColor: 'text-yellow-900',
          messageColor: 'text-yellow-700'
        };
      default:
        return {
          icon: Info,
          iconBg: 'bg-blue-100',
          iconColor: 'text-blue-600',
          borderColor: 'border-blue-200',
          bgColor: 'bg-blue-50',
          titleColor: 'text-blue-900',
          messageColor: 'text-blue-700'
        };
    }
  };

  const config = getTypeConfig();
  const Icon = config.icon;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`bg-white rounded-2xl shadow-2xl w-full max-w-md transform transition-all border-2 ${config.borderColor}`}>
        {/* Content */}
        <div className={`p-6 rounded-2xl ${config.bgColor}`}>
          <div className="flex items-start space-x-4">
            <div className={`flex-shrink-0 w-12 h-12 rounded-full ${config.iconBg} flex items-center justify-center`}>
              <Icon className={`h-6 w-6 ${config.iconColor}`} />
            </div>
            <div className="flex-1">
              <h3 className={`text-lg font-semibold ${config.titleColor} mb-2`}>
                {title}
              </h3>
              <p className={`${config.messageColor} text-sm leading-relaxed`}>
                {message}
              </p>
            </div>
            <button
              onClick={onClose}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Progress bar for auto-close */}
          {autoClose && (
            <div className="mt-4">
              <div className="w-full bg-white bg-opacity-50 rounded-full h-1">
                <div 
                  className={`h-1 rounded-full transition-all ease-linear ${
                    type === 'success' ? 'bg-green-500' :
                    type === 'error' ? 'bg-red-500' :
                    type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
                  }`}
                  style={{
                    width: '100%',
                    animation: `shrink ${autoCloseDelay}ms linear`
                  }}
                ></div>
              </div>
            </div>
          )}
        </div>

        {/* Action button */}
        <div className="px-6 pb-6">
          <button
            onClick={onClose}
            className={`w-full px-4 py-2.5 text-white rounded-lg transition-colors font-medium ${
              type === 'success' ? 'bg-green-600 hover:bg-green-700' :
              type === 'error' ? 'bg-red-600 hover:bg-red-700' :
              type === 'warning' ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            Entendido
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
};