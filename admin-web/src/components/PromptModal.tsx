import React, { useState, useEffect } from 'react';
import { HelpCircle, X } from 'lucide-react';

interface PromptModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  defaultValue?: string;
  placeholder?: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
}

export default function PromptModal({
  isOpen,
  title,
  message,
  defaultValue = '',
  placeholder = '',
  onConfirm,
  onCancel,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar'
}: PromptModalProps) {
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    if (isOpen) {
      setValue(defaultValue);
    }
  }, [isOpen, defaultValue]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-start justify-between">
            <div className="p-3 rounded-full bg-indigo-500/10 text-indigo-400">
              <HelpCircle className="w-6 h-6" />
            </div>
            <button 
              onClick={onCancel}
              className="text-slate-400 hover:text-white transition-colors p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="mt-4">
            <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
            <div className="text-slate-300 text-sm leading-relaxed mb-4">
              {message}
            </div>
            
            <input
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={placeholder}
              className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl focus:outline-none focus:border-indigo-500 text-white font-medium"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') onConfirm(value);
                if (e.key === 'Escape') onCancel();
              }}
            />
          </div>
        </div>
        
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-950/50 border-t border-slate-800">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-semibold text-slate-300 hover:text-white transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={() => onConfirm(value)}
            className="px-4 py-2 text-sm font-bold text-white rounded-lg transition-all shadow-sm bg-indigo-600 hover:bg-indigo-500 border border-indigo-500/50 hover:shadow-[0_0_15px_rgba(79,70,229,0.3)]"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
