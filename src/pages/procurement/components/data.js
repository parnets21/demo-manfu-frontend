export const defaultCategories = [
  'Raw Material', 'Components', 'Bearings', 'Castings',
  'Seals & Gaskets', 'Electrical', 'Packaging', 'Tools & Consumables',
];

export const vendors = [
  { id: 'V-001', name: 'Shree Metals Pvt Ltd', category: 'Raw Material', contact: 'Ramesh Gupta', phone: '9876543210', city: 'Pune', status: 'Active', rating: '4.5' },
  { id: 'V-002', name: 'Precision Parts Co.', category: 'Components', contact: 'Suresh Jain', phone: '9812345678', city: 'Mumbai', status: 'Active', rating: '4.2' },
  { id: 'V-003', name: 'Global Bearings Ltd', category: 'Bearings', contact: 'Anil Mehta', phone: '9823456789', city: 'Ahmedabad', status: 'Active', rating: '4.8' },
  { id: 'V-004', name: 'Apex Castings', category: 'Castings', contact: 'Vijay Rao', phone: '9834567890', city: 'Nashik', status: 'Inactive', rating: '3.9' },
  { id: 'V-005', name: 'National Seals', category: 'Seals & Gaskets', contact: 'Pradeep Kumar', phone: '9845678901', city: 'Delhi', status: 'Active', rating: '4.6' },
];

export const rfqs = [
  { id: 'RFQ-2024-012', vendor: 'Shree Metals Pvt Ltd', items: 8, value: '₹8,40,000', dueDate: '20 Apr', status: 'Open' },
  { id: 'RFQ-2024-011', vendor: 'Global Bearings Ltd', items: 4, value: '₹2,10,000', dueDate: '18 Apr', status: 'Closed' },
  { id: 'RFQ-2024-010', vendor: 'Precision Parts Co.', items: 12, value: '₹5,60,000', dueDate: '15 Apr', status: 'Open' },
];

export const prs = [
  { id: 'PR-2024-034', dept: 'Production', items: 6, value: '₹1,20,000', requestedBy: 'Priya Nair', status: 'Pending', date: '12 Apr' },
  { id: 'PR-2024-033', dept: 'Maintenance', items: 3, value: '₹45,000', requestedBy: 'Sunil Das', status: 'Approved', date: '11 Apr' },
  { id: 'PR-2024-032', dept: 'Production', items: 9, value: '₹2,80,000', requestedBy: 'Ravi Sharma', status: 'Approved', date: '10 Apr' },
];

export const pos = [
  { id: 'PO-2024-089', vendor: 'Shree Metals Pvt Ltd', items: 8, subtotal: '₹4,20,000', gst: '₹75,600', total: '₹4,95,600', status: 'Pending', date: '14 Apr' },
  { id: 'PO-2024-088', vendor: 'Global Bearings Ltd', items: 4, subtotal: '₹1,80,000', gst: '₹32,400', total: '₹2,12,400', status: 'Approved', date: '13 Apr' },
  { id: 'PO-2024-087', vendor: 'Precision Parts Co.', items: 12, subtotal: '₹4,80,000', gst: '₹86,400', total: '₹5,66,400', status: 'Received', date: '12 Apr' },
];

export const grns = [
  { id: 'GRN-0234', po: 'PO-2024-087', vendor: 'Precision Parts Co.', items: 12, received: 12, status: 'Completed', date: '13 Apr' },
  { id: 'GRN-0233', po: 'PO-2024-086', vendor: 'National Seals', items: 6, received: 4, status: 'Partial', date: '12 Apr' },
];

export const poItems = [
  { item: 'Bearing 6205', qty: 100, basePrice: 450, gst: 18, total: 53100 },
  { item: 'Oil Seal 35x52', qty: 200, basePrice: 120, gst: 18, total: 28320 },
  { item: 'Gasket Set A', qty: 50, basePrice: 680, gst: 18, total: 40120 },
];

export const rfqDetails = [
  {
    id: 'RFQ-2024-012',
    prRef: 'PR-2024-032',
    poRef: null,
    title: 'Raw Material Supply Q2',
    vendors: ['Shree Metals Pvt Ltd', 'Apex Castings'],
    dueDate: '20 Apr 2024',
    status: 'Open',
    createdBy: 'Ravi Sharma',
    createdOn: '12 Apr 2024',
    items: [
      { name: 'Steel Rod 20mm', qty: 500, unit: 'Kg' },
      { name: 'MS Plate 6mm', qty: 200, unit: 'Kg' },
      { name: 'Hex Bolt M12', qty: 1000, unit: 'Nos' },
    ],
  },
  {
    id: 'RFQ-2024-011',
    prRef: 'PR-2024-031',
    poRef: 'PO-2024-087',
    title: 'Bearing Procurement',
    vendors: ['Global Bearings Ltd', 'Precision Parts Co.'],
    dueDate: '18 Apr 2024',
    status: 'Closed',
    createdBy: 'Priya Nair',
    createdOn: '10 Apr 2024',
    items: [
      { name: 'Bearing 6205', qty: 100, unit: 'Nos' },
      { name: 'Bearing 6305', qty: 50, unit: 'Nos' },
    ],
  },
  {
    id: 'RFQ-2024-010',
    prRef: 'PR-2024-030',
    poRef: null,
    title: 'Seals & Gaskets Restock',
    vendors: ['National Seals', 'Precision Parts Co.', 'Shree Metals Pvt Ltd'],
    dueDate: '15 Apr 2024',
    status: 'Open',
    createdBy: 'Amit Patel',
    createdOn: '08 Apr 2024',
    items: [
      { name: 'Oil Seal 35x52', qty: 200, unit: 'Nos' },
      { name: 'Gasket Set A', qty: 50, unit: 'Set' },
      { name: 'O-Ring 25mm', qty: 300, unit: 'Nos' },
    ],
  },
];

export const vendorQuotes = {
  'RFQ-2024-012': [
    {
      vendor: 'Shree Metals Pvt Ltd',
      submittedOn: '14 Apr',
      deliveryDays: 7,
      items: [
        { name: 'Steel Rod 20mm', qty: 500, unitPrice: 85, gst: 18 },
        { name: 'MS Plate 6mm', qty: 200, unitPrice: 120, gst: 18 },
        { name: 'Hex Bolt M12', qty: 1000, unitPrice: 12, gst: 18 },
      ],
    },
    {
      vendor: 'Apex Castings',
      submittedOn: '15 Apr',
      deliveryDays: 10,
      items: [
        { name: 'Steel Rod 20mm', qty: 500, unitPrice: 80, gst: 18 },
        { name: 'MS Plate 6mm', qty: 200, unitPrice: 130, gst: 18 },
        { name: 'Hex Bolt M12', qty: 1000, unitPrice: 11, gst: 18 },
      ],
    },
  ],
  'RFQ-2024-011': [
    {
      vendor: 'Global Bearings Ltd',
      submittedOn: '12 Apr',
      deliveryDays: 5,
      items: [
        { name: 'Bearing 6205', qty: 100, unitPrice: 450, gst: 18 },
        { name: 'Bearing 6305', qty: 50, unitPrice: 520, gst: 18 },
      ],
    },
    {
      vendor: 'Precision Parts Co.',
      submittedOn: '13 Apr',
      deliveryDays: 8,
      items: [
        { name: 'Bearing 6205', qty: 100, unitPrice: 430, gst: 18 },
        { name: 'Bearing 6305', qty: 50, unitPrice: 510, gst: 18 },
      ],
    },
  ],
};

export const grnDetails = [
  {
    id: 'GRN-0234', poRef: 'PO-2024-087', vendor: 'Precision Parts Co.',
    receivedBy: 'Sunil Das', receivedDate: '13 Apr 2024', warehouse: 'WH-01',
    status: 'Completed', qcStatus: 'Passed',
    items: [
      { name: 'Bearing 6205', ordered: 100, received: 100, accepted: 100, rejected: 0 },
      { name: 'Oil Seal 35x52', ordered: 200, received: 198, accepted: 196, rejected: 2 },
      { name: 'Gasket Set A', ordered: 50, received: 50, accepted: 50, rejected: 0 },
    ],
  },
  {
    id: 'GRN-0233', poRef: 'PO-2024-086', vendor: 'National Seals',
    receivedBy: 'Ravi Sharma', receivedDate: '12 Apr 2024', warehouse: 'WH-02',
    status: 'Partial', qcStatus: 'Pending',
    items: [
      { name: 'O-Ring 25mm', ordered: 300, received: 200, accepted: 200, rejected: 0 },
      { name: 'Gasket Set B', ordered: 100, received: 0, accepted: 0, rejected: 0 },
    ],
  },
];
