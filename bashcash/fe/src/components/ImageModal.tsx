import './ImageModal.css';

interface ImageModalProps {
  url: string;
  filename: string;
  onClose: () => void;
}

export function ImageModal({ url, filename, onClose }: ImageModalProps) {
  return (
    <div className="image-modal-overlay" onClick={onClose}>
      <div className="image-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="image-modal-close" onClick={onClose} aria-label="Close">
          ✕
        </button>
        <div className="image-modal-body">
          <img src={url} alt={filename} />
        </div>
        <div className="image-modal-footer">
          <p>{filename}</p>
        </div>
      </div>
    </div>
  );
}

