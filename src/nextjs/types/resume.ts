export type EducationItem = {
  school: string;
  location?: string;
  degree?: string;
  start_month?: string;
  start_year?: number;
  end_month?: string | null;
  end_year?: number | null;
  laboratory?: string;
  advisor?: string;
  thesis?: string;
};

export type JobItem = {
  company: string;
  start_month?: string;
  start_year?: number;
  end_month?: string | null;
  end_year?: number | null;
  overview?: string;
  tasks?: string[];
  technologies?: string[];
};

export type ProjectItem = {
  title: string;
  start_month?: string;
  start_year?: number;
  end_month?: string | null;
  end_year?: number | null;
  overview?: string;
  tasks?: string[];
  technologies?: string[];
  skills?: string[];
};

export type Contact = {
  first_name?: string;
  last_name?: string;
  github?: string;
  linkedin?: string;
  email?: string;
};

export type SkillsGroups = Record<string, string[]>;

export type Resume = {
  contact: Contact;
  education: EducationItem[];
  jobs: JobItem[];
  projects: ProjectItem[];
  skills: SkillsGroups;
};


