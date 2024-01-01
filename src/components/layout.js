import { useContext } from 'react';
import PagesContext from '../contexts/PagesContext';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { FiPlus, FiTrash2 } from 'react-icons/fi';

export default function Layout({ children }) {
  const { pages, createPage, deletePage } = useContext(PagesContext);
  const router = useRouter();

  let pageTitles = [];
  if (pages) {
    pageTitles = pages.map(page => {
      const uuid = page.get('uuid');
      const isActivePage = (router.query?.uuid && router.query.uuid === uuid);

      return (
        <div key={uuid} className="py-1 px-2 flex items-center justify-between hover:bg-gray-200">
          <Link href={`/${uuid}`} className={`grow ${isActivePage ? 'font-semibold' : 'text-gray-500'}`}>
            {page.get('title')}
          </Link>
          {page.get('master') !== true &&
            <button className="px-2" onClick={() => deletePage(uuid)}><FiTrash2 /></button>
          }
        </div>
      );
    });
  }

  return (
    <main
      className={`flex min-h-screen`}
    >
      <section className="sidebar w-80 pt-40 px-4 flex flex-col gap-1">
        <h4 className="py-1 px-2 font-medium text-xl">Pages</h4>
        {pageTitles}
        <div className="py-1 px-2 hover:bg-gray-200">
          <button onClick={() => createPage(false)} className="flex items-center gap-2 text-gray-500 w-full"><FiPlus /> Add a page</button>
        </div>
      </section>
      <section className="flex-grow">{children}</section>
    </main>
  )
}