import { useRouter } from 'next/router';
import { useContext, useEffect, useState } from 'react';
import PagesContext from '../contexts/PagesContext';
import Tiptap from '../components/tiptap';
import RxDBContext from '../contexts/RxDBContext';
import { useRegisterActions } from 'kbar';

export default function Page() {
  const router = useRouter();
  const { db } = useContext(RxDBContext);
  const { pages, createPage, deletePage } = useContext(PagesContext);
  const [page, setPage] = useState(null);

  useEffect(() => {
    if (!pages) return;

    for (let page of pages) {
      if (page.get('uuid') === router.query.uuid) {
        setPage(page);
        return;
      }
    }
  }, [pages, router.query.uuid]);

  useRegisterActions([{
    id: "create",
    name: "Create New Page",
    shortcut: [],
    keywords: "create",
    perform: () => createPage(false),
  },
  {
    id: "delete",
    name: "Delete Current Page",
    shortcut: [],
    keywords: "delete",
    perform: () => deletePage(router.query.uuid),
  }], [db, router.query.uuid]);

  if (!page) return null;

  return (
    <div className="px-40 pt-40 w-full">
      <Tiptap uuid={router.query.uuid} content={page.get('content')} />
    </div>
  );
}