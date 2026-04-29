import { Link } from 'react-router-dom';

type BreadcrumbItem = {
  label: string;
  to?: string;
};

export function BreadcrumbNav({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav className="breadcrumb-nav" aria-label="Đường dẫn">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <span className="breadcrumb-part" key={`${item.label}-${index}`}>
            {index > 0 ? <span className="breadcrumb-separator">/</span> : null}
            {item.to && !isLast ? <Link to={item.to}>{item.label}</Link> : <strong>{item.label}</strong>}
          </span>
        );
      })}
    </nav>
  );
}
