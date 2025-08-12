import React from 'react';
import resume from '../data/resume.json';
import type { Resume } from '../types/resume';
import { About } from '../components/resume/About';
import { Education } from '../components/resume/Education';
import { JobExperience } from '../components/resume/JobExperience';
import { ProjectExperience } from '../components/resume/ProjectExperience';
import { Skills } from '../components/resume/Skills';
import { Contact } from '../components/resume/Contact';

const data = resume as Resume;

export default function Page() {
  return (
    <>
      <About contact={data.contact} />
      <Education items={data.education} />
      <JobExperience items={data.jobs} />
      <ProjectExperience items={data.projects} />
      <Skills groups={data.skills} />
      <Contact contact={data.contact} />
    </>
  );
}
