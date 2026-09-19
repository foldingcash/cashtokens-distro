import { useState } from 'react';
import { WalletProvider } from './state/WalletContext.jsx';
import WalletCard from './components/WalletCard.jsx';
import ReportView from './components/ReportView.jsx';
import DistributeView from './components/DistributeView.jsx';
import { NETWORK } from './config.js';

export default function App() {
  const [tab, setTab] = useState('report');

  return (
    <WalletProvider>
      <div className="app">
        <header className="app__header">
          <h1>FoldingCash Token Distribution</h1>
          <span className="network-badge" title="Configured via VITE_NETWORK">
            {NETWORK}
          </span>
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
      </div>
    </WalletProvider>
  );
}
