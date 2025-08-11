export interface ResumeData {
  contact: Contact;
  education: Education[];
  jobs: Job[];
  projects: Project[];
  skills: Record<string, string[]>;
  aboutMe: string;
}

export interface Contact {
  first_name: string;
  last_name: string;
  github: string;
  linkedin: string;
  email: string;
  mobile: string;
}

export interface Education {
  school: string;
  degree: string;
  start_year: number;
  end_year: number | string;
}

export interface Job {
  company: string;
  overview: string;
  tasks: string[];
}

export interface Project {
  title: string;
  overview: string;
  tasks: string[];
}
