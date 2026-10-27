import { Table } from '../ui';
export default function DataTable({ columns, data, onRowClick }) {
  return <Table columns={columns} data={data} onRowClick={onRowClick} />;
}
