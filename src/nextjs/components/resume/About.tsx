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
        Yihsuan Liao is a software developer specializing in full-stack system development, cloud architecture, and LLM application integration. He builds interactive AI-powered resume websites by integrating RAG and LLM APIs within an AWS serverless architecture, enhancing user experience while significantly optimizing cloud hosting costs. With experience across the full software development lifecycle (SDLC) from his full-stack projects, he combines solid software engineering practices with a passion for emerging AI technologies to build solutions that are both reliable and innovative. 
        
      </p>
    </section>
  );
}


