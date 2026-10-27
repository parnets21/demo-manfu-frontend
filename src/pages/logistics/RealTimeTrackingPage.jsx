import { useState } from 'react';
import StatusBadge from '../../components/common/StatusBadge';

const shipments = [
  {
    id: 'SHP-001', order: 'ORD-2024-089', customer: 'Tata Motors', courier: 'Delhivery',
    awb: 'DL456789123', origin: 'Nashik', destination: 'Mumbai', status: 'In Transit',
    dispatched: '15 Apr, 09:00 AM', eta: '16 Apr, 02:00 PM',
    timeline: [
      { event: 'Order Dispatched', time: '15 Apr, 09:00 AM', location: 'Nashik Plant', done: true },
      { event: 'Picked up by Delhivery', time: '15 Apr, 10:30 AM', location: 'Nashik Hub', done: true },
      { event: 'In Transit', time: '15 Apr, 02:00 PM', location: 'Pune Bypass, NH-60', done: true },
      { event: 'Out for Delivery', time: 'Expected: 16 Apr, 08:00 AM', location: 'Mumbai Hub', done: false },
      { event: 'Delivered', time: 'Expected: 16 Apr, 02:00 PM', location: 'Customer Warehouse', done: false },
    ],
  },
  {
    id: 'SHP-002', order: 'ORD-2024-086', customer: 'Hero MotoCorp', courier: 'India Post',
    awb: 'IP998877665IN', origin: 'Pune', destination: 'Delhi', status: 'Out for Delivery',
    dispatched: '13 Apr, 08:00 AM', eta: '15 Apr, 05:00 PM',
    timeline: [
      { event: 'Order Dispatched', time: '13 Apr, 08:00 AM', location: 'Pune WH-01', done: true },
      { event: 'Picked up by India Post', time: '13 Apr, 11:00 AM', location: 'Pune GPO', done: true },
      { event: 'In Transit', time: '14 Apr, 06:00 AM', location: 'Nagpur Sorting Hub', done: true },
      { event: 'Out for Delivery', time: '15 Apr, 08:00 AM', location: 'Delhi Distribution', done: true },
      { event: 'Delivered', time: 'Expected: 15 Apr, 05:00 PM', location: 'Customer Warehouse', done: false },
    ],
  },
  {
    id: 'SHP-003', order: 'ORD-2024-084', customer: 'Ashok Leyland', courier: 'Delhivery',
    awb: 'DL556677889', origin: 'Nashik', destination: 'Chennai', status: 'Delivered',
    dispatched: '12 Apr, 09:00 AM', eta: '14 Apr, 03:00 PM',
    timeline: [
      { event: 'Order Dispatched', time: '12 Apr, 09:00 AM', location: 'Nashik Plant', done: true },
      { event: 'Picked up', time: '12 Apr, 11:00 AM', location: 'Nashik Hub', done: true },
      { event: 'In Transit', time: '13 Apr, 07:00 AM', location: 'Hyderabad Hub', done: true },
      { event: 'Out for Delivery', time: '14 Apr, 09:00 AM', location: 'Chennai Hub', done: true },
      { event: 'Delivered', time: '14 Apr, 02:30 PM', location: 'Customer Warehouse', done: true },
    ],
  },
];

const statusColor = { 'In Transit': '#3b82f6', 'Out for Delivery': '#f59e0b', 'Delivered': '#10b981', 'Pending': '#6b7280' };

export default function RealTimeTrackingPage({ initialTab = 0 }) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [selected, setSelected] = useState(shipments[0]);

  const tabs = ['Live Tracking', 'Delivery API Config'];

  const kpis = [
    { label: 'Active Shipments', value: shipments.filter(s => s.status !== 'Delivered').length, color: '#3b82f6' },
    { label: 'Out for Delivery', value: shipments.filter(s => s.status === 'Out for Delivery').length, color: '#f59e0b' },
    { label: 'Delivered Today', value: shipments.filter(s => s.status === 'Delivered').length, color: '#10b981' },
    { label: 'Total Shipments', value: shipments.length, color: '#1c2833' },
  ];

  return (
    <div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        {kpis.map((k, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm hover:-translate-y-1 hover:shadow-lg transition-all">
            <div className="text-2xl font-black tracking-tight" style={{ color: k.color }}>{k.value}</div>
            <div className="text-xs text-gray-500 font-medium mt-1">{k.label}</div>
          </div>
        ))}
      </div>

      {/* Tab 0: Live Tracking */}
      {activeTab === 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Shipment list */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
            <div className="text-sm font-bold text-gray-800 mb-3.5">Active Shipments</div>
            {shipments.map((s, i) => (
              <div key={i} onClick={() => setSelected(s)}
                className={`p-3.5 rounded-xl mb-2 cursor-pointer border-2 transition-all ${selected?.id === s.id ? 'border-red-600 bg-red-50/60' : 'border-gray-200 hover:border-red-300'}`}>
                <div className="flex justify-between items-start mb-1.5">
                  <div>
                    <span className="font-bold text-red-700 text-sm">{s.id}</span>
                    <span className="text-xs text-gray-400 ml-2">{s.awb}</span>
                  </div>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ background: statusColor[s.status] }}>{s.status}</span>
                </div>
                <div className="text-sm font-semibold text-gray-800">{s.customer}</div>
                <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                  <span>{s.origin}</span>
                  <span>→</span>
                  <span>{s.destination}</span>
                  <span>·</span>
                  <span>{s.courier}</span>
                </div>
                <div className="text-xs text-gray-400 mt-0.5">ETA: {s.eta}</div>
              </div>
            ))}
          </div>

          {/* Timeline detail */}
          {selected && (
            <div className="flex flex-col gap-4">
              <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                <div className="text-sm font-bold text-gray-800 mb-1">Tracking — {selected.id}</div>
                <div className="text-xs text-gray-400 mb-4">{selected.customer} · {selected.origin} → {selected.destination}</div>

                {/* Map placeholder */}
                <div className="h-32 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200 flex items-center justify-center mb-4">
                  <div className="text-center">
                    <div className="text-3xl mb-1">🗺️</div>
                    <div className="text-xs text-blue-600 font-semibold">Live Map View</div>
                    <div className="text-[10px] text-blue-400">Connect Delhivery / India Post API for live location</div>
                  </div>
                </div>

                <div className="relative pl-6">
                  <div className="absolute left-2.5 top-1.5 bottom-1.5 w-0.5 bg-gray-200 rounded" />
                  {selected.timeline.map((item, i) => (
                    <div key={i} className="relative mb-4 last:mb-0">
                      <div className={`absolute -left-[17px] top-1 w-3 h-3 rounded-full ring-2 ring-offset-1 ${item.done ? 'bg-green-500 ring-green-500' : 'bg-gray-300 ring-gray-300'}`} />
                      <div className={`text-sm font-semibold ${item.done ? 'text-gray-800' : 'text-gray-400'}`}>{item.event}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{item.time}</div>
                      {item.location && <div className="text-xs text-gray-400">📍 {item.location}</div>}
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                <div className="text-sm font-bold text-gray-800 mb-3">Shipment Details</div>
                {[['Order', selected.order], ['AWB No.', selected.awb], ['Courier', selected.courier], ['Dispatched', selected.dispatched], ['ETA', selected.eta]].map(([k, v]) => (
                  <div key={k} className="flex justify-between py-2 border-b border-gray-50 text-sm last:border-0">
                    <span className="text-gray-500">{k}</span>
                    <span className="font-semibold">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 1: API Config */}
      {activeTab === 1 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { name: 'Delhivery', logo: '🚚', connected: true },
            { name: 'India Post', logo: '📮', connected: true },
          ].map((api, idx) => (
            <div key={idx} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">{api.logo}</span>
                <div>
                  <div className="font-bold text-base">{api.name} API</div>
                  <div className={`text-xs font-semibold ${api.connected ? 'text-green-600' : 'text-gray-400'}`}>
                    {api.connected ? '● Connected' : '○ Not Connected'}
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-600">API Key</label>
                  <input type="password" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none bg-white focus:border-red-500 focus:ring-2 focus:ring-red-100 font-[inherit]" defaultValue="••••••••••••••••••••" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-600">Client ID</label>
                  <input className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none bg-white focus:border-red-500 focus:ring-2 focus:ring-red-100 placeholder:text-gray-400 font-[inherit]" placeholder="Client ID" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-600">Pickup Location</label>
                  <input className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none bg-white focus:border-red-500 focus:ring-2 focus:ring-red-100 placeholder:text-gray-400 font-[inherit]" placeholder="Warehouse address" />
                </div>
                <div className="flex gap-2">
                  <button className="flex-1 px-3 py-2 text-xs rounded-lg border border-red-600 text-red-700 bg-transparent font-semibold cursor-pointer font-[inherit]">Test Connection</button>
                  <button className="flex-1 px-3 py-2 text-xs rounded-lg bg-gradient-to-br from-red-400 to-red-700 text-white font-semibold border-0 cursor-pointer font-[inherit]">Save</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
