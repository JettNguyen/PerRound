import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout.tsx';
import { Home } from './pages/Home.tsx';
import { CaliberPage } from './pages/Caliber.tsx';
import { LoadPage } from './pages/Load.tsx';
import { StoresPage } from './pages/Stores.tsx';
import { NotFound } from './pages/NotFound.tsx';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="ammo/:slug" element={<CaliberPage />} />
          <Route path="load/:id" element={<LoadPage />} />
          <Route path="stores" element={<StoresPage />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
