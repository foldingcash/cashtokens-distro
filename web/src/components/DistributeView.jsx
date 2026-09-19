import { useEffect, useState, useCallback } from 'react';
import { useWallet } from '../state/WalletContext.jsx';
import {
  getWalletInputs,
  getDistroAmountFromTokenInput,
  getMinimumSatoshisRequired,
  prepareDistributionTransaction,
  sendDistributionTransaction,
} from '../lib/chainProvider.js';
import { getDistribution } from '../lib/distroApi.js';
import DateRangeForm from './DateRangeForm.jsx';
import SummaryStats from './SummaryStats.jsx';
import DistroTable, { truncateAddress } from './DistroTable.jsx';
import ErrorNotice from './ErrorNotice.jsx';
import ConfirmSendDialog from './ConfirmSendDialog.jsx';
import { formatNumber, satoshisToBch } from '../lib/format.js';

/**
 * Workflow 2: the amount is derived entirely from the CashToken UTXO sitting
 * in the wallet (there's no amount field to type into). The user still gets
 * an explicit review + confirm/cancel step before anything is broadcast.
 */
export default function DistributeView() {
  const { wallet } = useWallet();

  const [walletInputs, setWalletInputs] = useState(null);
  const [distroAmount, setDistroAmount] = useState(null);
  const [walletError, setWalletError] = useState(null);
  const [isLoadingWallet, setIsLoadingWallet] = useState(false);

  const [report, setReport] = useState(null);
  const [reportError, setReportError] = useState(null);
  const [isLoadingReport, setIsLoadingReport] = useState(false);
  const [lastRange, setLastRange] = useState(null);

  const [prepared, setPrepared] = useState(null);
  const [prepareError, setPrepareError] = useState(null);
  const [isPreparing, setIsPreparing] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState(null);
  const [sendResult, setSendResult] = useState(null);

  const loadWalletInputs = useCallback(async () => {
    if (!wallet) return;
    setIsLoadingWallet(true);
    setWalletError(null);
    setWalletInputs(null);
    setDistroAmount(null);
    try {
      const inputs = await getWalletInputs(wallet.address);
      const amount = getDistroAmountFromTokenInput(inputs.tokenInput);
      setWalletInputs(inputs);
      setDistroAmount(amount);
    } catch (err) {
      setWalletError(err);
    } finally {
      setIsLoadingWallet(false);
    }
  }, [wallet]);

  useEffect(() => {
    if (wallet) loadWalletInputs();
    // Only re-run when the address actually changes (i.e. a new wallet is imported).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallet?.address]);

  async function handleDateSubmit({ startDate, endDate }) {
    setIsLoadingReport(true);
    setReportError(null);
    setReport(null);
    setPrepared(null);
    setSendResult(null);
    setSendError(null);
    try {
      const result = await getDistribution(startDate, endDate, distroAmount);
      setReport(result);
      setLastRange({ startDate, endDate });
    } catch (err) {
      setReportError(err);
    } finally {
      setIsLoadingReport(false);
    }
  }

  async function handlePrepare() {
    setIsPreparing(true);
    setPrepareError(null);
    try {
      const result = await prepareDistributionTransaction({
        address: wallet.address,
        signatureTemplate: wallet.signatureTemplate,
        tokenInput: walletInputs.tokenInput,
        fundInput: walletInputs.fundInput,
        satoshis: walletInputs.satoshis,
        distroCount: report.distroCount,
        distro: report.distro,
      });
      setPrepared(result);
    } catch (err) {
      setPrepareError(err);
    } finally {
      setIsPreparing(false);
    }
  }

  async function handleConfirmSend() {
    setIsSending(true);
    setSendError(null);
    try {
      const result = await sendDistributionTransaction(prepared.transaction);
      setSendResult(result);
      setConfirmOpen(false);
    } catch (err) {
      setSendError(err);
      setConfirmOpen(false);
    } finally {
      setIsSending(false);
    }
  }

  function handleReset() {
    setReport(null);
    setLastRange(null);
    setPrepared(null);
    setPrepareError(null);
    setSendResult(null);
    setSendError(null);
    loadWalletInputs();
  }

  if (!wallet) {
    return (
      <div className="view">
        <p className="view__intro">Import your wallet above to start a distribution.</p>
      </div>
    );
  }

  const minimumSatoshis = report ? getMinimumSatoshisRequired(report.distroCount) : null;
  const hasEnoughFunds =
    walletInputs && minimumSatoshis !== null ? walletInputs.satoshis >= minimumSatoshis : true;

  const distributeColumns = [
    { key: 'address', label: 'Address', sortable: false, render: (r) => truncateAddress(r.cashTokensAddress) },
    {
      key: 'amount',
      label: 'Tokens to send',
      sortable: true,
      accessor: (r) => r.amount,
      render: (r) => formatNumber(r.amount),
    },
    {
      key: 'workUnitsGained',
      label: 'Work units',
      sortable: true,
      accessor: (r) => r.workUnitsGained,
      render: (r) => formatNumber(r.workUnitsGained),
    },
    {
      key: 'pointsGained',
      label: 'Points',
      sortable: true,
      accessor: (r) => r.pointsGained,
      render: (r) => formatNumber(r.pointsGained),
    },
  ];

  return (
    <div className="view">
      <p className="view__intro">
        Choose a date range — the amount to distribute comes straight from the CashToken UTXO
        already sitting in your wallet, not from a field you type in.
      </p>

      <div className="card">
        <div className="wallet-card__label">Wallet inputs</div>
        {isLoadingWallet && <p>Checking wallet…</p>}
        {walletInputs && (
          <SummaryStats
            stats={[
              { label: 'Available to distribute', value: Number(distroAmount) },
              { label: 'BCH available for fees', value: `${satoshisToBch(walletInputs.satoshis)} BCH` },
              {
                label: 'Token category',
                value: truncateAddress(walletInputs.tokenInput.token.category, 10, 6),
              },
            ]}
          />
        )}
        <button
          type="button"
          className="button button--secondary"
          onClick={loadWalletInputs}
          disabled={isLoadingWallet}
        >
          Refresh wallet
        </button>
        <ErrorNotice error={walletError} onRetry={loadWalletInputs} />
      </div>

      {walletInputs && (
        <div className="card">
          <DateRangeForm onSubmit={handleDateSubmit} submitLabel="Get distribution" isBusy={isLoadingReport} />
        </div>
      )}

      <ErrorNotice error={reportError} onRetry={lastRange ? () => handleDateSubmit(lastRange) : undefined} />

      {report && (
        <>
          <SummaryStats
            stats={[
              { label: 'Recipients', value: report.distroCount },
              { label: 'Total work units', value: report.totalWorkUnits },
              { label: 'Total points', value: report.totalPoints },
              { label: 'Total tokens to send', value: report.totalDistro, decimals: 8 },
            ]}
          />
          {!hasEnoughFunds && (
            <ErrorNotice
              error={{
                kind: 'insufficient-funds',
                message:
                  `Need at least ${minimumSatoshis} sats to cover dust for ${report.distroCount} ` +
                  `recipients, but the wallet only has ${walletInputs.satoshis} sats available.`,
              }}
            />
          )}
          <DistroTable rows={report.distro} columns={distributeColumns} defaultSortKey="amount" />

          {!prepared && !sendResult && (
            <button
              type="button"
              className="button"
              onClick={handlePrepare}
              disabled={isPreparing || !hasEnoughFunds}
            >
              {isPreparing ? 'Building transaction…' : 'Review transaction'}
            </button>
          )}
          <ErrorNotice error={prepareError} onRetry={handlePrepare} />
        </>
      )}

      {prepared && !sendResult && (
        <div className="card">
          <div className="wallet-card__label">Ready to send</div>
          <dl className="confirm-summary">
            <dt>Network fee</dt>
            <dd>
              {satoshisToBch(prepared.fee)} BCH ({prepared.fee.toString()} sats)
            </dd>
            <dt>Change back to your wallet</dt>
            <dd>{satoshisToBch(prepared.changeSatoshis)} BCH</dd>
          </dl>
          <div className="button-row">
            <button type="button" className="button" onClick={() => setConfirmOpen(true)}>
              Send distribution
            </button>
            <button
              type="button"
              className="button button--secondary"
              onClick={() => navigator.clipboard?.writeText(prepared.hex)}
            >
              Copy raw transaction hex
            </button>
          </div>
          <ErrorNotice error={sendError} onRetry={() => setConfirmOpen(true)} />
        </div>
      )}

      {sendResult && (
        <div className="card card--success">
          <div className="wallet-card__label">Distribution sent</div>
          <p>
            Transaction id: <code>{sendResult.txid}</code>
          </p>
          <a
            href={`https://blockchair.com/bitcoin-cash/transaction/${sendResult.txid}`}
            target="_blank"
            rel="noreferrer"
          >
            View on Blockchair
          </a>
          <div className="button-row">
            <button type="button" className="button button--secondary" onClick={handleReset}>
              Start another distribution
            </button>
          </div>
        </div>
      )}

      <ConfirmSendDialog
        open={confirmOpen}
        isSending={isSending}
        summary={
          prepared
            ? {
                distroCount: report.distroCount,
                totalTokens: Number(prepared.distributedTokens) / 100000000,
                fee: prepared.fee,
                changeSatoshis: prepared.changeSatoshis,
              }
            : { distroCount: 0, totalTokens: 0, fee: 0n, changeSatoshis: 0n }
        }
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleConfirmSend}
      />
    </div>
  );
}
