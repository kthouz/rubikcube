import { Route, Routes } from 'react-router-dom';
import AppShell from './components/AppShell';
import Landing from './views/Landing';
import Scan from './views/Scan';
import Review from './views/Review';
import Solve from './views/Solve';
import Tutorial from './views/Tutorial';
import NotFound from './views/NotFound';

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Landing />} />
        <Route path="scan" element={<Scan />} />
        <Route path="review" element={<Review />} />
        <Route path="solve" element={<Solve />} />
        <Route path="tutorial" element={<Tutorial />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
