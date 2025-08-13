import { ResumeData } from './types';

export const resumeData: ResumeData = {
  contact: {
    first_name: "Yihsuan",
    last_name: "Liao",
    github: "https://github.com/yihsuan1102",
    linkedin: "https://www.linkedin.com/in/yi-hsuan-liao-a120a3168/",
    email: "logan.yihsuan.liao@gmail.com",
  },
  aboutMe: "A passionate and detail-oriented software developer with a Master's degree in Electrical Engineering. Experienced in full-stack development, machine learning, and building scalable web applications. I thrive on solving complex problems and am always eager to learn new technologies.",
  education: [
    {
      school: "National Cheng Kung University",
      degree: "M.S., Electrical Engineering",
      start_year: 2020,
      end_year: 2024
    },
    {
      school: "National Chung Cheng University",
      degree: "B.S., Electrical Engineering",
      start_year: 2016,
      end_year: 2020
    }
  ],
  jobs: [
    {
      company: "National Cheng Kung University",
      overview: "As a research assistant, I improved student affairs service quality by developing an AI-driven chatbot and managed cloud services to ensure system stability.",
      tasks: [
        "Developed and maintained a student affairs chatbot using Python, Rasa, and a custom knowledge base.",
        "Managed and deployed services on Google Cloud Platform (GCP), including Compute Engine and Cloud SQL.",
        "Collaborated with team members to define project requirements and deliverables."
      ]
    }
  ],
  projects: [
    {
      title: "Full-Stack Web Development for Programming Education",
      overview: "A web application designed to help college students enhance their programming skills through interactive exercises and automated feedback.",
      tasks: [
        "Built the frontend with React and Material-UI, focusing on a responsive and intuitive user experience.",
        "Developed the backend API using Node.js, Express, and PostgreSQL.",
        "Implemented a secure authentication system using JSON Web Tokens (JWT)."
      ]
    },
    {
      title: "Integrated Gesture Recognition System",
      overview: "An innovative system for automated visual acuity testing by integrating pose estimation with a custom-trained gesture recognizer.",
      tasks: [
        "Utilized OpenCV for real-time image processing and feature extraction.",
        "Trained an LSTM-based gesture recognizer using TensorFlow and Keras.",
        "Designed a user-friendly interface with PyQT to guide users through the testing process."
      ]
    }
  ],
  skills: {
    "Programming Languages": ["Python", "JavaScript (ES6+)", "TypeScript", "C/C++", "Java"],
    "Web Development": ["React", "Next.js", "Node.js", "Express", "HTML5 & CSS3"],
    "Machine Learning": ["TensorFlow", "Pandas", "Scikit-learn", "OpenCV"],
    "Databases": ["PostgreSQL", "MySQL", "MongoDB"],
    "Tools & Platforms": ["Git", "Docker", "Google Cloud Platform (GCP)", "Vercel"]
  }
};
