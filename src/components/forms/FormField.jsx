import React from 'react';

export function FormField({ label, required, children }) {
  return (
    <div className="form-group">
      {label && (
        <label className="form-label">
          {label}{required && <span style={{ color: '#e74c3c', marginLeft: 2 }}>*</span>}
        </label>
      )}
      {children}
    </div>
  );
}

export function Input({ label, required, ...props }) {
  return (
    <FormField label={label} required={required}>
      <input className="form-input" {...props} />
    </FormField>
  );
}

export function Select({ label, required, children, ...props }) {
  return (
    <FormField label={label} required={required}>
      <select className="form-select" {...props}>{children}</select>
    </FormField>
  );
}

export function Textarea({ label, required, ...props }) {
  return (
    <FormField label={label} required={required}>
      <textarea className="form-textarea" {...props} />
    </FormField>
  );
}

export function Grid2({ children }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
      {children}
    </div>
  );
}

export function ModalBtn({ variant = 'primary', onClick, children, type = 'button' }) {
  const cls = variant === 'outline' ? 'btn btn-outline'
    : variant === 'success' ? 'btn btn-success'
    : 'btn btn-primary';
  return (
    <button type={type} onClick={onClick} className={cls}>
      {children}
    </button>
  );
}
