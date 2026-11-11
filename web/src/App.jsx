import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import HomePage from './pages/HomePage.jsx';
import StepsPage from './pages/StepsPage.jsx';
import AgenciesPage from './pages/AgenciesPage.jsx';
import ImportantPage from './pages/ImportantPage.jsx';
import PlansPage from './pages/PlansPage.jsx';
import ApplyPage from './pages/ApplyPage.jsx';
import SourcesPage from './pages/SourcesPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/steps" element={<StepsPage />} />
        <Route path="/agencies" element={<AgenciesPage />} />
        <Route path="/important" element={<ImportantPage />} />
        <Route path="/plans" element={<PlansPage />} />
        <Route path="/apply" element={<ApplyPage />} />
        <Route path="/sources" element={<SourcesPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Layout>
  );
}
