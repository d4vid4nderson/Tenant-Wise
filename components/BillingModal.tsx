'use client';

import { useState, useEffect } from 'react';
import { FiX, FiCreditCard, FiDownload, FiExternalLink, FiFileText, FiCalendar, FiAlertCircle, FiCheck } from 'react-icons/fi';

interface PaymentMethod {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
}

interface Invoice {
  id: string;
  number: string | null;
  status: string | null;
  amount: number;
  currency: string;
  created: number;
  pdfUrl: string | null;
  hostedUrl: string | null;
}

interface Subscription {
  id: string;
  status: string;
  currentPeriodStart: number;
  currentPeriodEnd: number;
  cancelAtPeriodEnd: boolean;
}

interface BillingModalProps {
  isOpen: boolean;
  onClose: () => void;
  subscriptionTier: string;
}

const cardBrandIcons: Record<string, string> = {
  visa: '💳 Visa',
  mastercard: '💳 Mastercard',
  amex: '💳 American Express',
  discover: '💳 Discover',
  diners: '💳 Diners Club',
  jcb: '💳 JCB',
  unionpay: '💳 UnionPay',
};

export default function BillingModal({ isOpen, onClose, subscriptionTier }: BillingModalProps) {
  const [loading, setLoading] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updatingPayment, setUpdatingPayment] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadBillingInfo();
    }
  }, [isOpen]);

  const loadBillingInfo = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/billing');
      if (!response.ok) {
        throw new Error('Failed to load billing information');
      }

      const data = await response.json();
      setPaymentMethod(data.paymentMethod);
      setInvoices(data.invoices || []);
      setSubscription(data.subscription);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePaymentMethod = async () => {
    setUpdatingPayment(true);

    try {
      const response = await fetch('/api/billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          returnUrl: window.location.href,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create billing portal session');
      }

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setUpdatingPayment(false);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-700';
      case 'open':
        return 'bg-yellow-100 text-yellow-700';
      case 'draft':
        return 'bg-gray-100 text-gray-700';
      case 'uncollectible':
      case 'void':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FiCreditCard className="w-6 h-6 text-white" />
            <h2 className="text-lg font-semibold text-white">Manage Billing</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/20 transition-colors text-white"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : error ? (
            <div className="flex items-center gap-3 p-4 bg-red-50 text-red-700 rounded-lg">
              <FiAlertCircle className="w-5 h-5" />
              {error}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Subscription Status */}
              {subscription && (
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-blue-900">Active Subscription</h3>
                    <span className="flex items-center gap-1 text-sm text-green-600">
                      <FiCheck className="w-4 h-4" />
                      Active
                    </span>
                  </div>
                  <p className="text-sm text-blue-700">
                    Current billing period: {formatDate(subscription.currentPeriodStart)} - {formatDate(subscription.currentPeriodEnd)}
                  </p>
                  {subscription.cancelAtPeriodEnd && (
                    <p className="text-sm text-amber-600 mt-2">
                      Your subscription will end on {formatDate(subscription.currentPeriodEnd)}
                    </p>
                  )}
                </div>
              )}

              {/* Payment Method */}
              <div>
                <h3 className="font-semibold mb-3">Payment Method</h3>
                {paymentMethod ? (
                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-8 bg-gradient-to-r from-gray-700 to-gray-900 rounded flex items-center justify-center text-white text-xs font-bold">
                        {paymentMethod.brand?.toUpperCase().slice(0, 4) || 'CARD'}
                      </div>
                      <div>
                        <p className="font-medium">
                          {cardBrandIcons[paymentMethod.brand?.toLowerCase()] || `💳 ${paymentMethod.brand || 'Card'}`}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          •••• •••• •••• {paymentMethod.last4} | Expires {paymentMethod.expMonth}/{paymentMethod.expYear}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleUpdatePaymentMethod}
                      disabled={updatingPayment}
                      className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                      {updatingPayment ? 'Loading...' : 'Update'}
                    </button>
                  </div>
                ) : (
                  <div className="p-4 border border-dashed border-gray-300 rounded-lg text-center">
                    <p className="text-muted-foreground mb-3">No payment method on file</p>
                    {subscriptionTier !== 'free' && (
                      <button
                        onClick={handleUpdatePaymentMethod}
                        disabled={updatingPayment}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
                      >
                        {updatingPayment ? 'Loading...' : 'Add Payment Method'}
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Invoice History */}
              <div>
                <h3 className="font-semibold mb-3">Invoice History</h3>
                {invoices.length > 0 ? (
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Invoice</th>
                          <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Date</th>
                          <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Amount</th>
                          <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Status</th>
                          <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {invoices.map((invoice) => (
                          <tr key={invoice.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <FiFileText className="w-4 h-4 text-gray-400" />
                                <span className="text-sm font-medium">{invoice.number || 'Draft'}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <FiCalendar className="w-4 h-4" />
                                {formatDate(invoice.created)}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-sm font-medium">
                                {formatAmount(invoice.amount, invoice.currency)}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(invoice.status)}`}>
                                {invoice.status?.charAt(0).toUpperCase()}{invoice.status?.slice(1) || 'Unknown'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                {invoice.pdfUrl && (
                                  <a
                                    href={invoice.pdfUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    title="Download PDF"
                                  >
                                    <FiDownload className="w-4 h-4" />
                                  </a>
                                )}
                                {invoice.hostedUrl && (
                                  <a
                                    href={invoice.hostedUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    title="View Invoice"
                                  >
                                    <FiExternalLink className="w-4 h-4" />
                                  </a>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-8 border border-dashed border-gray-300 rounded-lg text-center">
                    <FiFileText className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                    <p className="text-muted-foreground">No invoices yet</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Invoices will appear here after your first payment
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t px-6 py-4 flex justify-between items-center">
          <p className="text-xs text-muted-foreground">
            Billing is securely processed by Stripe
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
