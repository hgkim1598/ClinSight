import { Link } from 'react-router-dom';
import './Breadcrumb.css';

export interface BreadcrumbItem {
  label: string;
  /** 없으면 현재 페이지 (클릭 불가) */
  path?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export default function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav className="breadcrumb" aria-label="현재 위치">
      <ol className="breadcrumb__list">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <li key={`${i}-${item.label}`} className="breadcrumb__item">
              {item.path && !isLast ? (
                <Link to={item.path} className="breadcrumb__link">
                  {item.label}
                </Link>
              ) : (
                <span
                  className="breadcrumb__current"
                  aria-current={isLast ? 'page' : undefined}
                >
                  {item.label}
                </span>
              )}
              {!isLast && (
                <span className="breadcrumb__sep" aria-hidden="true">
                  {'>'}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
