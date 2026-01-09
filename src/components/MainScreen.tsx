import React from 'react';
import DashboardPage from '../pages/DashboardPage';
import PlantRegionPage from '../pages/PlantRegionPage';
import UserPage from '../pages/UserPage';
import ConfigPage from '../pages/ConfigPage';
import EmptyPage from '../pages/EmptyPage';
import CostPageV1 from '../pages/CostPageV1';
import CostPageV2 from '../pages/CostPageV2';
import MaterialPage from '../pages/MaterialPage';
import MachinePage from '../pages/MachineList';
import type { TabType } from '../App';
import { useLanguage } from '../contexts/LanguageContext';

interface MainScreenProps {
  activeTab: TabType;
  user: any;
}

const MainScreen = ({ activeTab, user }: MainScreenProps) => {
  const { t } = useLanguage();

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return <DashboardPage user={user} />;

      // Cost Analytics
      case 'cost-v1':
        return <CostPageV1 />;
      case 'cost-v2':
        return <CostPageV2 />;

      // Master Data
      case 'plant':
        return <PlantRegionPage />;
      case 'material':
        return <MaterialPage />;
      case 'machine':
        return <MachinePage />;
      case 'labor':
        return <EmptyPage title={t('menu_labor')} />;
      case 'overheads':
        return <EmptyPage title={t('menu_overhead')} />;
      case 'factor':
        return <EmptyPage title={t('menu_factor')} />;
      case 'exchange':
        return <EmptyPage title={t('menu_exchange')} />;

      // System Settings
      case 'users':
        return <UserPage />;
      case 'config':
        return <ConfigPage />;

      default:
        return <DashboardPage user={user} />;
    }
  };

  return (
    <main className="flex-1 overflow-hidden relative">
      {renderContent()}
    </main>
  );
};

export default MainScreen;