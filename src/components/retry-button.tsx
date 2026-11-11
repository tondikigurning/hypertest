export function RetryButton({ onRetry }: { onRetry: () => void }) {
  return (
    <button type="button" className="evidence-retry" onClick={onRetry}>
      Try again
    </button>
  );
}
