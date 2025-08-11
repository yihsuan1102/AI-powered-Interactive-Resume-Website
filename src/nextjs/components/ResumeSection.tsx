import React from 'react';

interface ResumeSectionProps {
  title: string;
  icon?: React.ElementType;
  children: React.ReactNode;
  iconSize: number;
}

export function ResumeSection({ title, icon: Icon, children, iconSize = 5 }: ResumeSectionProps) {
  return (
    <section className="mb-8">
      <h2 className="flex items-center text-2xl font-bold text-gray-800 mb-4">
        {Icon && <Icon className={`h-${iconSize} w-${iconSize} mr-3 text-blue-600`} />}
        {title}
      </h2>
      <div className="border-l-2 border-gray-200 pl-6">
        {children}
      </div>
    </section>
  );
}
