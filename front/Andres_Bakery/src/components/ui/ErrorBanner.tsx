export function ErrorBanner({ message }: { message: string }) {
  return <div className="pixel-panel-plano bg-error-suave px-5 py-4 text-sm text-tinta">{message}</div>;
}
