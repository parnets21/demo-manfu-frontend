import { useState } from 'react';
import PRList from './pr/PRList';
import CreatePRModal from './pr/CreatePRModal';
import { useAuth } from '../../../auth/AuthContext';
import { isViewOnly } from '../../../auth/rbac';

export default function PurchaseRequisitionTab({ externalShowCreate, onExternalClose, onSaved }) {
  const { user } = useAuth();
  const [showCreate, setShowCreate] = useState(false);
  const [editData, setEditData] = useState(null);
  const [refresh, setRefresh] = useState(0);

  const viewOnly = isViewOnly(user?.role, 'procurement');
  const isOpen = !viewOnly && (externalShowCreate || showCreate);
  const handleClose = () => { setShowCreate(false); setEditData(null); onExternalClose?.(); };

  const handleEdit = (pr) => { if (viewOnly) return; setEditData(pr); setShowCreate(true); };
  const handleSaved = () => { setRefresh(r => r + 1); onSaved?.(); };

  return (
    <div>
      <PRList onEdit={!viewOnly ? handleEdit : undefined} refresh={refresh} viewOnly={viewOnly} />

      <CreatePRModal
        open={isOpen}
        onClose={handleClose}
        onSaved={handleSaved}
        editData={editData}
      />
    </div>
  );
}
