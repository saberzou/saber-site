// Which holiday the room is dressed for, by the visitor's own calendar.
//
//   Thanksgiving  six days before the fourth Thursday of November, to Nov 30
//   Christmas     Dec 1 to Dec 26
//   New Year      Dec 27 to Jan 7
//
// Preview any of them with ?holiday=thanksgiving, christmas or newyear, or
// see the plain room with ?holiday=off.

const NAMES = ['thanksgiving', 'christmas', 'newyear'];

export function season(now) {
  let asked = null;
  try { asked = new URLSearchParams(location.search).get('holiday'); } catch (err) {}
  if (asked === 'off') return null;
  if (NAMES.indexOf(asked) !== -1) return asked;
  const d = now || new Date();
  const month = d.getMonth();
  const day = d.getDate();
  if (month === 10) {
    const firstDay = new Date(d.getFullYear(), 10, 1).getDay();
    const thanksgiving = 1 + ((4 - firstDay + 7) % 7) + 21;
    return day >= thanksgiving - 6 ? 'thanksgiving' : null;
  }
  if (month === 11) return day <= 26 ? 'christmas' : 'newyear';
  if (month === 0 && day <= 7) return 'newyear';
  return null;
}

// The year the crystal ball shows: the one that's starting, or just started.
export function newYear(now) {
  const d = now || new Date();
  return d.getMonth() === 0 ? d.getFullYear() : d.getFullYear() + 1;
}
