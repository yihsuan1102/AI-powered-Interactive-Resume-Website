import React from 'react';
import type { Contact } from '../../types/resume';

type AboutProps = {
  contact: Contact;
};

export function About({ contact }: AboutProps) {
  const fullName = [contact.first_name, contact.last_name].filter(Boolean).join(' ');
  return (
    <section aria-labelledby="about-heading" className="space-y-2">
      <h1 id="about-heading" className="text-3xl font-semibold tracking-tight">
        {fullName || 'About Me'}
      </h1>
      <p className="text-gray-800 dark:text-zinc-300">
        {/* 可在這裡加上你的自我介紹文字或從 JSON 擴充欄位後顯示 */}
        Welcome to my resume.
      </p>
    </section>
  );
}


