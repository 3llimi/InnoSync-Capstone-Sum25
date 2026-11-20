// Mock content for the InnoSync showcase. All people, companies and projects are fictional.
//
// Rules the data must follow (see scripts/seed-demo.mjs):
//  - `position` strings must match project `roleName` strings exactly: the ML recommender
//    indexes candidates by position and looks roles up by name.
//  - Every profile is complete (education, level, experience, work history with an end date),
//    because one incomplete profile breaks ML recommendations for everyone.
//  - Technology names are case-sensitive in the API, so keep one canonical spelling.
//  - `expertise` mirrors `expertise_level`, as the sign-up UI sends it.

export const DEMO_EMAIL = "demo@example.com";

// [position, company, startDate, endDate, description]
const job = (position, company, startDate, endDate, description) => ({
  position, company, startDate, endDate, description,
});

export const users = [
  // ───────────── Demo account (recruiter + talent) ─────────────
  {
    email: DEMO_EMAIL, fullName: "Demo User", demo: true,
    telegram: "demo_user", github: "demo-user",
    bio: "Product manager who likes turning messy ideas into shipped products. Currently exploring how AI can help student and early-career teams find the right collaborators.",
    position: "Product Manager", education: "MASTER", level: "SENIOR", years: "SEVEN_TO_TEN",
    technologies: ["Jira", "Figma", "SQL", "Tableau"],
    work: [
      job("Product Manager", "Kite Analytics", "2021-03-01", "2026-09-30", "Led a 12-person team building a self-serve analytics product from zero to 40k monthly users."),
      job("Associate Product Manager", "Northwind Labs", "2018-07-01", "2021-02-28", "Owned onboarding and activation, lifting week-one retention by 18%."),
    ],
  },

  // ───────────── Project owners ─────────────
  {
    email: "priya.nair@example.com", fullName: "Priya Nair",
    telegram: "priya_builds", github: "priya-nair-dev",
    bio: "Backend lead with a soft spot for reliable healthcare software. I mentor juniors and care a lot about clean APIs and good on-call hygiene.",
    position: "Backend Developer", education: "MASTER", level: "SENIOR", years: "SEVEN_TO_TEN",
    technologies: ["Java", "Spring Boot", "PostgreSQL", "Docker", "AWS"],
    work: [
      job("Senior Backend Engineer", "MedLoop", "2020-05-01", "2026-10-01", "Designed the patient-records API serving 2M requests a day with 99.95% uptime."),
      job("Backend Engineer", "BlueOrbit", "2016-09-01", "2020-04-30", "Built billing and notification services in Java and Spring Boot."),
    ],
  },
  {
    email: "marcus.lindqvist@example.com", fullName: "Marcus Lindqvist",
    telegram: "marcus_ops", github: "mlindqvist-ops",
    bio: "Platform engineer who automates everything twice. I run infrastructure for small teams and enjoy teaching people to ship safely on Fridays.",
    position: "DevOps Engineer", education: "BACHELOR", level: "SENIOR", years: "MORE_THAN_TEN",
    technologies: ["Kubernetes", "Terraform", "AWS", "Docker", "CI/CD", "Go"],
    work: [
      job("Lead Platform Engineer", "Fjord Systems", "2019-02-01", "2026-10-15", "Moved 60 services to Kubernetes and cut deploy time from 40 minutes to 6."),
      job("DevOps Engineer", "Aurora Hosting", "2013-06-01", "2019-01-31", "Maintained CI pipelines and on-call rotations for a 200-server fleet."),
    ],
  },
  {
    email: "sofia.alvarez@example.com", fullName: "Sofia Alvarez",
    telegram: "sofia_nlp", github: "sofia-alvarez-ml",
    bio: "NLP researcher working on low-resource languages. I enjoy small, curious teams and turning papers into code other people can actually run.",
    position: "ML Engineer", education: "PHD", level: "RESEARCHER", years: "FIVE_TO_SEVEN",
    technologies: ["PyTorch", "Python", "TensorFlow", "scikit-learn"],
    work: [
      job("Research Scientist", "Lumen AI Lab", "2022-01-01", "2026-09-01", "Published three papers on transfer learning for under-resourced languages."),
      job("Research Intern", "Orion Institute", "2019-06-01", "2019-12-15", "Prototyped speech-recognition baselines for regional dialects."),
    ],
  },

  // ───────────── Frontend ─────────────
  {
    email: "amir.hassan@example.com", fullName: "Amir Hassan",
    telegram: "amir_codes", github: "amirhassan-fe",
    bio: "Frontend developer who sweats the details: accessible components, smooth transitions and fast first loads.",
    position: "Frontend Developer", education: "BACHELOR", level: "MID", years: "THREE_TO_FIVE",
    technologies: ["React", "TypeScript", "Next.js", "CSS"],
    work: [
      job("Frontend Developer", "PixelForge", "2022-04-01", "2026-08-31", "Rebuilt the customer dashboard in Next.js, improving Lighthouse performance from 54 to 92."),
      job("Junior Web Developer", "Studio Marlow", "2021-01-01", "2022-03-31", "Shipped marketing sites and a component library used across 15 client projects."),
    ],
  },
  {
    email: "lena.fischer@example.com", fullName: "Lena Fischer",
    telegram: "lena_fe", github: "lenafischer",
    bio: "Senior frontend engineer and part-time design-systems nerd. Happy to lead a UI team or pair with designers on tricky interactions.",
    position: "Frontend Developer", education: "MASTER", level: "SENIOR", years: "SEVEN_TO_TEN",
    technologies: ["React", "TypeScript", "Next.js", "GraphQL", "CSS", "Cypress"],
    work: [
      job("Senior Frontend Engineer", "Helix Commerce", "2020-09-01", "2026-10-01", "Led the design-system rewrite adopted by six product teams."),
      job("Frontend Engineer", "Nordlicht", "2017-03-01", "2020-08-31", "Built real-time dashboards with React and GraphQL subscriptions."),
    ],
  },
  {
    email: "tomas.herrera@example.com", fullName: "Tomás Herrera",
    telegram: "tomas_dev", github: "tomasherrera-ui",
    bio: "Recent graduate who loves building interfaces. Looking for a team where I can learn fast and ship real features.",
    position: "Frontend Developer", education: "BACHELOR", level: "JUNIOR", years: "ONE_TO_THREE",
    technologies: ["React", "CSS", "TypeScript"],
    work: [
      job("Frontend Intern", "Cobalt Software", "2024-06-01", "2025-02-28", "Implemented responsive screens from Figma designs and fixed 60+ UI bugs."),
    ],
  },

  // ───────────── Backend ─────────────
  {
    email: "diego.ramos@example.com", fullName: "Diego Ramos",
    telegram: "diego_java", github: "diegoramos-be",
    bio: "Backend developer focused on clean domain models and well-tested APIs. Comfortable owning a service from schema to deployment.",
    position: "Backend Developer", education: "BACHELOR", level: "MID", years: "THREE_TO_FIVE",
    technologies: ["Java", "Spring Boot", "PostgreSQL", "Redis"],
    work: [
      job("Backend Developer", "Tidewater Payments", "2022-02-01", "2026-09-15", "Cut checkout latency by 35% through query tuning and Redis caching."),
      job("Junior Java Developer", "Cobalt Software", "2020-08-01", "2022-01-31", "Maintained REST services and wrote integration tests."),
    ],
  },
  {
    email: "anika.sharma@example.com", fullName: "Anika Sharma",
    telegram: "anika_py", github: "anikasharma-api",
    bio: "Python backend developer who enjoys FastAPI and thoughtful API design. Always up for a hackathon.",
    position: "Backend Developer", education: "BACHELOR", level: "JUNIOR", years: "ONE_TO_THREE",
    technologies: ["Python", "FastAPI", "PostgreSQL", "Docker"],
    work: [
      job("Junior Backend Developer", "Kite Analytics", "2024-01-01", "2026-09-30", "Built reporting endpoints and background jobs for an analytics platform."),
    ],
  },

  // ───────────── Full stack ─────────────
  {
    email: "yuki.sato@example.com", fullName: "Yuki Sato",
    telegram: "yuki_fs", github: "yukisato-fullstack",
    bio: "Full-stack developer who likes owning features end to end, from the database migration to the loading spinner.",
    position: "Full Stack Developer", education: "MASTER", level: "MID", years: "THREE_TO_FIVE",
    technologies: ["React", "Node.js", "TypeScript", "PostgreSQL"],
    work: [
      job("Full Stack Developer", "Sakura Labs", "2022-05-01", "2026-09-01", "Shipped a booking platform used by 300 venues, front end to payments."),
      job("Web Developer", "Studio Marlow", "2021-01-01", "2022-04-30", "Built internal tools in React and Node.js."),
    ],
  },
  {
    email: "omar.khalil@example.com", fullName: "Omar Khalil",
    telegram: "omar_stack", github: "omarkhalil-dev",
    bio: "Senior full-stack engineer and occasional tech lead. I like pragmatic architecture and teams that talk to their users.",
    position: "Full Stack Developer", education: "BACHELOR", level: "SENIOR", years: "SEVEN_TO_TEN",
    technologies: ["React", "Node.js", "TypeScript", "AWS", "GraphQL"],
    work: [
      job("Senior Full Stack Engineer", "Dune Commerce", "2019-11-01", "2026-10-01", "Led a team of five rebuilding checkout, increasing conversion by 11%."),
      job("Full Stack Developer", "Mirage Apps", "2016-04-01", "2019-10-31", "Built and shipped a marketplace MVP in four months."),
    ],
  },

  // ───────────── Design ─────────────
  {
    email: "mei.tanaka@example.com", fullName: "Mei Tanaka",
    telegram: "mei_designs", github: "meitanaka-ux",
    bio: "Product designer who runs user interviews, sketches fast and prototypes in Figma. Believes good UX is mostly good questions.",
    position: "UI/UX Designer", education: "BACHELOR", level: "MID", years: "THREE_TO_FIVE",
    technologies: ["Figma", "CSS"],
    work: [
      job("Product Designer", "Sakura Labs", "2022-03-01", "2026-09-01", "Redesigned onboarding, reducing drop-off from 41% to 23%."),
      job("UI Designer", "Studio Marlow", "2021-01-01", "2022-02-28", "Produced design systems and marketing visuals for startup clients."),
    ],
  },
  {
    email: "isabella.rossi@example.com", fullName: "Isabella Rossi",
    telegram: "isa_ux", github: "isabellarossi-ux",
    bio: "Early-career designer with a research background. I love turning interview notes into simple, friendly interfaces.",
    position: "UI/UX Designer", education: "BACHELOR", level: "JUNIOR", years: "ONE_TO_THREE",
    technologies: ["Figma", "CSS"],
    work: [
      job("UX Design Intern", "Cobalt Software", "2024-07-01", "2025-03-31", "Ran usability tests and delivered prototypes for two mobile features."),
    ],
  },

  // ───────────── Data & ML ─────────────
  {
    email: "elena.petrova@example.com", fullName: "Elena Petrova",
    telegram: "elena_data", github: "elenapetrova-ds",
    bio: "Data scientist with a PhD in applied statistics. I like problems where good modelling and clear communication both matter.",
    position: "Data Scientist", education: "PHD", level: "SENIOR", years: "FIVE_TO_SEVEN",
    technologies: ["Python", "Pandas", "scikit-learn", "SQL"],
    work: [
      job("Senior Data Scientist", "Kite Analytics", "2021-06-01", "2026-09-30", "Built churn and demand-forecasting models now used in weekly planning."),
      job("Data Scientist", "Orion Institute", "2019-09-01", "2021-05-31", "Ran experiments and statistical analyses for public-health studies."),
    ],
  },
  {
    email: "kwame.mensah@example.com", fullName: "Kwame Mensah",
    telegram: "kwame_analytics", github: "kwamemensah-data",
    bio: "Analytics-minded data scientist who enjoys turning raw tables into decisions. Strong with SQL and storytelling.",
    position: "Data Scientist", education: "MASTER", level: "MID", years: "THREE_TO_FIVE",
    technologies: ["Python", "Pandas", "SQL", "Tableau"],
    work: [
      job("Data Analyst", "Savannah Bank", "2021-09-01", "2024-02-29", "Automated weekly reporting, saving the finance team 15 hours a week."),
      job("Data Scientist", "Tidewater Payments", "2024-03-01", "2026-09-01", "Built a fraud-scoring prototype that reduced false positives by 22%."),
    ],
  },
  {
    email: "noor.rahman@example.com", fullName: "Noor Rahman",
    telegram: "noor_ml", github: "noorrahman-ml",
    bio: "ML engineer who ships models, not just notebooks. Interested in recommender systems and practical MLOps.",
    position: "ML Engineer", education: "MASTER", level: "MID", years: "THREE_TO_FIVE",
    technologies: ["PyTorch", "Python", "Docker", "TensorFlow"],
    work: [
      job("ML Engineer", "Lumen AI Lab", "2022-02-01", "2026-09-01", "Productionised a recommendation model serving 50 requests per second."),
      job("Junior ML Engineer", "Aurora Hosting", "2021-01-01", "2022-01-31", "Maintained training pipelines and model-monitoring dashboards."),
    ],
  },
  {
    email: "aisha.bello@example.com", fullName: "Aisha Bello",
    telegram: "aisha_ai", github: "aishabello-ai",
    bio: "Senior ML engineer. I enjoy taking research prototypes to production and mentoring people through their first model launch.",
    position: "ML Engineer", education: "MASTER", level: "SENIOR", years: "SEVEN_TO_TEN",
    technologies: ["PyTorch", "Python", "Docker", "AWS"],
    work: [
      job("Senior ML Engineer", "Helix Commerce", "2020-04-01", "2026-10-01", "Led the search-ranking team; improved click-through rate by 9%."),
      job("ML Engineer", "Mirage Apps", "2017-02-01", "2020-03-31", "Built image-classification services for a photo-sharing app."),
    ],
  },

  // ───────────── DevOps ─────────────
  {
    email: "kenji.watanabe@example.com", fullName: "Kenji Watanabe",
    telegram: "kenji_infra", github: "kenjiwatanabe-ops",
    bio: "DevOps engineer who loves boring, reliable pipelines. Experienced with Kubernetes migrations and cost optimisation.",
    position: "DevOps Engineer", education: "BACHELOR", level: "MID", years: "THREE_TO_FIVE",
    technologies: ["Docker", "Kubernetes", "CI/CD", "AWS"],
    work: [
      job("DevOps Engineer", "Sakura Labs", "2022-01-01", "2026-09-01", "Reduced cloud spend by 28% with right-sizing and autoscaling."),
      job("Systems Administrator", "Aurora Hosting", "2020-06-01", "2021-12-31", "Managed Linux servers and monitoring for 80 customers."),
    ],
  },
  {
    email: "lucas.moreau@example.com", fullName: "Lucas Moreau",
    telegram: "lucas_ci", github: "lucasmoreau-ci",
    bio: "Junior DevOps engineer eager to learn. I enjoy scripting, Dockerising apps and watching green pipelines.",
    position: "DevOps Engineer", education: "BACHELOR", level: "JUNIOR", years: "ONE_TO_THREE",
    technologies: ["Docker", "CI/CD", "Terraform", "AWS"],
    work: [
      job("DevOps Intern", "Fjord Systems", "2024-05-01", "2025-04-30", "Wrote Terraform modules and GitHub Actions pipelines for internal tools."),
    ],
  },

  // ───────────── Mobile ─────────────
  {
    email: "chidi.okafor@example.com", fullName: "Chidi Okafor",
    telegram: "chidi_mobile", github: "chidiokafor-mobile",
    bio: "Mobile developer building cross-platform apps with Flutter and native Android. I care about performance on low-end devices.",
    position: "Mobile Developer", education: "BACHELOR", level: "MID", years: "THREE_TO_FIVE",
    technologies: ["Flutter", "Kotlin"],
    work: [
      job("Mobile Developer", "Savannah Bank", "2022-03-01", "2026-09-01", "Shipped a mobile-money app used by 400k people on low-bandwidth networks."),
      job("Android Developer", "Mirage Apps", "2020-06-01", "2022-02-28", "Maintained a Kotlin app with 4.6 store rating."),
    ],
  },
  {
    email: "hana.kim@example.com", fullName: "Hana Kim",
    telegram: "hana_ios", github: "hanakim-ios",
    bio: "Senior iOS engineer who loves smooth animations and tidy architecture. Open to mentoring and to leading small mobile teams.",
    position: "Mobile Developer", education: "MASTER", level: "SENIOR", years: "SEVEN_TO_TEN",
    technologies: ["Swift", "React Native", "Kotlin"],
    work: [
      job("Senior iOS Engineer", "Helix Commerce", "2019-08-01", "2026-10-01", "Led the iOS rewrite in Swift, reducing crash rate by 70%."),
      job("iOS Developer", "Seoul Apps", "2016-03-01", "2019-07-31", "Built consumer apps with over a million downloads."),
    ],
  },

  // ───────────── QA ─────────────
  {
    email: "rafael.costa@example.com", fullName: "Rafael Costa",
    telegram: "rafa_qa", github: "rafaelcosta-qa",
    bio: "QA engineer who treats test suites as a product. I enjoy exploratory testing and automation that people actually trust.",
    position: "QA Engineer", education: "BACHELOR", level: "MID", years: "THREE_TO_FIVE",
    technologies: ["Selenium", "Cypress", "Jira", "Python"],
    work: [
      job("QA Engineer", "Tidewater Payments", "2022-06-01", "2026-09-01", "Built a Cypress regression suite that catches 90% of releases' defects before staging."),
      job("QA Analyst", "Cobalt Software", "2020-09-01", "2022-05-31", "Wrote test plans and automated smoke tests."),
    ],
  },
];

// ───────────── Projects (the job offers) ─────────────
// Role counts follow the team-size rule the UI enforces: OneThree = 1-3, FourSix = 4-6, SevenPlus = 7+.
// teamSize values are the API enum names; projectType: FREELANCE | RESEARCH | ACADEMIC | HACKATHON.
const role = (roleName, expertiseLevel, technologies) => ({ roleName, expertiseLevel, technologies });

export const projects = [
  // Demo account's projects
  {
    owner: DEMO_EMAIL, title: "CampusConnect: Student Collaboration Platform",
    projectType: "ACADEMIC", teamSize: "FourSix",
    description: "A web platform where students form project teams, share skills and find mentors across departments. We are building the MVP for a pilot with two faculties this spring. Great portfolio piece with real users.",
    roles: [
      role("Frontend Developer", "MID", ["React", "TypeScript", "Next.js"]),
      role("Backend Developer", "MID", ["Java", "Spring Boot", "PostgreSQL"]),
      role("UI/UX Designer", "JUNIOR", ["Figma", "CSS"]),
      role("QA Engineer", "JUNIOR", ["Cypress", "Selenium"]),
    ],
  },
  {
    owner: DEMO_EMAIL, title: "EcoTrack: Personal Carbon Footprint App",
    projectType: "FREELANCE", teamSize: "OneThree",
    description: "A small paid contract: a mobile app that estimates a user's weekly carbon footprint from everyday habits and suggests simple improvements. Three-month scope with a clear spec and a friendly client.",
    roles: [
      role("Mobile Developer", "MID", ["Flutter", "Kotlin"]),
      role("Backend Developer", "JUNIOR", ["Python", "FastAPI", "PostgreSQL"]),
      role("UI/UX Designer", "MID", ["Figma"]),
    ],
  },
  {
    owner: DEMO_EMAIL, title: "AI Study Buddy (48-hour Hackathon)",
    projectType: "HACKATHON", teamSize: "FourSix",
    description: "Build an AI tutor that turns lecture notes into quizzes and spaced-repetition cards in a single weekend. We have a working idea, a demo script and a prize to chase. Come ready to ship fast.",
    roles: [
      role("ML Engineer", "SENIOR", ["PyTorch", "Python"]),
      role("Data Scientist", "MID", ["Pandas", "scikit-learn", "Python"]),
      role("Full Stack Developer", "MID", ["React", "Node.js", "TypeScript"]),
      role("DevOps Engineer", "JUNIOR", ["Docker", "AWS"]),
    ],
  },

  // Priya Nair
  {
    owner: "priya.nair@example.com", title: "HealthSync Patient Portal",
    projectType: "FREELANCE", teamSize: "FourSix",
    description: "A secure portal for small clinics to share appointments, lab results and messages with patients. Privacy-first, accessibility-first. Paid engagement with weekly demos and a product owner who knows the domain.",
    roles: [
      role("Full Stack Developer", "SENIOR", ["React", "Node.js", "TypeScript"]),
      role("UI/UX Designer", "MID", ["Figma", "CSS"]),
      role("QA Engineer", "MID", ["Cypress", "Selenium", "Jira"]),
      role("Product Manager", "SENIOR", ["Jira", "Figma"]),
    ],
  },
  {
    owner: "priya.nair@example.com", title: "Open City Transport Dashboard",
    projectType: "RESEARCH", teamSize: "OneThree",
    description: "A research collaboration with a city transport office: clean open transit data, model passenger demand and publish an interactive dashboard that citizens can explore.",
    roles: [
      role("Data Scientist", "MID", ["Python", "Pandas", "SQL", "Tableau"]),
      role("Frontend Developer", "MID", ["React", "TypeScript"]),
      role("Backend Developer", "MID", ["Python", "FastAPI", "PostgreSQL"]),
    ],
  },

  // Marcus Lindqvist
  {
    owner: "marcus.lindqvist@example.com", title: "CloudNative Migration Toolkit",
    projectType: "FREELANCE", teamSize: "FourSix",
    description: "An open-core toolkit that helps small teams migrate from a single VM to Kubernetes with sensible defaults, templates and dashboards. Paid contract work with room to grow into a long-term engagement.",
    roles: [
      role("DevOps Engineer", "SENIOR", ["Kubernetes", "Terraform", "AWS"]),
      role("DevOps Engineer", "MID", ["Docker", "CI/CD", "Kubernetes"]),
      role("Backend Developer", "MID", ["Java", "Docker"]),
      role("QA Engineer", "MID", ["Python", "Selenium"]),
    ],
  },
  {
    owner: "marcus.lindqvist@example.com", title: "SecureChat: End-to-End Encrypted Messenger",
    projectType: "HACKATHON", teamSize: "OneThree",
    description: "A three-person sprint to prototype an end-to-end encrypted messenger with disappearing messages. Security-focused, ambitious and very demo-friendly.",
    roles: [
      role("Mobile Developer", "SENIOR", ["Swift", "Kotlin", "React Native"]),
      role("Backend Developer", "MID", ["Java", "Spring Boot", "Redis"]),
      role("DevOps Engineer", "MID", ["Docker", "CI/CD"]),
    ],
  },
  {
    owner: "marcus.lindqvist@example.com", title: "Smart City Hackathon: Urban Mobility Suite",
    projectType: "HACKATHON", teamSize: "SevenPlus",
    description: "A full-weekend, eight-role effort to build a multi-modal urban mobility suite: route planning, live traffic, bike-share and a public dashboard. Big team, big stage, real city partners judging.",
    roles: [
      role("Frontend Developer", "MID", ["React", "TypeScript", "CSS"]),
      role("Backend Developer", "MID", ["Java", "Spring Boot", "PostgreSQL"]),
      role("Mobile Developer", "MID", ["Flutter", "Kotlin"]),
      role("UI/UX Designer", "MID", ["Figma", "CSS"]),
      role("Data Scientist", "MID", ["Python", "Pandas", "SQL"]),
      role("DevOps Engineer", "MID", ["Docker", "Kubernetes", "AWS"]),
      role("QA Engineer", "JUNIOR", ["Cypress", "Selenium"]),
      role("Product Manager", "MID", ["Jira", "Figma"]),
    ],
  },

  // Sofia Alvarez
  {
    owner: "sofia.alvarez@example.com", title: "Low-Resource Language Translation Research",
    projectType: "RESEARCH", teamSize: "FourSix",
    description: "A research group building open translation models for under-resourced languages, with datasets, baselines and a public demo. Publication-oriented, with weekly reading groups and shared GPU time.",
    roles: [
      role("ML Engineer", "RESEARCHER", ["PyTorch", "TensorFlow", "Python"]),
      role("Data Scientist", "SENIOR", ["Python", "Pandas", "scikit-learn"]),
      role("Backend Developer", "JUNIOR", ["Python", "FastAPI"]),
      role("Frontend Developer", "JUNIOR", ["React", "TypeScript"]),
    ],
  },
  {
    owner: "sofia.alvarez@example.com", title: "University Timetable Optimizer",
    projectType: "ACADEMIC", teamSize: "OneThree",
    description: "A course project to generate conflict-free timetables for a university with constraint solving, a friendly web UI and an API other tools can call. Looking for a small, committed team.",
    roles: [
      role("Backend Developer", "MID", ["Python", "FastAPI", "PostgreSQL"]),
      role("Frontend Developer", "JUNIOR", ["React", "CSS", "TypeScript"]),
      role("Product Manager", "MID", ["Jira"]),
    ],
  },
];

// ───────────── Applications (talent → role), then the owner responds ─────────────
// status: PENDING | UNDER_REVIEW | ACCEPTED | REJECTED. `nth` picks the nth role with a duplicate name.
export const applications = [
  // Into the demo account's projects
  { who: "amir.hassan@example.com",   project: "CampusConnect: Student Collaboration Platform", role: "Frontend Developer", status: "PENDING" },
  { who: "tomas.herrera@example.com", project: "CampusConnect: Student Collaboration Platform", role: "Frontend Developer", status: "UNDER_REVIEW" },
  { who: "diego.ramos@example.com",   project: "CampusConnect: Student Collaboration Platform", role: "Backend Developer",  status: "ACCEPTED" },
  { who: "isabella.rossi@example.com",project: "CampusConnect: Student Collaboration Platform", role: "UI/UX Designer",     status: "PENDING" },
  { who: "rafael.costa@example.com",  project: "CampusConnect: Student Collaboration Platform", role: "QA Engineer",        status: "REJECTED" },
  { who: "chidi.okafor@example.com",  project: "EcoTrack: Personal Carbon Footprint App",       role: "Mobile Developer",   status: "UNDER_REVIEW" },
  { who: "anika.sharma@example.com",  project: "EcoTrack: Personal Carbon Footprint App",       role: "Backend Developer",  status: "PENDING" },
  { who: "mei.tanaka@example.com",    project: "EcoTrack: Personal Carbon Footprint App",       role: "UI/UX Designer",     status: "ACCEPTED" },
  { who: "noor.rahman@example.com",   project: "AI Study Buddy (48-hour Hackathon)",            role: "ML Engineer",        status: "PENDING" },
  { who: "kwame.mensah@example.com",  project: "AI Study Buddy (48-hour Hackathon)",            role: "Data Scientist",     status: "PENDING" },
  { who: "yuki.sato@example.com",     project: "AI Study Buddy (48-hour Hackathon)",            role: "Full Stack Developer", status: "UNDER_REVIEW" },

  // The demo account applying elsewhere
  { who: DEMO_EMAIL, project: "University Timetable Optimizer",              role: "Product Manager", status: "UNDER_REVIEW" },
  { who: DEMO_EMAIL, project: "Smart City Hackathon: Urban Mobility Suite", role: "Product Manager", status: "PENDING" },

  // Background activity on other owners' projects
  { who: "omar.khalil@example.com",   project: "HealthSync Patient Portal",         role: "Full Stack Developer", status: "ACCEPTED" },
  { who: "mei.tanaka@example.com",    project: "HealthSync Patient Portal",         role: "UI/UX Designer",       status: "PENDING" },
  { who: "elena.petrova@example.com", project: "Open City Transport Dashboard",     role: "Data Scientist",       status: "ACCEPTED" },
  { who: "lena.fischer@example.com",  project: "Open City Transport Dashboard",     role: "Frontend Developer",   status: "UNDER_REVIEW" },
  { who: "kenji.watanabe@example.com",project: "CloudNative Migration Toolkit",     role: "DevOps Engineer", nth: 1, status: "UNDER_REVIEW" },
  { who: "lucas.moreau@example.com",  project: "CloudNative Migration Toolkit",     role: "DevOps Engineer", nth: 1, status: "PENDING" },
  { who: "hana.kim@example.com",      project: "SecureChat: End-to-End Encrypted Messenger", role: "Mobile Developer", status: "ACCEPTED" },
  { who: "aisha.bello@example.com",   project: "Low-Resource Language Translation Research", role: "ML Engineer", status: "UNDER_REVIEW" },
  { who: "anika.sharma@example.com",  project: "Low-Resource Language Translation Research", role: "Backend Developer", status: "PENDING" },
];

// ───────────── Invitations (owner → talent), then the recipient may respond ─────────────
// status: INVITED | ACCEPTED | DECLINED
export const invitations = [
  // Sent by the demo account
  { from: DEMO_EMAIL, project: "AI Study Buddy (48-hour Hackathon)", role: "ML Engineer",   to: "aisha.bello@example.com",   status: "INVITED" },
  { from: DEMO_EMAIL, project: "AI Study Buddy (48-hour Hackathon)", role: "DevOps Engineer", to: "kenji.watanabe@example.com", status: "ACCEPTED" },
  { from: DEMO_EMAIL, project: "AI Study Buddy (48-hour Hackathon)", role: "Data Scientist", to: "elena.petrova@example.com", status: "DECLINED" },
  { from: DEMO_EMAIL, project: "CampusConnect: Student Collaboration Platform", role: "Frontend Developer", to: "lena.fischer@example.com", status: "INVITED" },

  // Received by the demo account
  { from: "priya.nair@example.com",       project: "HealthSync Patient Portal",                  role: "Product Manager", to: DEMO_EMAIL, status: "ACCEPTED" },
  { from: "marcus.lindqvist@example.com", project: "Smart City Hackathon: Urban Mobility Suite", role: "Product Manager", to: DEMO_EMAIL, status: "INVITED" },

  // Background activity
  { from: "sofia.alvarez@example.com",    project: "Low-Resource Language Translation Research", role: "Data Scientist",   to: "kwame.mensah@example.com", status: "INVITED" },
  { from: "marcus.lindqvist@example.com", project: "SecureChat: End-to-End Encrypted Messenger", role: "Backend Developer", to: "diego.ramos@example.com",  status: "DECLINED" },
];
