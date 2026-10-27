// Demo data generator for testing return requests
export const generateDemoReturnRequest = () => {
  const suppliers = ['Amit Kumar', 'Rajesh Enterprises', 'Sharma Trading Co.', 'Kumar Industries'];
  const products = ['Product 764443', 'Cloth item', 'Electronic Component', 'Raw Material'];
  const reasons = ['Damaged', 'Wrong item', 'Quality issue', 'Defective'];
  const stages = ['Initiated', 'Approved', 'Pickup_Done', 'In_Transit', 'QC_Check', 'Closed'];
  
  const randomSupplier = suppliers[Math.floor(Math.random() * suppliers.length)];
  const randomProduct = products[Math.floor(Math.random() * products.length)];
  const randomReason = reasons[Math.floor(Math.random() * reasons.length)];
  const randomStage = stages[Math.floor(Math.random() * stages.length)];
  
  const invoiceAmount = Math.floor(Math.random() * 10000) + 1000;
  const returnValue = Math.floor(invoiceAmount * 0.7);
  const returnQty = Math.floor(Math.random() * 5) + 1;
  
  return {
    mrId: `MR-2026-${String(Math.floor(Math.random() * 999) + 1).padStart(3, '0')}`,
    docketId: `DKT-${Math.floor(Math.random() * 9000000) + 1000000}`,
    supplierName: randomSupplier,
    productName: randomProduct,
    reason: randomReason,
    stage: randomStage,
    invoiceNo: `INV-2026-${Math.floor(Math.random() * 9000) + 1000}`,
    invoiceAmount: invoiceAmount,
    value: returnValue,
    returnQty: returnQty,
    items: returnQty,
    partyType: 'Dealer',
    transport: 'Blue Dart',
    awbNo: `${Math.floor(Math.random() * 9000000000) + 1000000000}`,
    pickupAddress: 'Bengaluru, Karnataka',
    createdBy: 'Priya Sharma',
    createdAt: new Date().toISOString(),
    _id: `return_${Date.now()}_${Math.floor(Math.random() * 1000)}`
  };
};

export const generateMultipleDemoReturns = (count = 5) => {
  return Array.from({ length: count }, () => generateDemoReturnRequest());
};