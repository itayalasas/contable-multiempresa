import { useState } from 'react';

interface ConfirmModalState {
  isOpen: boolean;
  title: string;
  message: string;
  type: 'danger' | 'warning' | 'success' | 'info';
  confirmText: string;
  cancelText: string;
  onConfirm: () => void;
  loading: boolean;
}

interface NotificationModalState {
  isOpen: boolean;
  title: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  autoClose: boolean;
}

export const useModals = () => {
  const [confirmModal, setConfirmModal] = useState<ConfirmModalState>({
    isOpen: false,
    title: '',
    message: '',
    type: 'warning',
    confirmText: 'Confirmar',
    cancelText: 'Cancelar',
    onConfirm: () => {},
    loading: false
  });

  const [notificationModal, setNotificationModal] = useState<NotificationModalState>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info',
    autoClose: true
  });

  // Funciones para el modal de confirmación
  const showConfirm = (options: {
    title: string;
    message: string;
    type?: 'danger' | 'warning' | 'success' | 'info';
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void | Promise<void>;
  }) => {
    setConfirmModal({
      isOpen: true,
      title: options.title,
      message: options.message,
      type: options.type || 'warning',
      confirmText: options.confirmText || 'Confirmar',
      cancelText: options.cancelText || 'Cancelar',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, loading: true }));
        try {
          await options.onConfirm();
          closeConfirm();
        } catch (error) {
          console.error('Error en confirmación:', error);
          setConfirmModal(prev => ({ ...prev, loading: false }));
        }
      },
      loading: false
    });
  };

  const closeConfirm = () => {
    setConfirmModal(prev => ({ ...prev, isOpen: false, loading: false }));
  };

  // Funciones para el modal de notificación
  const showNotification = (options: {
    title: string;
    message: string;
    type?: 'success' | 'error' | 'warning' | 'info';
    autoClose?: boolean;
  }) => {
    setNotificationModal({
      isOpen: true,
      title: options.title,
      message: options.message,
      type: options.type || 'info',
      autoClose: options.autoClose !== false
    });
  };

  const closeNotification = () => {
    setNotificationModal(prev => ({ ...prev, isOpen: false }));
  };

  // Funciones de conveniencia
  const showSuccess = (title: string, message: string) => {
    showNotification({ title, message, type: 'success' });
  };

  const showError = (title: string, message: string) => {
    showNotification({ title, message, type: 'error', autoClose: false });
  };

  const showWarning = (title: string, message: string) => {
    showNotification({ title, message, type: 'warning' });
  };

  const showInfo = (title: string, message: string) => {
    showNotification({ title, message, type: 'info' });
  };

  const confirmDelete = (itemName: string, onConfirm: () => void | Promise<void>) => {
    showConfirm({
      title: 'Confirmar Eliminación',
      message: `¿Está seguro de que desea eliminar "${itemName}"? Esta acción no se puede deshacer.`,
      type: 'danger',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      onConfirm
    });
  };

  return {
    // Estados
    confirmModal,
    notificationModal,
    
    // Funciones de control
    showConfirm,
    closeConfirm,
    showNotification,
    closeNotification,
    
    // Funciones de conveniencia
    showSuccess,
    showError,
    showWarning,
    showInfo,
    confirmDelete
  };
};