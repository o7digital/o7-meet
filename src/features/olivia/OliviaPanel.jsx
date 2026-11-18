import { Icon } from '../../components/Icon';
export function OliviaPanel({ onClose }) {
  return <aside className="ai-panel"><div className="ai-head"><div className="olivia-orb small">O</div><div><b>Olivia</b><span>Documents après réunion</span></div><button onClick={onClose} aria-label="Fermer Olivia"><Icon name="close" /></button></div><div className="ai-content panel-section"><h3>Importer votre conversation</h3><p>Après la réunion, importez une transcription ou un enregistrement dans l’espace privé Olivia. Vous pourrez traduire, obtenir le compte rendu et exporter les documents.</p><p>La transcription automatique en direct n’est pas activée dans cette salle.</p><a className="secondary" href="/import" target="_blank" rel="noreferrer">Ouvrir l’espace d’import</a></div></aside>;
}
