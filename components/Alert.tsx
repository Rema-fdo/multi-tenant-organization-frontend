interface AlertProps {
  kind: 'error' | 'success';
  message: string | null;
}

export function Alert({ kind, message }: AlertProps) {
  if (!message) return null;
  return <div className={`alert ${kind}`}>{message}</div>;
}
