export default function ImageProcessingOverlay({ estado }) {
  if (!estado) return null;

  const progresso = Math.max(0, Math.min(100, estado.progresso || 0));
  const titulo = estado.titulo || "Carregando imagem";

  return (
    <div className="image-processing-overlay" role="status" aria-live="polite" aria-label={titulo}>
      <div className="image-processing-card">
        <span className="eyebrow">{titulo}</span>
        <strong>{estado.rotulo || "Preparando arquivo"}</strong>
        <div className="image-processing-progress" aria-hidden="true">
          <i style={{ width: progresso + "%" }} />
        </div>
        <small>{progresso}%</small>
      </div>
    </div>
  );
}
