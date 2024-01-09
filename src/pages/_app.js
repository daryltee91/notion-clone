import '@/styles/globals.css';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { v4 as uuidv4 } from 'uuid';

import { KBarProvider, KBarPortal, KBarPositioner, KBarAnimator, KBarSearch, KBarResults, useMatches, NO_GROUP } from 'kbar';

import { createRxDatabase, addRxPlugin } from 'rxdb';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import { RxDBUpdatePlugin } from 'rxdb/plugins/update';
addRxPlugin(RxDBUpdatePlugin);

import { createClient } from '@supabase/supabase-js';
import { SupabaseReplication } from 'rxdb-supabase';

import Layout from '../components/layout';
import RxDBContext from '../contexts/RxDBContext';
import PagesContext from '../contexts/PagesContext';

const initRxDB = async () => {
  const pageSchema = {
    title: 'page schema',
    version: 0,
    primaryKey: 'uuid',
    type: 'object',
    properties: {
      uuid: {
        type: 'string',
        format: 'uuid',
        maxLength: 36
      },
      user: {
        type: 'string',
        format: 'uuid',
        maxLength: 36
      },
      title: {
        type: 'string',
      },
      content: {
        type: 'string'
      },
      datetime_created: {
        type: 'string',
        format: 'date-time'
      },
      master: {
        type: 'boolean'
      }
    },
    required: ['uuid']
  };

  const db = await createRxDatabase({
    name: 'pages',
    storage: getRxStorageDexie(),
    ignoreDuplicate: true
  });

  await db.addCollections({
    pages: {
      schema: pageSchema
    }
  });

  return db;
}

const RenderResults = () => {
  const { results } = useMatches();

  return (
    <KBarResults
      className="blah"
      items={results}
      onRender={({ item, active }) =>
        <div
          className="px-4 py-2"
          style={{
            background: active ? '#eee' : 'white',
          }}
        >
          {item.name}
        </div>
      }
    />
  );
}

export default function App({ Component, pageProps }) {
  const [db, setDb] = useState(null);
  const [user, setUser] = useState(null);
  const [pages, setPages] = useState(null);
  const [replication, setReplication] = useState(null);
  const router = useRouter();

  const createPage = async (isMaster = false) => {
    const uuid = uuidv4();
    const timestamp = new Date().toISOString();

    const page = await db.pages.insert({
      uuid: uuid,
      user: user,
      title: isMaster ? 'Master Page' : 'Default Title',
      content: '<h1>Default Title</h1><p></p><p>Hello world!</p>',
      datetime_created: timestamp,
      master: isMaster
    });

    const pages = await db.pages.find({
      sort: [{
        datetime_created: 'asc'
      }]
    }).exec();
    setPages(pages);

    // Redirect to the newly created page.
    router.replace(uuid);

    return page;
  }

  const updatePage = async (uuid, content) => {
    // Check that a title is set
    let title = 'Default Title';

    const template = document.createElement('template');
    template.innerHTML = content;
    title = template.content.children[0].innerHTML;

    if (template.content.children[0].innerHTML) {
      title = template.content.children[0].innerHTML;
    } else {
      // No title found, set a default title
      content = content.replace('<h1 id="title"></h1>', '<h1 id="title">Default Title</h1>');
    }

    const pagesTemp = [...pages];
    for (let i = 0; i < pagesTemp.length; i++) {
      if (pagesTemp[i].get('uuid') === uuid) {
        await pagesTemp[i].update({ $set: { title: title, content: content } });

        const pages = await db.pages.find({
          sort: [{
            datetime_created: 'asc'
          }]
        }).exec();
        setPages(pages);

        break;
      }
    }
  }

  const deletePage = async (uuid) => {
    const page = await db.pages.findOne({
      selector: {
        uuid: uuid
      }
    }).exec();

    if (page.get('master')) return; // Master page should not be deleted

    await page.remove();

    const pages = await db.pages.find({
      sort: [{
        datetime_created: 'asc'
      }]
    }).exec();
    setPages(pages);

    if (router.query.uuid === uuid) {
      // Redirect to the master page
      router.replace(pages[0].get('uuid'));
    }
  }

  // On app initialisation
  useEffect(() => {
    if (localStorage.getItem('user')) {
      // Set the existing user
      setUser(localStorage.getItem('user'));
    } else {
      // Set a new user
      const user = uuidv4();
      localStorage.setItem('user', user);
      setUser(user);
    }
  }, []);

  // On user change
  useEffect(() => {
    if (!user) return;

    // Wait for indexedDB to be available before initialising rxdb
    if (typeof window !== "undefined" && window.indexedDB) {
      // Initialise rxdb
      initRxDB()
        .then(async rxdb => {
          // Initialise replication
          /*const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_KEY);
          const rep = new SupabaseReplication({
            supabaseClient: supabase,
            collection: rxdb.pages,
            replicationIdentifier: `${process.env.NEXT_PUBLIC_SUPABASE_URL}:${user}`
          });
          setReplication(rep);*/
          setDb(rxdb);
        });
    }
  }, [user]);

  useEffect(() => {
    if (!db) return;

    // Check local db for existing pages
    db.pages.find({
      selector: {
        user: {
          $eq: user
        }
      },
      sort: [{
        datetime_created: 'asc'
      }]
    }).exec()
      .then(pages => {
        if (pages.length) {
          setPages(pages);

          // Show the default master page
          for (let page of pages) {
            if (page.get('master') === true) router.replace(page.get('uuid'));
            break;
          }
        } else {
          // No pages, create master page
          createPage(true)
            .then(page => router.replace(page.get('uuid')));
        }
      });
  }, [db])

  return (
    <RxDBContext.Provider value={{ db }}>
      <KBarProvider>
        <KBarPortal>
          <KBarPositioner>
            <KBarAnimator className="p-4 bg-white w-full max-w-[600px]">
              <KBarSearch className="px-4 py-2 my-2 w-full" />
              <RenderResults />
            </KBarAnimator>
          </KBarPositioner>
        </KBarPortal>
        <PagesContext.Provider value={{ pages, setPages, createPage, updatePage, deletePage }}>
          <Layout>
            <Component {...pageProps} />
          </Layout>
        </PagesContext.Provider>
      </KBarProvider>
    </RxDBContext.Provider>
  );
}
