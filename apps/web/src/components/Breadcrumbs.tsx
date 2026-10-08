import Link from "next/link";
import { ChevronRight } from "lucide-react";

/**
 * Visible breadcrumbs. The BreadcrumbList markup is emitted alongside by the
 * page; these exist so a visitor sees what the markup says.
 */
export default function Breadcrumbs({ trail }: { trail: [name: string, href: string][] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-5 text-sm text-slate-500">
      <ol className="flex flex-wrap items-center gap-1">
        {trail.map(([name, href], i) => {
          const last = i === trail.length - 1;
          return (
            <li key={href} className="flex items-center gap-1">
              {last ? (
                <span aria-current="page" className="font-medium text-slate-700">{name}</span>
              ) : (
                <>
                  <Link href={href} className="hover:text-teal-700 hover:underline">{name}</Link>
                  <ChevronRight className="h-3.5 w-3.5 text-slate-300" aria-hidden />
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
