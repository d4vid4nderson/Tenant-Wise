'use client';

import { useRef } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useToast } from '@/components/ui/Toast';

interface DocumentPreviewProps {
  content: string | null;
  loading: boolean;
  title?: string;
}

export function DocumentPreview({ content, loading, title }: DocumentPreviewProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const { showToast } = useToast();

  const handlePrint = () => {
    if (printRef.current) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>${title || 'Document'}</title>
              <style>
                body {
                  font-family: Georgia, serif;
                  max-width: 8.5in;
                  margin: 0 auto;
                  padding: 1in;
                  line-height: 1.6;
                }
                h1, h2, h3 { font-family: Arial, sans-serif; }
                h1 { font-size: 24px; text-align: center; margin-bottom: 24px; }
                h2 { font-size: 18px; margin-top: 24px; margin-bottom: 12px; }
                p { margin-bottom: 12px; }
                strong { font-weight: bold; }
                table { width: 100%; border-collapse: collapse; margin: 16px 0; }
                th, td { border: 1px solid #333; padding: 8px 12px; text-align: left; }
                th { background-color: #f5f5f5; font-weight: bold; }
                tr:nth-child(even) { background-color: #fafafa; }
                @media print {
                  body { padding: 0; }
                  table { page-break-inside: avoid; }
                }
              </style>
            </head>
            <body>
              ${printRef.current.innerHTML}
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
      }
    }
  };

  const handleDownload = () => {
    if (content) {
      const blob = new Blob([content], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title || 'document'}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const handleCopy = async () => {
    if (content) {
      try {
        await navigator.clipboard.writeText(content);
        showToast('Document copied to clipboard!', 'success');
      } catch (err) {
        console.error('Failed to copy:', err);
        showToast('Failed to copy document', 'error');
      }
    }
  };

  if (loading) {
    return (
      <Card className="p-6 flex items-center justify-center min-h-[600px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Generating your document...</p>
          <p className="text-sm text-gray-500 mt-2">This usually takes 5-10 seconds</p>
        </div>
      </Card>
    );
  }

  if (!content) {
    return (
      <Card className="p-6 flex items-center justify-center min-h-[600px]">
        <div className="text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400 mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No document yet</h3>
          <p className="text-gray-600">Fill out the form and click "Generate" to create your document</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Action Buttons */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-2">
          <Button onClick={handlePrint} variant="primary">
            Print Document
          </Button>
          <Button onClick={handleDownload} variant="secondary">
            Download Markdown
          </Button>
          <Button onClick={handleCopy} variant="secondary">
            Copy to Clipboard
          </Button>
        </div>
      </Card>

      {/* Document Preview */}
      <Card className="p-8 bg-white shadow-lg">
        <div
          ref={printRef}
          className="prose prose-slate max-w-none"
          style={{
            fontFamily: 'Georgia, serif',
            fontSize: '14px',
            lineHeight: '1.6',
          }}
        >
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({ children }) => (
                <h1 className="text-2xl font-bold text-center mb-6 font-sans">{children}</h1>
              ),
              h2: ({ children }) => (
                <h2 className="text-xl font-semibold mt-6 mb-3 font-sans">{children}</h2>
              ),
              h3: ({ children }) => (
                <h3 className="text-lg font-semibold mt-4 mb-2 font-sans">{children}</h3>
              ),
              p: ({ children }) => <p className="mb-3">{children}</p>,
              strong: ({ children }) => <strong className="font-bold">{children}</strong>,
              ul: ({ children }) => <ul className="list-disc pl-6 mb-3">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal pl-6 mb-3">{children}</ol>,
              table: ({ children }) => (
                <table className="w-full border-collapse my-4 text-sm">{children}</table>
              ),
              thead: ({ children }) => (
                <thead className="bg-gray-100">{children}</thead>
              ),
              tbody: ({ children }) => <tbody>{children}</tbody>,
              tr: ({ children }) => (
                <tr className="border-b border-gray-300 even:bg-gray-50">{children}</tr>
              ),
              th: ({ children }) => (
                <th className="border border-gray-300 px-3 py-2 text-left font-semibold">{children}</th>
              ),
              td: ({ children }) => (
                <td className="border border-gray-300 px-3 py-2">{children}</td>
              ),
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
      </Card>

      {/* Legal Disclaimer */}
      <Card className="p-4 bg-yellow-50 border-yellow-200">
        <p className="text-sm text-yellow-800">
          <strong>Legal Disclaimer:</strong> This document is a template generated by AI and is
          provided for informational purposes only. It is not legal advice. Always consult with a
          licensed attorney in your jurisdiction before using any legal documents.
        </p>
      </Card>
    </div>
  );
}
