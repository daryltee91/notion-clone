import { createContext } from 'react';

const PagesContext = createContext({
  pages: null,
  setPages: () => {},
  createPage: () => {},
  updatePage: () => {},
  deletePage: () => {}
});

export default PagesContext;