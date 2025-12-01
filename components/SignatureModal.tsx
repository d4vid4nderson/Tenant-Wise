'use client';

import { useState } from 'react';
import { FiSend, FiX } from 'react-icons/fi';

interface SignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: string;
  documentTitle: string;
  tenantName: string;
  tenantEmail: string;
  onSuccess?: () => void;
}

export function SignatureModal({
  isOpen,
  onClose,
  documentId,
  documentTitle,
  tenantName,
  tenantEmail,
  onSuccess,
}: SignatureModalProps) {
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSend = async () => {
    setSending(true);
    setError(null);

    try {
      const response = await fetch(`/api/documents/${documentId}/signature`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });

      if (response.ok) {
        onSuccess?.();
        onClose();
        setMessage('');
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to send for signature');
      }
    } catch (err) {
      console.error('Error sending for signature:', err);
      setError('Failed to send for signature');
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    if (!sending) {
      onClose();
      setMessage('');
      setError(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-cyan-500 to-blue-500 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Send for E-Signature</h2>
          <button
            onClick={handleClose}
            disabled={sending}
            className="text-white/80 hover:text-white transition-colors disabled:opacity-50"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-2">Document</p>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="font-medium text-sm">{documentTitle}</p>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium mb-2">Send to</p>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="font-medium">{tenantName}</p>
                <p className="text-sm text-muted-foreground">{tenantEmail}</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Personal Message (optional)
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Add a personal message to include with the signature request..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                rows={3}
                disabled={sending}
              />
            </div>

            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-700">
                <strong>Note:</strong> Both you and the tenant will receive an email with a link to sign this document via SignWell.
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-50 rounded-lg">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={handleClose}
              disabled={sending}
              className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={sending}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg hover:from-cyan-600 hover:to-blue-600 disabled:opacity-50"
            >
              {sending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <FiSend className="w-4 h-4" />
                  Send for Signature
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
