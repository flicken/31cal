/**
 * Example phrases shown as help. Each one is checked against the real
 * parsers in syntaxExamples.test.ts, so the help can't drift from them.
 */

const year = new Date().getFullYear();

/** Clickable examples in the search bar dropdown. */
export const SEARCH_EXAMPLES = [
  'today',
  'this week',
  'next week',
  'next 7 days',
  'this month',
  'next 3 months',
  'past 30 days',
  'march',
  'january to march',
  'until end of next month',
  'updated since yesterday',
  `start:${year}-01-01 end-of:${year}-03`,
];

/** Clickable examples in BulkEntry's "How to write events" help. */
export const BULK_EXAMPLES: { text: string; note: string }[] = [
  {
    text: 'Sat 3pm Soccer practice',
    note: 'date and time, then the title (one hour)',
  },
  { text: 'Oct 3 7-9pm Concert', note: 'a time range' },
  {
    text: '9:30pm Drinks',
    note: 'no date: the next 9:30pm after the line above',
  },
  { text: 'tomorrow Trip', note: 'no time: all day' },
  {
    text: 'Friday 11pm-1am Party',
    note: 'ends after midnight: ends the next day',
  },
  { text: 'March 3 3pm EST Call', note: 'an explicit time zone' },
];
