import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import resume from '../data/resume.json';
import type { Resume } from '../types/resume';

const data = resume as Resume;

const inter = Inter({ subsets: ['latin'] });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
const fullName = [data?.contact?.first_name, data?.contact?.last_name]
  .filter(Boolean)
  .join(' ') || 'Resume';
const description = `Resume website for ${fullName}, showcasing projects, skills, and experience.`;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  alternates: { canonical: '/' },
  title: {
    default: fullName,
    template: `%s | ${fullName}`
  },
  description,
  openGraph: {
    title: fullName,
    description,
    url: siteUrl,
    siteName: fullName,
    locale: 'en',
    type: 'website'
  },
  twitter: {
    card: 'summary_large_image',
    title: fullName,
    description
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.className}`}>
      <body className="antialiased tracking-tight">
        <div className="min-h-screen flex flex-col justify-between pt-0 md:pt-8 p-8 dark:bg-zinc-950 bg-white text-gray-900 dark:text-zinc-200">
          <main className="max-w-[60ch] mx-auto w-full space-y-6">
            {children}
          </main>
          <Footer />
        </div>
      </body>
    </html>
  );
}

function Footer() {
  const contact = data.contact || {};
  const links = [
    contact.github ? { name: 'github', url: contact.github } : null,
    contact.linkedin ? { name: 'linkedin', url: contact.linkedin } : null,
    contact.email ? { name: 'email', url: `mailto:${contact.email}` } : null
  ].filter(Boolean) as { name: string; url: string }[];

  if (!links.length) return null;

  return (
    <footer className="mt-12 text-center">
      <div className="flex justify-center space-x-4 tracking-tight">
        {links.map((link) => (
          <a
            key={link.name}
            href={link.url}
            target={link.url.startsWith('mailto:') ? '_self' : '_blank'}
            rel="noopener noreferrer"
            className="text-gray-400 dark:text-gray-500 hover:text-blue-500 transition-colors duration-200"
          >
            {link.name}
          </a>
        ))}
      </div>
    </footer>
  );
}

