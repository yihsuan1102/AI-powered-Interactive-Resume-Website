import { resumeData } from '@/lib/mock-data';
import { type ResumeData, type Education, type Job, type Project } from '@/lib/types';
import { ResumeSection } from '@/components/ResumeSection';
//import { Chat } from '@/components/Chat';
import { Icons } from '@/components/Icons';

const { contact, aboutMe, education, jobs, projects, skills } = resumeData as ResumeData;

function ContactSection() {
  return (
    <div className="flex flex-col gap-3">
      <a href={contact.email} className="flex items-center gap-2 text-gray-600 hover:text-blue-600">
        {contact.email}
      </a>
      <a href={`tel:${contact.mobile}`} className="flex items-center gap-2 text-gray-600 hover:text-blue-600">
        {contact.mobile}
      </a>
      <a href={contact.github} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-gray-600 hover:text-blue-600">
        <Icons.github className="h-4 w-4" /> GitHub
      </a>
      <a href={contact.linkedin} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-gray-600 hover:text-blue-600">
        <Icons.linkedin className="h-4 w-4" /> LinkedIn
      </a>
    </div>
  );
}

function SkillsSection() {
  return (
    <div>
      <h3 className="text-xl font-semibold text-gray-800 mb-3">Skills</h3>
      <div className="flex flex-wrap gap-2">
        {Object.values(skills).flat().map(skill => (
          <span key={skill} className="bg-gray-200 text-gray-700 text-sm font-medium px-3 py-1 rounded-full">
            {skill}
          </span>
        ))}
      </div>
    </div>
  );
}

function TimelineItem<T extends { start_year: number; end_year: number | string }>({ item, children }: { item: T, children: React.ReactNode }) {
  return (
    <div className="relative pb-8">
      <span className="absolute top-1 left-[-2.1rem] flex h-4 w-4 items-center justify-center rounded-full bg-gray-300"></span>
      <div className="ml-4">
        <p className="text-sm text-gray-500 mb-1">
          {item.start_year} - {item.end_year}
        </p>
        {children}
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <main className="container mx-auto p-4 md:p-8 lg:p-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Left Column */}
          <aside className="lg:col-span-1 lg:sticky top-12 self-start">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h1 className="text-4xl font-bold text-gray-900">{contact.first_name} {contact.last_name}</h1>
              <p className="text-lg text-blue-600 font-medium mt-1">Software Engineer</p>
              <p className="mt-4 text-gray-600">{aboutMe}</p>
              <hr className="my-6" />
              <ContactSection />
              <hr className="my-6" />
              <SkillsSection />
            </div>
          </aside>

          {/* Right Column */}
          <div className="lg:col-span-2">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <ResumeSection title="Work Experience">
                {jobs.map((job: Job, index) => (
                  <TimelineItem key={index} item={job as any}>
                    <h3 className="font-bold text-lg text-gray-800">{job.company}</h3>
                    <p className="italic text-gray-600 my-2">{job.overview}</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-600">
                      {job.tasks.map((task, i) => <li key={i}>{task}</li>)}
                    </ul>
                  </TimelineItem>
                ))}
              </ResumeSection>

              <ResumeSection title="Projects" >
                {projects.map((project: Project, index) => (
                  <div key={index} className="relative pb-8">
                     <span className="absolute top-1 left-[-2.1rem] flex h-4 w-4 items-center justify-center rounded-full bg-gray-300"></span>
                     <h3 className="font-bold text-lg text-gray-800">{project.title}</h3>
                     <p className="italic text-gray-600 my-2">{project.overview}</p>
                     <ul className="list-disc list-inside space-y-1 text-gray-600">
                       {project.tasks.map((task, i) => <li key={i}>{task}</li>)}
                     </ul>
                  </div>
                ))}
              </ResumeSection>

              <ResumeSection title="Education">
                {education.map((edu: Education, index) => (
                  <TimelineItem key={index} item={edu}>
                    <h3 className="font-bold text-lg text-gray-800">{edu.school}</h3>
                    <p className="text-md text-gray-700">{edu.degree}</p>
                  </TimelineItem>
                ))}
              </ResumeSection>
            </div>
          </div>
        </div>

        {/* AI Chat Section */}
        <div className="mt-12">
          {/* <Chat /> */}
        </div>
      </main>
    </div>
  );
}
