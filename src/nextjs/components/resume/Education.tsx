import React from 'react';
import type { EducationItem } from '../../types/resume';

type EducationProps = {
  items: EducationItem[];
};

function formatRange(startMonth?: string, startYear?: number, endMonth?: string | null, endYear?: number | null) {
  const start = [startMonth, startYear].filter(Boolean).join(' ');
  const end = endYear ? [endMonth, endYear].filter(Boolean).join(' ') : endMonth ? `${endMonth}` : 'Present';
  return [start, end].filter(Boolean).join(' – ');
}

export function Education({ items }: EducationProps) {
  if (!items?.length) return null;
  return (
    <section aria-labelledby="education-heading" className="space-y-4">
      <h2 id="education-heading" className="text-2xl font-medium mt-8 mb-3">
        Education
      </h2>
      <ul className="space-y-4">
        {items.map((ed, idx) => (
          <li key={idx} className="space-y-1">
            <div className="font-medium">
              {ed.school}
              {ed.degree ? <span className="text-gray-500 dark:text-gray-400"> — {ed.degree}</span> : null}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {[ed.location, formatRange(ed.start_month, ed.start_year, ed.end_month, ed.end_year)]
                .filter(Boolean)
                .join(' · ')}
            </div>
            {ed.laboratory || ed.advisor || ed.thesis ? (
              <ul className="list-disc pl-5 space-y-1 text-gray-800 dark:text-zinc-300">
                {ed.laboratory ? <li>Lab: {ed.laboratory}</li> : null}
                {ed.advisor ? <li>Advisor: {ed.advisor}</li> : null}
                {ed.thesis ? <li>Thesis: {ed.thesis}</li> : null}
              </ul>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}


