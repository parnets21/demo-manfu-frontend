import StatusBadge from '../../../components/common/StatusBadge';
import { poItems } from './data';

export default function QualityCheckTab() {
  return (
    <div className="card">
      <div style={{ fontWeight: 700, marginBottom: 16 }}>Quality Check — GRN-0234</div>
      <div className="table-container">
        <table>
          <thead>
            <tr><th>Item</th><th>Received Qty</th><th>Inspected</th><th>Pass</th><th>Fail</th><th>Result</th><th>Remarks</th></tr>
          </thead>
          <tbody>
            {poItems.map((item, i) => (
              <tr key={i}>
                <td style={{ fontWeight: 600 }}>{item.item}</td>
                <td>{item.qty}</td>
                <td>{item.qty}</td>
                <td><input type="number" className="form-input" style={{ width: 70 }} defaultValue={item.qty - (i === 1 ? 2 : 0)} /></td>
                <td><input type="number" className="form-input" style={{ width: 70 }} defaultValue={i === 1 ? 2 : 0} /></td>
                <td><StatusBadge status={i === 1 ? 'Partial' : 'Passed'} /></td>
                <td><input className="form-input" placeholder="Remarks..." /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
        <button className="btn btn-danger">Reject Batch</button>
        <button className="btn btn-success">Approve & Close</button>
      </div>
    </div>
  );
}
