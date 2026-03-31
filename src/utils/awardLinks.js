/**
 * Returns a YouTube search URL for award categories that have watchable content,
 * or null if the category doesn't have a meaningful video link.
 */
export function getAwardLink(award, movie) {
  const enc = (s) => encodeURIComponent(s);
  const cat = award.category;

  if (cat === 'Original Song' && award.detail) {
    return `https://www.youtube.com/results?search_query=${enc(movie.title + ' ' + award.detail + ' oscar performance')}`;
  }
  if (['Actor', 'Actress', 'Supporting Actor', 'Supporting Actress'].includes(cat) && award.winner) {
    return `https://www.youtube.com/results?search_query=${enc(award.winner + ' oscar acceptance speech ' + movie.title)}`;
  }
  if (cat === 'Director' && award.winner) {
    return `https://www.youtube.com/results?search_query=${enc(award.winner + ' ' + movie.title + ' director interview')}`;
  }
  if (cat === 'Original Score') {
    return `https://www.youtube.com/results?search_query=${enc(movie.title + ' ' + movie.year + ' original score soundtrack')}`;
  }
  if (cat === 'Cinematography') {
    return `https://www.youtube.com/results?search_query=${enc(movie.title + ' ' + movie.year + ' cinematography best shots')}`;
  }
  return null;
}
