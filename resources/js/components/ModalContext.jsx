import React, { createContext, useContext, useState, useCallback } from 'react';
import AlertModal from './AlertModal';

const ModalContext = createContext(null);

export const ModalProvider = ({ children }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [config, setConfig] = useState({
        title: '',
        message: '',
        type: 'info', // 'info', 'error', 'success', 'warning'
        confirmText: 'OK',
        cancelText: 'Cancel',
        onConfirm: null,
        onCancel: null,
        showCancel: false
    });

    const showAlert = useCallback((options) => {
        const { 
            title = 'System Notification', 
            message = '', 
            type = 'info', 
            confirmText = 'OK', 
            cancelText = 'Cancel',
            onConfirm = null,
            onCancel = null,
            showCancel = false
        } = typeof options === 'string' ? { message: options } : options;

        setConfig({ title, message, type, confirmText, cancelText, onConfirm, onCancel, showCancel });
        setIsOpen(true);
    }, []);

    const handleConfirm = useCallback(() => {
        setIsOpen(false);
        if (config.onConfirm) {
            config.onConfirm();
        }
    }, [config]);

    const handleCancel = useCallback(() => {
        setIsOpen(false);
        if (config.onCancel) {
            config.onCancel();
        }
    }, [config]);

    return (
        <ModalContext.Provider value={{ showAlert }}>
            {children}
            <AlertModal 
                isOpen={isOpen} 
                onConfirm={handleConfirm}
                onCancel={handleCancel}
                {...config} 
            />
        </ModalContext.Provider>
    );
};

export const useModal = () => {
    const context = useContext(ModalContext);
    if (!context) {
        throw new Error('useModal must be used within a ModalProvider');
    }
    return context;
};
