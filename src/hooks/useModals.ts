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

interface InputModalState {
  isOpen: boolean;
  title: string;
  message: string;
  placeholder: string;
  defaultValue: string;
  required: boolean;
  confirmText: string;
  cancelText: string;
  multiline: boolean;
  rows: number;
  loading: boolean;
  onConfirm: (value: string) => void;
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

  const [inputModal, setInputModal] = useState<InputModalState>({
    isOpen: false,
    title: '',
    message: '',
    placeholder: '',
    defaultValue: '',
    required: false,
    confirmText: 'Confirmar',
    cancelText: 'Cancelar',
    multiline: false,
    rows: 3,
    loading: false,
    onConfirm: () => {}
  });

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
          console.error('Error en confirmacion:', error);
          const message = error instanceof Error ? error.message : 'Ocurrio un error al procesar la accion.';
          showError('No se pudo completar la accion', message, false);
          setConfirmModal(prev => ({ ...prev, loading: false }));
        }
      },
      loading: false
    });
  };

  const closeConfirm = () => {
    setConfirmModal(prev => ({ ...prev, isOpen: false, loading: false }));
  };

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

  const showSuccess = (title: string, message: string) => {
    console.log('SUCCESS', title, message);
    showNotification({
      title,
      message,
      type: 'success',
      autoClose: true
    });
  };

  const showError = (title: string, message: string, autoClose: boolean = false) => {
    console.error('ERROR', title, message);
    showNotification({
      title,
      message,
      type: 'error',
      autoClose
    });
  };

  const showWarning = (title: string, message: string) => {
    console.warn('WARNING', title, message);
    showNotification({
      title,
      message,
      type: 'warning',
      autoClose: false
    });
  };

  const showInfo = (title: string, message: string) => {
    console.info('INFO', title, message);
    showNotification({
      title,
      message,
      type: 'info',
      autoClose: true
    });
  };

  const confirmDelete = (title: string, message: string, onConfirm: () => void | Promise<void>) => {
    showConfirm({
      title,
      message,
      type: 'danger',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      onConfirm
    });
  };

  const showInput = (options: {
    title: string;
    message: string;
    placeholder?: string;
    defaultValue?: string;
    required?: boolean;
    confirmText?: string;
    cancelText?: string;
    multiline?: boolean;
    rows?: number;
    onConfirm: (value: string) => void | Promise<void>;
  }) => {
    return new Promise<string | null>((resolve) => {
      setInputModal({
        isOpen: true,
        title: options.title,
        message: options.message,
        placeholder: options.placeholder || '',
        defaultValue: options.defaultValue || '',
        required: options.required || false,
        confirmText: options.confirmText || 'Confirmar',
        cancelText: options.cancelText || 'Cancelar',
        multiline: options.multiline || false,
        rows: options.rows || 3,
        loading: false,
        onConfirm: async (value: string) => {
          setInputModal(prev => ({ ...prev, loading: true }));
          try {
            await options.onConfirm(value);
            closeInput();
            resolve(value);
          } catch (error) {
            console.error('Error en input modal:', error);
            const message = error instanceof Error ? error.message : 'Ocurrio un error al procesar la accion.';
            showError('No se pudo completar la accion', message, false);
            setInputModal(prev => ({ ...prev, loading: false }));
          }
        }
      });
    });
  };

  const closeInput = () => {
    setInputModal(prev => ({ ...prev, isOpen: false, loading: false }));
  };

  const promptInput = (title: string, message: string, required: boolean = false): Promise<string | null> => {
    return new Promise((resolve) => {
      setInputModal({
        isOpen: true,
        title,
        message,
        placeholder: '',
        defaultValue: '',
        required,
        confirmText: 'Aceptar',
        cancelText: 'Cancelar',
        multiline: false,
        rows: 3,
        loading: false,
        onConfirm: (value: string) => {
          closeInput();
          resolve(value);
        }
      });
    });
  };

  return {
    confirmModal,
    notificationModal,
    inputModal,
    showConfirm,
    closeConfirm,
    showNotification,
    closeNotification,
    showInput,
    closeInput,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    confirmDelete,
    promptInput
  };
};
