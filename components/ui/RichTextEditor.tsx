'use client';

import { useEffect, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import { FiBold, FiItalic, FiList, FiLink, FiCornerDownLeft } from 'react-icons/fi';
import { InputModal } from '@/components/ui/Modal';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  editable?: boolean;
}

export function RichTextEditor({
  content,
  onChange,
  placeholder = 'Enter description...',
  editable = true,
}: RichTextEditorProps) {
  const [showLinkModal, setShowLinkModal] = useState(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [2, 3],
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 underline',
        },
      }),
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[120px] p-3',
      },
    },
  });

  // Sync external content changes with editor (e.g., from AI generation)
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  if (!editor) {
    return null;
  }

  const addLink = () => {
    setShowLinkModal(true);
  };

  const handleLinkSubmit = (url: string) => {
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  return (
    <>
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
      {editable && (
        <div className="flex items-center gap-1 p-2 border-b border-gray-200 bg-gray-50">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`p-1.5 rounded hover:bg-gray-200 transition-colors ${
              editor.isActive('bold') ? 'bg-gray-200 text-blue-600' : 'text-gray-600'
            }`}
            title="Bold"
          >
            <FiBold className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`p-1.5 rounded hover:bg-gray-200 transition-colors ${
              editor.isActive('italic') ? 'bg-gray-200 text-blue-600' : 'text-gray-600'
            }`}
            title="Italic"
          >
            <FiItalic className="w-4 h-4" />
          </button>
          <div className="w-px h-5 bg-gray-300 mx-1" />
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`p-1.5 rounded hover:bg-gray-200 transition-colors ${
              editor.isActive('bulletList') ? 'bg-gray-200 text-blue-600' : 'text-gray-600'
            }`}
            title="Bullet List"
          >
            <FiList className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`p-1.5 rounded hover:bg-gray-200 transition-colors ${
              editor.isActive('orderedList') ? 'bg-gray-200 text-blue-600' : 'text-gray-600'
            }`}
            title="Numbered List"
          >
            <span className="text-xs font-bold">1.</span>
          </button>
          <div className="w-px h-5 bg-gray-300 mx-1" />
          <button
            type="button"
            onClick={addLink}
            className={`p-1.5 rounded hover:bg-gray-200 transition-colors ${
              editor.isActive('link') ? 'bg-gray-200 text-blue-600' : 'text-gray-600'
            }`}
            title="Add Link"
          >
            <FiLink className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().setHardBreak().run()}
            className="p-1.5 rounded hover:bg-gray-200 transition-colors text-gray-600"
            title="Line Break"
          >
            <FiCornerDownLeft className="w-4 h-4" />
          </button>
        </div>
      )}
      <EditorContent editor={editor} />
    </div>

    <InputModal
      isOpen={showLinkModal}
      onClose={() => setShowLinkModal(false)}
      onSubmit={handleLinkSubmit}
      title="Add Link"
      label="Enter URL"
      placeholder="https://example.com"
      submitText="Add Link"
      inputType="url"
    />
    </>
  );
}

// Read-only display component for viewing rich text content
export function RichTextDisplay({ content }: { content: string }) {
  if (!content || content === '<p></p>') {
    return null;
  }

  return (
    <div
      className="prose prose-sm max-w-none"
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}
