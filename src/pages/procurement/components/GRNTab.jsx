import { useState } from 'react';
import GRNList from './grn/GRNList';
import CreateGRNModal from './grn/CreateGRNModal';
import GRNDetailModal from './grn/GRNDetailModal';

export default function GRNTab({ externalShowCreate, onExternalClose, onSaved }) {
  const [viewGRN, setViewGRN] = useState(null);
  const [refresh, setRefresh] = useState(0);

  const isOpen = externalShowCreate;

  const handleClose = () => { onExternalClose?.(); };

  const handleSaved = () => {
    setRefresh(r => r + 1);
    onSaved?.();
    handleClose();
  };

  return (
    <div>
      <GRNList onView={(grn) => setViewGRN(grn)} refresh={refresh} />

      <CreateGRNModal open={isOpen} onClose={handleClose} onSaved={handleSaved} />

      <GRNDetailModal open={!!viewGRN} onClose={() => setViewGRN(null)} grn={viewGRN} />
    </div>
  );
}
