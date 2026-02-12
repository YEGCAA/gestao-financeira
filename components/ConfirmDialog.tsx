import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel: () => void;
    type?: 'danger' | 'warning' | 'info';
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
    isOpen,
    title,
    message,
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    onConfirm,
    onCancel,
    type = 'warning'
}) => {
    if (!isOpen) return null;

    const colors = {
        danger: {
            bg: 'bg-red-100',
            icon: 'text-red-600',
            button: 'bg-red-600 hover:bg-red-700',
            border: 'border-red-200'
        },
        warning: {
            bg: 'bg-amber-100',
            icon: 'text-amber-600',
            button: 'bg-amber-600 hover:bg-amber-700',
            border: 'border-amber-200'
        },
        info: {
            bg: 'bg-blue-100',
            icon: 'text-blue-600',
            button: 'bg-blue-600 hover:bg-blue-700',
            border: 'border-blue-200'
        }
    };

    const colorScheme = colors[type];

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-scaleIn">
                <div className="flex items-start gap-4 mb-4">
                    <div className={`w-12 h-12 rounded-full ${colorScheme.bg} flex items-center justify-center flex-shrink-0`}>
                        <AlertTriangle className={colorScheme.icon} size={24} />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-900 mb-1">{title}</h3>
                        <p className="text-sm text-gray-600 leading-relaxed">{message}</p>
                    </div>
                    <button
                        onClick={onCancel}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="flex gap-3 mt-6">
                    <button
                        onClick={onCancel}
                        className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={() => {
                            onConfirm();
                            onCancel();
                        }}
                        className={`flex-1 px-4 py-2.5 ${colorScheme.button} text-white rounded-lg transition-colors font-medium`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes fadeIn {
                    from {
                        opacity: 0;
                    }
                    to {
                        opacity: 1;
                    }
                }

                @keyframes scaleIn {
                    from {
                        opacity: 0;
                        transform: scale(0.95);
                    }
                    to {
                        opacity: 1;
                        transform: scale(1);
                    }
                }

                .animate-fadeIn {
                    animation: fadeIn 0.2s ease-out;
                }

                .animate-scaleIn {
                    animation: scaleIn 0.2s ease-out;
                }
            `}</style>
        </div>
    );
};

export default ConfirmDialog;
