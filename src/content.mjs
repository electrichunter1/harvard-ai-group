export const links = {
  mailing: 'https://docs.google.com/forms/d/e/1FAIpQLSfNAcdJbLJir9j3wT72g5hFBK4whQ128LwXCFP5bQPq7qcGDA/viewform',
  instagram: 'https://www.instagram.com/harvard.ai.group/',
  linkedin: 'https://www.linkedin.com/company/hcsai/',
  hcs: 'https://hcs.harvard.edu/initiatives/',
  email: 'mailto:ai@hcs.harvard.edu',
};

export const board = [
  ['Lia Zheng', 'Computer Science and Statistics'],
  ['Ege Cakar', 'Statistics and Physics'],
  ['Ketan Raghu', 'Computer Science and Economics'],
  ['Alexis Hu', 'Computer Science and Economics'],
  ['Dashiell Bhattacharyya', 'Computer Science and Mathematics'],
  ['Wency Suo', 'Computer Science and English'],
  ['Jesus Barrios', 'Computer Science and Applied Mathematics'],
  ['Noah Brauner', 'Computer Science and Applied Mathematics'],
  ['Buzz Nguyen', 'Statistics and Physics'],
  ['Sol Kim', 'Computer Science'],
  ['Eric Xu', 'Computer Science'],
];

export const trivia = {
  title: 'AI Trivia Night', date: 'November 18, 2026', starts: '2026-11-18T18:00:00-05:00',
  cutoff: '2026-11-18T00:00:00-05:00', ends: '2026-11-18T20:30:00-05:00',
  href: 'https://www.instagram.com/harvard.ai.group/p/DfyG1v1kRkk/',
  rsvp: 'https://docs.google.com/forms/d/e/1FAIpQLSe-ju8IfyRKw9sS-h53_sP4jwDgEEJOZfRL9zrSj1JQ_MbW_Q/viewform',
};

export const events = [
  { title: 'Poker & Sushi', date: 'Nov 13, 2026', iso: '2026-11-13', type: 'Social', description: 'A night of sushi and poker for first-timers and regulars at Harvard Hall.', href: 'https://www.instagram.com/harvard.ai.group/p/Dfqvo0iR6WX/' },
  { title: 'HUSAI × HUMIC Mixer', date: 'Mar 3, 2026', iso: '2026-03-03', type: 'Social', description: 'Two student groups brought together people working on and curious about AI and machine learning.', href: 'https://husai.beehiiv.com/p/husai-x-humic-mixer', image: 'humic-mixer.webp', alt: 'Students gathered at the HUSAI and HUMIC mixer' },
  { title: 'Dinner with Professor Sitan Chen', date: 'Feb 24, 2026', iso: '2026-02-24', type: 'Talk', description: 'Over dinner, students and Professor Chen discussed how teaching fellows use AI to give feedback.', href: 'https://husai.beehiiv.com/p/dinner-with-professor-sitan-chen', image: 'sitan-chen.webp', alt: 'Attendees at the dinner with Professor Sitan Chen' },
  { title: '2025 Spring AI Tour', date: 'Mar 16–18, 2025', iso: '2025-03-16', type: 'Trip', description: 'Harvard students met the people building and funding AI in the Bay Area.', href: 'https://husai.beehiiv.com/p/2025-spring-ai-tour', image: 'spring-tour.webp', alt: 'Harvard AI Group students on the 2025 Spring AI Tour' },
  { title: '2024 Spring AI Tour', date: 'Mar 10–12, 2024', iso: '2024-03-10', type: 'Trip', description: 'A spring break visit with researchers, founders, and investors working on AI.', href: 'https://husai.beehiiv.com/p/2024-spring-ai-tour' },
  { title: 'Algorithms and ML for Computational Social Policy', date: 'Feb 7, 2024', iso: '2024-02-07', type: 'Talk', description: 'A conversation with Madison Coots and Hans Gaebler.', href: 'https://husai.beehiiv.com/p/algorithms-and-ml-for-computational-social-policy-with-madison-coots-and-hans-gaebler' },
  { title: 'RL and Computational Neuroscience', date: 'Jan 31, 2024', iso: '2024-01-31', type: 'Talk', description: 'A conversation with Sam Gershman.', href: 'https://husai.beehiiv.com/p/rl-and-computational-neuroscience-with-sam-gershman' },
];

export const projects = [
  { title: 'Combat Evaluations for Minecraft', author: 'Samuel Chen', type: 'Evaluation', description: 'An open benchmark for measuring how embodied agents fight and survive in Minecraft.', href: 'https://github.com/SamC1249/MineCombat-Evaluation', fellow: 'samuel-chen' },
  { title: 'Cascade', author: 'Andi Gu', type: 'Systems', description: 'Research into reducing the overhead of fault-tolerant quantum computation.', href: 'https://andigu.github.io/projects/cascade/', fellow: 'andi-gu' },
  { title: 'Neural Heterogeneity', author: 'Kyle Zheng', type: 'Modeling', description: 'An investigation of how diversity among spiking neurons shapes what a network can learn.', href: 'https://github.com/kylezheng12/neural-heterogeneity', fellow: 'kyle-zheng' },
  { title: 'Sparse Autoencoders at Standard Training Budgets', author: 'Bright Liu', type: 'Evaluation', description: 'A study of how learned sparse features compare with a random baseline.', href: 'https://husai.beehiiv.com/p/at-standard-training-budgets-sae-features-match-random-baseline-evidence-for-underconstrained-sparse' },
];

export const bootcampDays = [
  ['Neural networks', 'Start with the basics of machine learning, then build a small neural network.'],
  ['Language models', 'Learn how transformers process text and explore what autoregressive language models can do.'],
  ['Computer vision', 'Work with convolutional networks and try a handwritten-digit classification exercise.'],
  ['Reinforcement learning and ethics', 'Explore how agents learn from rewards and discuss the decisions that shape their behavior.'],
  ['Project workshop', 'Develop a prototype in a small team and present a short demo.'],
];

const fellowNotes = {
  'samuel-chen': 'Samuel’s fellowship work uses Minecraft combat to evaluate how agents behave in an interactive environment.',
  'andi-gu': 'Andi studies quantum science and engineering at Harvard. His fellowship work explored neural decoders for quantum error correction.',
  'kyle-zheng': 'Kyle’s fellowship work explores what spiking neural networks can learn when their neurons have different properties.',
};

const slug = title => title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export const catalog = [
  ...events.map(event => ({
    kind: 'event', id: slug(event.title), title: event.title, category: event.type,
    summary: event.description, date: event.iso, dateLabel: event.date,
    link: event.href, image: event.image, alt: event.alt,
  })),
  {
    kind: 'event', id: 'ai-trivia-night', title: trivia.title, category: 'Social',
    summary: 'Teams of up to four compete in AI trivia at Harvard’s Science Center. Dinner and practice begin at 6 PM, with trivia at 6:30 PM. Open to Harvard affiliates with a Harvard ID.',
    date: '2026-11-18', dateLabel: trivia.date, link: trivia.href,
  },
  ...projects.map(project => ({
    kind: 'project', id: slug(project.title), title: project.title, category: project.type,
    summary: project.description, byline: project.author, link: project.href,
    profile: project.fellow,
    ...(project.title === 'Cascade' && { image: 'cascade-surface-code.webp', alt: 'Surface-code lattice with an error chain highlighted in red' }),
  })),
  ...board.map(([title, summary]) => ({ kind: 'profile', id: slug(title), title, summary, category: 'Board' })),
  ...projects.filter(project => project.fellow).map(project => ({
    kind: 'profile', id: project.fellow, title: project.author, category: 'Spring 2026 Fellow',
    summary: fellowNotes[project.fellow], image: `${project.fellow}.webp`, alt: project.author,
    project: slug(project.title),
  })),
];
