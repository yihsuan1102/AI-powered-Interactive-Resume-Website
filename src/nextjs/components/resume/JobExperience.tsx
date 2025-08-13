import React from 'react';
import type { JobItem } from '../../types/resume';

type JobExperienceProps = {
  items: JobItem[];
};

function formatRange(startMonth?: string, startYear?: number, endMonth?: string | null, endYear?: number | null) {
  const start = [startMonth, startYear].filter(Boolean).join(' ');
  const end = endYear ? [endMonth, endYear].filter(Boolean).join(' ') : endMonth ? `${endMonth}` : 'Present';
  return [start, end].filter(Boolean).join(' – ');
}

export function JobExperience({ items }: JobExperienceProps) {
  if (!items?.length) return null;
  return (
    <section aria-labelledby="jobs-heading" className="space-y-4">
      <h2 id="jobs-heading" className="text-2xl font-medium mt-8 mb-3">
        Job Experience
      </h2>
      <ul className="space-y-6">
        {items.map((job, idx) => (
          <li key={idx} className="space-y-2">
            <div className="text-lg font-medium">
              {job.company}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {formatRange(job.start_month, job.start_year, job.end_month, job.end_year)}
            </div>
            {job.overview ? (
              <p className="text-gray-800 dark:text-zinc-300">{job.overview}</p>
            ) : null}
            {job.tasks?.length ? (
              <ul className="list-disc pl-5 space-y-1 text-gray-800 dark:text-zinc-300">
                {job.tasks.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            ) : null}
            {job.technologies?.length ? (
              <div className="text-sm text-gray-700 dark:text-zinc-300">
                <span className="font-medium">Tech:</span> {job.technologies.join(', ')}
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}


