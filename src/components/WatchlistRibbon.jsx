import React from 'react';

// Corner-triangle badge for the top-left of a film poster. Renders null
// when the film isn't saved. When saved, renders a gold triangle (if
// not yet watched) or a green triangle (if watched).
//
// This component does NOT toggle state — it's a pure status indicator.
// Toggling happens via the WatchlistButton in the action row.
export default function WatchlistRibbon({ isBookmarked, isWatched }) {
  if (!isBookmarked) return null;
  const cls = `watchlist-ribbon ${isWatched ? 'is-watched' : ''}`;
  return <div className={cls} aria-hidden="true" />;
}
