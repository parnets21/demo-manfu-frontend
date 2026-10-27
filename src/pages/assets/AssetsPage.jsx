import AssetRegisterTab from './components/AssetRegisterTab';
import MaintenanceTab from './components/MaintenanceTab';
import LifecycleTab from './components/LifecycleTab';

export default function AssetsPage({ initialTab = 0 }) {
  return (
    <div>
      {initialTab === 0 && <AssetRegisterTab />}
      {initialTab === 1 && <MaintenanceTab />}
      {initialTab === 2 && <LifecycleTab />}
    </div>
  );
}
