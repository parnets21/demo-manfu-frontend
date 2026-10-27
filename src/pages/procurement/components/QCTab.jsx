import { useState } from 'react';
import QCList from './qc/QCList';
import CreateQCModal from './qc/CreateQCModal';
import QCDetailModal from './qc/QCDetailModal';

export default function QCTab({ externalShowCreate, onExternalClose, onSaved }) {
  const [showCreate, setShowCreate] = useState(false);
  const [viewQC, setViewQC] = useState(null);
  const [refresh, setRefresh] = useState(0);

  const isOpen = externalShowCreate || showCreate;

  const handleClose = () => {
    setShowCreate(false);
    onExternalClose?.();
  };

  const handleSaved = () => {
    setRefresh(r => r + 1);
    onSaved?.();
    handleClose();
  };

  return (
    <div>
      {!externalShowCreate && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            + Create QC Inspection
          </button>
        </div>
      )}

      <QCList onView={(qc) => setViewQC(qc)} refresh={refresh} />

      <CreateQCModal open={isOpen} onClose={handleClose} onSaved={handleSaved} />

      <QCDetailModal open={!!viewQC} onClose={() => setViewQC(null)} qc={viewQC} />
    </div>
  );
}
