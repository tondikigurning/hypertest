export function AgentStarterButton({
  title,
  description,
  onSelect,
}: {
  title: string;
  description: string;
  onSelect: () => void;
}) {
  return (
    <button type="button" onClick={onSelect}>
      <span>
        <strong>{title}</strong>
        <small>{description}</small>
      </span>
      <span aria-hidden="true">&#8599;</span>
    </button>
  );
}
