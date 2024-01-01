import { useContext, useState, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { useDebouncedCallback } from 'use-debounce';
import Document from '@tiptap/extension-document';
import Placeholder from '@tiptap/extension-placeholder';
import StarterKit from '@tiptap/starter-kit';
import PagesContext from '../contexts/PagesContext';
import { useRouter } from 'next/router';

const CustomDocument = Document.extend({
  content: 'heading block*',
});

export default function Tiptap({ content }) {
  const router = useRouter();
  const { pages, updatePage } = useContext(PagesContext);
  const [html, setHtml] = useState(null);

  const debounced = useDebouncedCallback((value) => {
    setHtml(value);
  }, 600);

  // Initialise TipTap editor
  const editor = useEditor({
    extensions: [
      CustomDocument,
      StarterKit.configure({
        document: false,
        heading: {
          HTMLAttributes: {
            id: 'title'
          }
        }
      }),
      Placeholder.configure({
        placeholder: ({ node }) => {
          if (node.type.name === 'heading') {
            return 'Add a title'
          }

          return 'Content'
        },
      })
    ],
    content: content,
    onUpdate: async ({ editor }) => {
      const html = editor.getHTML();
      debounced(html)
    }
  }, [pages, content]);

  useEffect(() => {
    setHtml(null);
  }, [content]);

  // Save content on debounce
  useEffect(() => {
    if (html !== null) {
      updatePage(router.query.uuid, html);
    }
  }, [html]);

  // Keep focus to the editor
  useEffect(() => {
    if (editor === null) return;
    editor.commands.focus('end');
  }, [editor]);

  return <EditorContent editor={editor} />;
}