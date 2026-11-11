import { Link } from 'react-router-dom';
import { EmptyState } from '../components/ui.jsx';

export default function NotFoundPage() {
  return (
    <div className="container section narrow">
      <EmptyState title="Страница не найдена" as="h1">
        <p>Возможно, ссылка устарела.</p>
        <Link to="/" className="btn btn--primary">На главную</Link>
      </EmptyState>
    </div>
  );
}
