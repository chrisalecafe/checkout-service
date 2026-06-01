/**
 * Manual mock for @heroui/react.
 * Replaces HeroUI components with plain HTML so tests don't pull in
 * framer-motion (ESM-only) and run fast without a real DOM theme.
 */
import React from 'react';

type AnyProps = Record<string, unknown> & { children?: React.ReactNode };

// ── Button ────────────────────────────────────────────────────────────────
export const Button = ({
  children, onPress, isDisabled, isLoading, type = 'button',
  fullWidth: _fw, color: _c, variant: _v, size: _s, ...rest
}: AnyProps & {
  onPress?: () => void;
  type?: 'button' | 'submit' | 'reset';
  isDisabled?: boolean;
  isLoading?: boolean;
}) => (
  <button
    type={type as 'button' | 'submit' | 'reset'}
    disabled={isDisabled || isLoading}
    onClick={onPress}
    {...rest}
  >
    {children}
  </button>
);

// ── Input ─────────────────────────────────────────────────────────────────
export const Input = ({
  label, value, onValueChange, type = 'text', isInvalid, errorMessage,
  isRequired, isDisabled, min, step, endContent,
  size: _s, variant: _v, classNames: _cn, ...rest
}: AnyProps & {
  label?: string;
  value?: string;
  onValueChange?: (v: string) => void;
  isInvalid?: boolean;
  errorMessage?: string;
  isRequired?: boolean;
  isDisabled?: boolean;
  type?: string;
  min?: string;
  step?: string;
  endContent?: React.ReactNode;
}) => {
  // Use a stable unique id so multiple inputs with the same label don't clash.
  const uid = React.useId();
  const id = `input-${uid}`;

  // Map type="email" → type="text" to avoid JSDOM rejecting partial email
  // values during userEvent.type(). We test component logic, not HTML semantics.
  const inputType = type === 'email' ? 'text' : type;

  return (
    <div>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type={inputType}
        value={value ?? ''}
        required={isRequired}
        disabled={isDisabled}
        min={min}
        step={step}
        onChange={e => onValueChange?.(e.target.value)}
        aria-invalid={isInvalid ? true : undefined}
        {...rest}
      />
      {endContent}
      {isInvalid && errorMessage && (
        <span role="alert">{errorMessage}</span>
      )}
    </div>
  );
};

// ── Card / CardHeader / CardBody ──────────────────────────────────────────
export const Card = ({ children, className: _c, shadow: _s }: AnyProps) => <div>{children}</div>;
export const CardHeader = ({ children, className: _c }: AnyProps) => <div>{children}</div>;
export const CardBody = ({ children, className: _c, gap: _g }: AnyProps) => <div>{children}</div>;

// ── Divider ───────────────────────────────────────────────────────────────
export const Divider = ({ className: _c }: AnyProps) => <hr />;

// ── Spinner ───────────────────────────────────────────────────────────────
export const Spinner = ({ size: _s, color: _c }: AnyProps) => (
  <span role="status" aria-label="loading" />
);

// ── HeroUIProvider ────────────────────────────────────────────────────────
export const HeroUIProvider = ({ children }: AnyProps) => <>{children}</>;
