interface ErrorMessageProps {
  message: string;
}

export function ErrorMessage({ message }: ErrorMessageProps) {
  return (
    <div className="error">
      <strong>Error:</strong> {message}
    </div>
  );
}

