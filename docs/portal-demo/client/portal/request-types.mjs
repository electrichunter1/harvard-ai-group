export const requestTypes = {
  project: {
    label: 'Project', fields: [
      ['title', 'Project title', 120], ['byline', 'Author or team', 120], ['category', 'Category', 48],
      ['summary', 'Project summary', 290, 'textarea'], ['body', 'What you built', 3000, 'textarea', true],
      ['link', 'Repository or demo URL', 500, 'url', true],
    ],
  },
  paper: {
    label: 'Paper', fields: [
      ['title', 'Paper title', 120], ['byline', 'Authors', 120],
      ['venue', 'Journal, conference, or preprint server', 120, 'text', true],
      ['publicationDate', 'Publication date', 10, 'date', true],
      ['summary', 'Short description', 290, 'textarea'], ['body', 'Abstract', 3000, 'textarea'],
      ['link', 'Paper URL', 500, 'url', true],
    ],
  },
  event: {
    label: 'Event', fields: [
      ['title', 'Event title', 120], ['category', 'Event type', 48],
      ['date', 'Event date', 10, 'date'], ['eventTime', 'Start time (Eastern)', 5, 'time', true],
      ['venue', 'Room or online platform', 120, 'text', true], ['summary', 'Event summary', 290, 'textarea'],
      ['body', 'Agenda or attendance details', 3000, 'textarea', true], ['link', 'RSVP or event URL', 500, 'url', true],
    ],
  },
  profile: {
    label: 'Profile', fields: [
      ['title', 'Display name', 120], ['category', 'Role or affiliation', 48], ['summary', 'Short bio', 290, 'textarea'],
      ['body', 'Research interests or work', 3000, 'textarea', true], ['link', 'Personal or work URL', 500, 'url', true],
    ],
  },
  fellowship: {
    label: 'Fellowship', fields: [
      ['title', 'Proposal title', 120], ['byline', 'Applicant or team', 120],
      ['summary', 'Research question or project goal', 290, 'textarea'],
      ['body', 'Proposed approach', 3000, 'textarea'], ['resources', 'Funding or resources requested', 900, 'textarea', true],
      ['link', 'Supporting materials URL', 500, 'url', true],
    ],
  },
};

export const roleLabels = { member: 'Member', board: 'Board', manager: 'Website manager', fellow: 'Fellow manager' };
export const canEdit = role => role === 'board' || role === 'manager';
export const reviewScope = role => role === 'fellow' ? 'fellowship' : canEdit(role) ? 'website' : null;
export const requestScope = type => type === 'fellowship' ? 'fellowship' : 'website';
export const canEditCopy = (role, area) => role === 'manager' || (role === 'fellow' && area === 'fellowship');
export const workspaceTitle = role => roleLabels[role] + ' workspace';
export const kindFor = type => type === 'paper' ? 'project' : type;
export const typeFor = entry => entry.type === 'paper' ? 'paper' : entry.kind;
