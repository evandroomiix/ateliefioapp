import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

export function Field({
  label,
  hint,
  required,
  children,
  className = "",
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 flex items-baseline justify-between gap-2 text-[13px] font-semibold text-stone-700">
        <span>
          {label}
          {required ? <span className="ml-0.5 text-rose-600">*</span> : null}
        </span>
        {hint ? <span className="text-[11px] font-normal text-stone-400">{hint}</span> : null}
      </span>
      {children}
    </label>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  const { className = "", ...rest } = props;
  return <input {...rest} className={`input-base ${className}`} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  const { className = "", ...rest } = props;
  return <select {...rest} className={`input-base ${className}`} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { className = "", ...rest } = props;
  return <textarea {...rest} className={`input-base min-h-24 resize-y ${className}`} />;
}

export function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3 border-t border-stone-100 py-4 first:border-0 first:pt-0">
      <div>
        <h3 className="text-sm font-bold text-stone-800">{title}</h3>
        {description ? <p className="text-xs text-stone-500">{description}</p> : null}
      </div>
      <div className="grid grid-cols-2 gap-3">{children}</div>
    </section>
  );
}
