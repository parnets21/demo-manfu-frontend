import { useState } from 'react';
import RFQList from './rfq/RFQList';
import CreateRFQModal from './rfq/CreateRFQModal';
import CompareQuotesModal from './rfq/CompareQuotesModal';
import { rfqApi } from '../../../api/rfqApi';

export default function RFQTab({ externalShowCreate, onExternalClose, onSaved }) {
  const [compareRFQ, setCompareRFQ] = useState(null);
  const [refresh, setRefresh] = useState(0);

  const handleSaved = () => {
    setRefresh(r => r + 1);
    onSaved?.();
  };

  // Re-fetch the specific RFQ so quotations are up-to-date in the modal
  const handleRefresh = async () => {
    setRefresh(r => r + 1);
    onSaved?.();
    if (compareRFQ?._id) {
      try {
        const res = await rfqApi.getById(compareRFQ._id);
        setCompareRFQ(res.data);
      } catch (_) {
        setCompareRFQ(null);
      }
    }
  };

  const handleClose = () => { onExternalClose?.(); };

  const handleCompare = (rfq) => {
    if (rfq && rfq._id) {
      setCompareRFQ(rfq);
    }
  };

  return (
    <div>
      <RFQList onCompare={handleCompare} refresh={refresh} />

      <CreateRFQModal open={externalShowCreate} onClose={handleClose} onSaved={handleSaved} />

      <CompareQuotesModal
        open={!!compareRFQ}
        onClose={() => setCompareRFQ(null)}
        rfq={compareRFQ}
        onRefresh={handleRefresh}
      />
    </div>
  );
}
