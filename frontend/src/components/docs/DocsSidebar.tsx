import { useEffect, useState } from 'react';

export interface SidebarSection {
  id: string;
  label: string;
}

interface Props {
  sections: SidebarSection[];
}

export function DocsSidebar({ sections }: Props) {
  const [activeId, setActiveId] = useState<string>(sections[0]?.id ?? '');

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: '-80px 0px -70% 0px', threshold: 0 },
    );
    sections.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [sections]);

  return (
    <nav className="sticky top-6 w-56 shrink-0 self-start">
      <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">On this page</div>
      <ul className="space-y-1">
        {sections.map((s) => (
          <li key={s.id}>
            <a
              href={`#${s.id}`}
              className={
                'block rounded px-3 py-1.5 text-sm transition-colors ' +
                (activeId === s.id
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900')
              }
            >
              {s.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
