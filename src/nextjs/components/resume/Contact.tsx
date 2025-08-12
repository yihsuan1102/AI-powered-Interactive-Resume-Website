import React from 'react';
import type { Contact as ContactType } from '../../types/resume';

type ContactProps = {
  contact: ContactType;
};

export function Contact({ contact }: ContactProps) {
  if (!contact) return null;
  const items = [
    contact.email ? { name: 'email', url: `mailto:${contact.email}` } : null,
    contact.github ? { name: 'github', url: contact.github } : null,
    contact.linkedin ? { name: 'linkedin', url: contact.linkedin } : null
  ].filter(Boolean) as { name: string; url: string }[];

  if (!items.length) return null;

  return (
    <section aria-labelledby="contact-heading" className="space-y-3">
      <h2 id="contact-heading" className="text-2xl font-medium mt-8 mb-3">
        Contact
      </h2>
      <div className="flex flex-wrap gap-4">
        {items.map((link) => (
          <a
            key={link.name}
            href={link.url}
            target={link.url.startsWith('mailto:') ? '_self' : '_blank'}
            rel="noopener noreferrer"
            className="text-blue-500 hover:text-blue-700 dark:text-gray-400 hover:dark:text-gray-300 dark:underline dark:underline-offset-2 dark:decoration-gray-800"
          >
            {link.name}
          </a>
        ))}
      </div>
    </section>
  );
}


