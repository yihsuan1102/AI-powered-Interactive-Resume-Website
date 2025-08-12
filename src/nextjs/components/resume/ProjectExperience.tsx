import React from 'react';
import type { ProjectItem } from '../../types/resume';

type ProjectExperienceProps = {
  items: ProjectItem[];
};

function formatRange(startMonth?: string, startYear?: number, endMonth?: string | null, endYear?: number | null) {
  const start = [startMonth, startYear].filter(Boolean).join(' ');
  const end = endYear ? [endMonth, endYear].filter(Boolean).join(' ') : endMonth ? `${endMonth}` : 'Present';
  return [start, end].filter(Boolean).join(' – ');
}

export function ProjectExperience({ items }: ProjectExperienceProps) {
  if (!items?.length) return null;
  return (
    <section aria-labelledby="projects-heading" className="space-y-4">
      <h2 id="projects-heading" className="text-2xl font-medium mt-8 mb-3">
        Project Experience
      </h2>
      <ul className="space-y-6">
        {items.map((p, idx) => (
          <li key={idx} className="space-y-2">
            <div className="font-medium">
              {p.title}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {formatRange(p.start_month, p.start_year, p.end_month, p.end_year)}
            </div>
            {p.overview ? (
              <p className="text-gray-800 dark:text-zinc-300">{p.overview}</p>
            ) : null}
            {p.tasks?.length ? (
              <ul className="list-disc pl-5 space-y-1 text-gray-800 dark:text-zinc-300">
                {p.tasks.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            ) : null}
            {p.technologies?.length ? (
              <div className="text-sm text-gray-700 dark:text-zinc-300">
                <span className="font-medium">Tech:</span> {p.technologies.join(', ')}
              </div>
            ) : null}
            {p.skills?.length ? (
              <div className="text-sm text-gray-700 dark:text-zinc-300">
                <span className="font-medium">Skills:</span> {p.skills.join(', ')}
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}


