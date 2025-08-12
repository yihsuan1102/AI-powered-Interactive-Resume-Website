import React from 'react';
import type { SkillsGroups } from '../../types/resume';

type SkillsProps = {
  groups: SkillsGroups;
};

export function Skills({ groups }: SkillsProps) {
  if (!groups) return null;
  const entries = Object.entries(groups);
  if (!entries.length) return null;
  return (
    <section aria-labelledby="skills-heading" className="space-y-4">
      <h2 id="skills-heading" className="text-2xl font-medium mt-8 mb-3">
        Skills
      </h2>
      <div className="space-y-3">
        {entries.map(([group, items]) => (
          <div key={group} className="text-gray-800 dark:text-zinc-300">
            <span className="font-medium">{group}:</span>{' '}
            {items.join(', ')}
          </div>
        ))}
      </div>
    </section>
  );
}


