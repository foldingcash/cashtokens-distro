import { useState } from 'react';
import { WalletProvider } from './state/WalletContext.jsx';
import { SettingsProvider, useSettings } from './state/SettingsContext.jsx';
import WalletCard from './components/WalletCard.jsx';
import ReportView from './components/ReportView.jsx';
import DistributeView from './components/DistributeView.jsx';
import SettingsDialog from './components/SettingsDialog.jsx';

export default function App() {
  return (
    <SettingsProvider>
      <WalletProvider>
        <AppContent />
      </WalletProvider>
    </SettingsProvider>
  );
}

function AppContent() {
  const { settings } = useSettings();
  const [tab, setTab] = useState('report');
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div className="app">
      <header className="app__header">
        <h1>
          Folding<span className="brand-accent">Cash</span>{' '}
          <span className="app__title-sub">Token Distribution</span>
        </h1>
        <div className="app__header-actions">
          <span
            className={settings.network === 'mainnet' ? 'network-badge' : 'network-badge network-badge--test'}
            title="Change the network in Settings"
          >
            {settings.network}
          </span>
          <button type="button" className="button button--secondary" onClick={() => setSettingsOpen(true)}>
            Settings
          </button>
        </div>
      </header>

      <WalletCard />

      <nav className="tabs">
        <button
          type="button"
          className={tab === 'report' ? 'tabs__button tabs__button--active' : 'tabs__button'}
          onClick={() => setTab('report')}
        >
          Report
        </button>
        <button
          type="button"
          className={tab === 'distribute' ? 'tabs__button tabs__button--active' : 'tabs__button'}
          onClick={() => setTab('distribute')}
        >
          Distribute
        </button>
      </nav>

      {tab === 'report' ? <ReportView /> : <DistributeView />}

      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
