import { board, events, links, projects, trivia } from './content.mjs';

const button = (href, name, extra = '') => `<a class="button ${extra}" href="${href}">${name}</a>`;
const textLink = (href, name) => `<a class="text-link" href="${href}">${name}</a>`;
const brand = `<a href="/" class="brand" aria-label="Harvard AI Group home"><img src="/assets/mark.svg" width="34" height="34" alt=""><span>Harvard AI Group</span></a>`;
const bootcampPath = '/bootcamp/';
const navigation = [['/#about', 'About'], ['/#programs', 'Programs'], [bootcampPath, 'Bootcamp'], ['/projects/', 'Projects'], ['/events/', 'Events'], ['/team/', 'People']];

function layout(route, title, description, main) {
  const draftTitle = `${title} · Draft for review`;
  const currentPage = href => route === href ? ' aria-current="page"' : '';
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#faf9f5">
  <meta name="robots" content="noindex, nofollow">
  <meta name="description" content="${description}">
  <meta property="og:title" content="${draftTitle}">
  <meta property="og:description" content="${description}">
  <meta property="og:type" content="website">
  <title>${draftTitle}</title>
  <link rel="icon" href="/assets/mark.svg" type="image/svg+xml">
  <link rel="preload" href="/assets/mulish.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="/assets/site.css">
  <script type="module" src="/assets/site.js"></script>
</head>
<body data-page="${route}">
  <a class="skip" href="#main">Skip to content</a>
  <div class="draft-status"><div class="shell">Draft for review</div></div>
  <header class="masthead"><div class="shell masthead-inner">
    ${brand}
    <a class="bootcamp-shortcut" href="${bootcampPath}"${currentPage(bootcampPath)}>Bootcamp</a>
    <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="primary-nav" hidden>Menu <span aria-hidden="true">+</span></button>
    <nav id="primary-nav" aria-label="Main navigation">${navigation.map(([href, label]) => `<a${href === bootcampPath ? ' class="desktop-bootcamp"' : ''} href="${href}"${currentPage(href)}>${label}</a>`).join('')}<a class="mobile-join" href="/contact/"${currentPage('/contact/')}>Get involved</a></nav>
    <a class="header-join" href="/contact/">Get involved</a>
  </div></header>
  <main id="main">${main}</main>
  <footer class="footer" id="footer">
    <div class="shell footer-inner">${brand}
      <nav aria-label="Footer"><a href="${links.mailing}">Mailing list</a><a href="${links.instagram}">Instagram</a><a href="${links.linkedin}">LinkedIn</a><a href="/contact/">Contact</a></nav>
    </div>
  </footer>
</body>
</html>`;
}

function eventRow(event) {
  return `<article class="archive-row" data-entry="${event.type}">
    <div class="archive-meta"><time datetime="${event.iso}">${event.date}</time><span>${event.type}</span></div>
    <div><h3><a href="${event.href}">${event.title}</a></h3><p>${event.description}</p></div>
  </article>`;
}

function projectRow(project) {
  return `<article class="archive-row" data-entry="${project.type}">
    <div class="archive-meta"><span>${project.type}</span><span>${project.author}</span></div>
    <div><h3><a href="${project.href}">${project.title}</a></h3><p>${project.description}</p></div>
  </article>`;
}

function archive(items, render, filters, label) {
  return `<div class="archive" data-archive><div class="filters" role="group" aria-label="Filter ${label}" hidden>${['All', ...filters].map(filter => `<button type="button" data-filter="${filter}" aria-pressed="${filter === 'All'}">${filter}</button>`).join('')}</div><p class="visually-hidden" role="status" data-filter-status></p>${items.map(render).join('')}</div>`;
}

function notice() {
  return `<a class="event-notice" href="/events/#trivia" data-upcoming data-expiry="${trivia.ends}">
    <span class="notice-label">Upcoming</span><strong>${trivia.title}</strong><time datetime="${trivia.starts}">Wed, Nov 18</time>
  </a>`;
}

const posterImprint = '<img class="hero-imprint" src="/assets/mark-outline.svg" width="700" height="700" alt="">';

const home = `
  <section class="hero" aria-labelledby="home-title">
    ${posterImprint}
    <div class="shell hero-inner">
      <div class="hero-copy">
        <h1 id="home-title">Harvard <span>AI Group</span></h1>
        <p>A student-run community for AI research, education, and events at Harvard College.</p>
        ${button('/contact/', 'Get involved', 'button-light')}
      </div>
      <figure class="hero-visual" data-emblem>
        <img class="hero-photo" src="/assets/spring-visit.webp" width="1500" height="1125" fetchpriority="high" alt="Harvard AI Group students together during the 2025 Spring AI Tour">
        <div class="model-stage">
          <img class="model-fallback" src="/assets/mark.svg" width="300" height="300" alt="">
          <canvas class="model-canvas" aria-label="3D Harvard AI Group emblem. Drag or use arrow keys to turn it. Press Home to reset." tabindex="0" hidden></canvas>
        </div>
        <figcaption>
          <a href="${events[3].href}">Spring AI Tour, 2025</a>
          <button class="model-motion" type="button" data-motion aria-label="Pause emblem animation" hidden>
            <svg viewBox="0 0 16 16" aria-hidden="true"><path class="pause-icon" d="M6 3v10m4-10v10"/><path class="play-icon" d="m6 3 7 5-7 5Z"/></svg>
          </button>
        </figcaption>
      </figure>
    </div>
  </section>
<div class="shell">
  ${notice()}
  <div class="home-info">
    <section id="about" aria-labelledby="about-title">
      <h2 id="about-title">About us</h2>
      <p>Formerly HUSAI, we’re part of the <a href="${links.hcs}">Harvard Computer Society</a>. We fund student projects, host faculty dinners, and teach AI through hands-on work.</p>
      ${textLink('/team/', 'Meet the team')}
    </section>
    <section id="programs" aria-labelledby="program-title">
      <h2 id="program-title">Programs</h2>
      <a class="program-link" href="/fellowship/"><strong>AI Fellowship</strong><small>Research funding and mentorship for Harvard students</small></a>
      <a class="program-link" href="/bootcamp/"><strong>AI Bootcamp</strong><small>Five days of hands-on AI for high school students</small></a>
    </section>
  </div>
</div>`;

const faq = (entries) => `<section class="faq" id="faq"><h2>Common questions</h2>${entries.map(([q, a]) => `<details><summary><span>${q}</span><span class="faq-icon" aria-hidden="true"></span></summary><p>${a}</p></details>`).join('')}</section>`;

function posterPhoto(media) {
  return `<figure class="hero-visual poster-print${media.diagram ? ' poster-diagram' : ''}">
    <img src="/assets/${media.file}" width="${media.width}" height="${media.height}" alt="${media.alt}" fetchpriority="high">
    <figcaption><a href="${media.href}">${media.caption}</a></figcaption>
  </figure>`;
}

function posterIntro(title, description, actions, print) {
  return `<section class="hero page-poster" aria-labelledby="poster-title">
    ${posterImprint}
    <div class="shell hero-inner">
      <div class="hero-copy"><h1 id="poster-title">${title}</h1><p>${description}</p><div class="page-actions">${actions}</div></div>
      ${print}
    </div>
  </section>`;
}

const fellows = projects.filter(project => project.fellow);
const fellowPrint = `<figure class="hero-visual poster-print">
  <div class="fellow-portraits">${fellows.map(project => `<img src="/assets/${project.fellow}.webp" alt="${project.author}">`).join('')}</div>
  <figcaption><a href="#fellows">Spring 2026 fellows</a></figcaption>
</figure>`;

const fellowship = `${posterIntro('AI Fellowship', 'Funding and technical mentorship for Harvard students pursuing their own AI research or software projects.', button(links.fellowship, 'Application details', 'button-light') + textLink('/projects/', 'See fellows’ work'), fellowPrint)}
<div class="shell program-content">
  <section class="split"><h2>How it works</h2><p class="intro">Funding can cover compute, API credits, and other project costs. Fellows meet with our technical directors every two weeks to work toward research or software they can share publicly.</p></section>
  <section id="fellows" aria-labelledby="fellows-title"><div class="section-head"><h2 id="fellows-title">Spring 2026 fellows</h2></div><ul class="fellows-list">${fellows.map(project => `<li><a href="${links.fellowship}/${project.fellow}">${project.author}</a><p>${project.title}</p></li>`).join('')}</ul></section>
  ${faq([['What can I propose?', 'Proposals can include original research, open-source tools, and applications. Explain what you want to build or learn and how you plan to do it.'], ['When can I apply?', `Check the <a href="${links.fellowship}">application page</a> for the latest cycle and eligibility details.`]])}
</div>`;

const bootcampPrint = `<div class="hero-visual poster-print poster-outline">
  <h2>Five-day outline</h2>
  <ol>${['Neural networks', 'Language models', 'Computer vision', 'Reinforcement learning and ethics', 'Project workshop'].map((topic, index) => `<li><span>Day ${index + 1}</span><span>${topic}</span></li>`).join('')}</ol>
</div>`;

const bootcamp = `${posterIntro('AI Bootcamp', 'A five-day online program for high school students, taught by Harvard undergraduate and graduate-level instructors.', button(links.bootcamp, 'Bootcamp details', 'button-light') + textLink(`${links.bootcamp}/schedule`, 'See the schedule'), bootcampPrint)}
<div class="shell program-content">
  <section class="split"><h2>What you’ll do</h2><p class="intro">Follow guided exercises and work on a small research project. The week ends with a workshop where you can turn an idea into a prototype and share what you built.</p></section>
  ${faq([['Who is it for?', 'The bootcamp is designed for high school students interested in artificial intelligence and machine learning. Visit the program page for eligibility and application details.'], ['Where does it take place?', 'Sessions are held online. Check the program schedule for cohort dates and times.'], ['Who can I ask about the program?', 'Email <a href="mailto:ai@hcs.harvard.edu?subject=AI%20Bootcamp">ai@hcs.harvard.edu</a> with questions about the schedule, curriculum, or application process.']])}
</div>`;

const eventPage = `${posterIntro('Events', 'Join us for faculty dinners, campus socials, and our spring AI tour.', button(links.mailing, 'Get event updates', 'button-light'), posterPhoto({
  file: events[2].image, width: 1380, height: 1035, alt: events[2].alt, href: events[2].href,
  caption: 'Dinner with Professor Sitan Chen · February 2026',
}))}
<div class="shell">
  <section class="featured-event" id="trivia" data-event data-expiry="${trivia.ends}" data-cutoff="${trivia.cutoff}">
    <div><p class="meta" data-event-status>${trivia.date}</p><h2>${trivia.title}</h2><p>Science Center Hall B. Dinner and practice at 6 PM, trivia at 6:30 PM. Come solo or bring a team of up to four. Open to Harvard affiliates with a Harvard ID.</p></div>
    <div class="page-actions"><a class="button" href="${trivia.rsvp}" data-rsvp hidden>RSVP for dinner</a>${textLink(trivia.href, 'Event announcement')}</div>
  </section>
  <section class="section" aria-labelledby="event-archive-title"><div class="section-head"><h2 id="event-archive-title">Event archive</h2></div>${archive(events, eventRow, ['Social', 'Talk', 'Trip'], 'events')}</section>
</div>`;

const projectPage = `${posterIntro('Student projects', 'See what our fellows and contributors are researching, testing, and sharing as open source.', button('/fellowship/', 'Explore the fellowship', 'button-light'), posterPhoto({
  file: 'cascade-surface-code.webp', width: 820, height: 790, diagram: true,
  alt: 'A surface-code lattice with an error chain highlighted in red', href: projects[1].href,
  caption: 'Cascade · Quantum error correction',
}))}
<div class="shell">
  <section class="section archive-page" aria-labelledby="archive-title"><div class="section-head"><h2 id="archive-title">Project archive</h2></div>${archive(projects, projectRow, ['Evaluation', 'Systems', 'Modeling'], 'projects')}</section>
</div>`;

const contactPage = `${posterIntro('Get involved', 'Come to an event or sign up to hear about campus events and application rounds.', button(links.mailing, 'Join the mailing list', 'button-light') + textLink('/events/', 'Explore events'), posterPhoto({
  file: events[1].image, width: 1380, height: 1035, alt: events[1].alt, href: events[1].href,
  caption: 'HUSAI × HUMIC Mixer · March 2026',
}))}
<div class="shell">
  <section class="section contact-paths" aria-label="Ways to work with Harvard AI Group">
    <div><h2>Harvard students</h2><p>Have a project you’d like to pursue? Read about the fellowship and see what past fellows have built.</p>${textLink('/fellowship/', 'Explore the fellowship')}</div>
    <div><h2>High school students</h2><p>Learn what you’ll cover in five days of AI Bootcamp and find the schedule for upcoming cohorts.</p>${textLink('/bootcamp/', 'Learn about bootcamp')}</div>
    <div><h2>Campus and industry partners</h2><p>Get in touch about speaking at an event, collaborating on campus, or supporting a program.</p>${textLink(links.email, 'ai@hcs.harvard.edu')}</div>
  </section>
</div>`;

const teamPage = `${posterIntro('Our people', 'Harvard AI Group is run by students. Our board organizes campus events and supports our fellowship and bootcamp programs.', button('/contact/', 'Get in touch', 'button-light'), posterPhoto({
  file: 'bay-area.webp', width: 1500, height: 816, alt: 'Harvard AI Group students gathered outdoors during the 2024 Spring AI Tour',
  href: events[4].href, caption: 'Spring AI Tour, 2024',
}))}
<div class="shell">
  <section class="section board" aria-labelledby="board-title">
    <div class="section-head"><h2 id="board-title">Board of Directors</h2><p>Fall 2026</p></div>
    <ul class="board-list">${board.map(([name, field]) => `<li><h3>${name}</h3><p>${field}</p></li>`).join('')}</ul>
  </section>
</div>`;

export const pages = {
  '/': layout('/', 'Harvard AI Group', 'A student-run community for AI research, education, and events at Harvard.', home),
  '/fellowship/': layout('/fellowship/', 'Fellowship · Harvard AI Group', 'Funding and technical mentorship for AI projects at Harvard.', fellowship),
  '/bootcamp/': layout('/bootcamp/', 'Bootcamp · Harvard AI Group', 'A five-day online AI program for high school students.', bootcamp),
  '/events/': layout('/events/', 'Events · Harvard AI Group', 'Explore faculty dinners, mixers, and other Harvard AI Group events.', eventPage),
  '/projects/': layout('/projects/', 'Projects · Harvard AI Group', 'Research and open-source projects from Harvard AI Group.', projectPage),
  '/contact/': layout('/contact/', 'Get involved · Harvard AI Group', 'Join the mailing list or get in touch with Harvard AI Group.', contactPage),
  '/team/': layout('/team/', 'Our people · Harvard AI Group', 'Meet the students who run Harvard AI Group.', teamPage),
};
