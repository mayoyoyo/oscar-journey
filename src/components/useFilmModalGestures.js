import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';

// Shared gesture + navigation plumbing for the film-detail modals
// (FilmDetailModal for canonical films, SeriesFilmPreview for TMDB
// sequels). Handles:
//
//   - drag-to-close: modal follows finger when scrolled to top, rubber-bands
//     past 150px, closes past 120px with slide-off-bottom + backdrop fade
//   - horizontal swipe to next/prev sibling with slide-out → slide-in
//   - desktop ← → arrows + Escape
//   - scrollTop preservation on mount (for cross-modal swaps where the
//     parent hands over the outgoing modal's scroll position)
//   - pending-setTimeout cleanup so rapid successive swipes don't stomp
//     each other's transitions
//   - series-strip origin suppression: touches that start inside
//     `.series-strip` are left to the strip's native horizontal scroll
//
// The caller owns the JSX and any body-specific logic. This hook just
// wires up a ref + handlers you attach to the modal's scroll container.
//
// Parameters:
//   onClose            — () => void, fired on Escape or drag-to-close
//   onHorizontalNav    — (dir: 1|-1, { animated }) => void, fired on swipe
//                        and arrow keys. `animated: true` for swipes so the
//                        caller can animate before unmounting; `animated:
//                        false` for keyboard/click arrows (desktop — just
//                        swap content instantly).
//   hasPrev / hasNext  — booleans controlling which direction swipes + keys
//                        engage
//   hasNav             — master gate for swipe + arrow keys. False → modal
//                        is drag-to-close only (no horizontal nav at all)
//   initialScrollTop   — optional starting scrollTop applied on mount
//                        before first paint
//
// Returns:
//   modalRef                                    — attach via `ref={modalRef}`
//   handleTouchStart / handleTouchMove / Ended  — attach via `onTouchStart=`
//   animatedGo(direction)                       — programmatic slide + nav
//                                                 (used by touch swipe)
//   resetTransform()                            — snap-back helper

export function useFilmModalGestures({
  onClose,
  onHorizontalNav,
  hasPrev = false,
  hasNext = false,
  hasNav = false,
  initialScrollTop,
}) {
  const modalRef = useRef(null);
  const touchStart = useRef(null);
  const currentDragY = useRef(0);
  // Holds the pending `setTimeout` id that clears the modal's inline
  // `transition` style ~240ms after a reset or animated-nav completes.
  // Tracked so a rapid follow-up gesture can cancel the stale timer
  // before it fires mid-animation and snaps the content into place.
  const transitionClearTimer = useRef(null);

  const cancelTransitionClear = useCallback(() => {
    if (transitionClearTimer.current != null) {
      clearTimeout(transitionClearTimer.current);
      transitionClearTimer.current = null;
    }
  }, []);

  const resetTransform = useCallback(() => {
    const el = modalRef.current;
    if (!el) return;
    cancelTransitionClear();
    el.style.transition = 'transform 220ms cubic-bezier(0.16, 1, 0.3, 1)';
    el.style.transform = '';
    transitionClearTimer.current = setTimeout(() => {
      transitionClearTimer.current = null;
      if (modalRef.current) modalRef.current.style.transition = '';
    }, 240);
    currentDragY.current = 0;
  }, [cancelTransitionClear]);

  // Scroll restore on mount — applied before paint so the user never sees
  // a flash at scrollTop:0 before it jumps to the handed-over position.
  useLayoutEffect(() => {
    if (initialScrollTop && modalRef.current) {
      modalRef.current.scrollTop = initialScrollTop;
    }
    // Mount-only: subsequent re-renders within the same modal instance
    // preserve scroll naturally via React keeping the container mounted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Unmount cleanup so a pending transition-clear timer can't fire against
  // a stale DOM reference after the modal goes away.
  useEffect(() => () => cancelTransitionClear(), [cancelTransitionClear]);

  // Slide current content out 170ms, call parent nav, then slide new
  // content in from opposite side. If the parent unmounts this component
  // during the swap (canon ↔ non-canon boundary), the slide-in phase is
  // naturally skipped — every DOM write is guarded by a null check on
  // modalRef.current.
  const animatedGo = useCallback((direction) => {
    const el = modalRef.current;
    if (!hasNav) return;
    if ((direction > 0 && !hasNext) || (direction < 0 && !hasPrev)) {
      resetTransform();
      return;
    }
    if (!el) {
      if (onHorizontalNav) onHorizontalNav(direction, { animated: false });
      return;
    }
    cancelTransitionClear();
    const offset = direction > 0 ? '-40%' : '40%';
    const opposite = direction > 0 ? '40%' : '-40%';
    el.style.transition = 'transform 170ms ease-out, opacity 170ms ease-out';
    el.style.transform = `translateX(${offset})`;
    el.style.opacity = '0';
    setTimeout(() => {
      if (onHorizontalNav) onHorizontalNav(direction, { animated: true });
      if (!modalRef.current) return;
      modalRef.current.style.transition = 'none';
      modalRef.current.style.transform = `translateX(${opposite})`;
      modalRef.current.style.opacity = '0';
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (!modalRef.current) return;
          modalRef.current.style.transition = 'transform 220ms cubic-bezier(0.16, 1, 0.3, 1), opacity 220ms ease-out';
          modalRef.current.style.transform = 'translateX(0)';
          modalRef.current.style.opacity = '1';
          transitionClearTimer.current = setTimeout(() => {
            transitionClearTimer.current = null;
            if (modalRef.current) modalRef.current.style.transition = '';
          }, 240);
        });
      });
    }, 170);
  }, [hasNav, hasPrev, hasNext, onHorizontalNav, cancelTransitionClear, resetTransform]);

  // Keyboard: Escape closes, ← / → walk sibling list instantly (no slide).
  // The slide animation is reserved for touch swipes where it doubles as
  // gesture feedback.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') { if (onClose) onClose(); return; }
      if (!hasNav) return;
      if (e.key === 'ArrowLeft' && hasPrev) {
        e.preventDefault();
        if (onHorizontalNav) onHorizontalNav(-1, { animated: false });
      }
      if (e.key === 'ArrowRight' && hasNext) {
        e.preventDefault();
        if (onHorizontalNav) onHorizontalNav(1, { animated: false });
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, hasNav, hasPrev, hasNext, onHorizontalNav]);

  const handleTouchStart = useCallback((e) => {
    const el = modalRef.current;
    // Let inner horizontal scrollers (series strip) own horizontal swipes
    // so scrolling through sequel posters doesn't also navigate films.
    const startedInStrip = !!e.target.closest?.('.series-strip');
    touchStart.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      scrollTop: el ? el.scrollTop : 0,
      startedInStrip,
    };
    // Cancel any in-flight snap-back transition so the new drag starts
    // from the current position, not a stale one.
    if (el) el.style.transition = '';
    currentDragY.current = 0;
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (!touchStart.current) return;
    const dy = e.touches[0].clientY - touchStart.current.y;
    const dx = e.touches[0].clientX - touchStart.current.x;
    const atTop = touchStart.current.scrollTop <= 1;
    // Only engage vertical drag when at top AND pulling down AND vertical
    // is clearly dominant over horizontal (so diagonal swipes don't get
    // half a card-drag and half a navigation).
    if (atTop && dy > 6 && dy > Math.abs(dx)) {
      // Rubber-band past 150px so it feels grippy, not infinite.
      const resisted = dy > 150 ? 150 + (dy - 150) * 0.5 : dy;
      currentDragY.current = resisted;
      if (modalRef.current) {
        modalRef.current.style.transform = `translateY(${resisted}px)`;
      }
    }
  }, []);

  const handleTouchEnd = useCallback((e) => {
    if (!touchStart.current) return;
    const dx = e.changedTouches[0].clientX - touchStart.current.x;
    const dy = e.changedTouches[0].clientY - touchStart.current.y;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    // Horizontal — animate prev/next navigation. Skip if the touch started
    // inside the series strip (that's the strip's own scroll), if nav is
    // disabled, or if we're at the end of the list (snap back for "nothing
    // past here" feedback).
    if (!touchStart.current.startedInStrip && hasNav && absDx > 60 && absDx > absDy * 1.5) {
      const dir = dx < 0 ? 1 : -1;
      if ((dir > 0 && !hasNext) || (dir < 0 && !hasPrev)) {
        resetTransform();
        touchStart.current = null;
        return;
      }
      resetTransform();
      animatedGo(dir);
      touchStart.current = null;
      return;
    }

    // Vertical — close with slide-off-bottom past 120px; otherwise snap
    // back. Fade the overlay backdrop alongside the card so it doesn't
    // visually detach from a static dark rectangle as it leaves.
    if (currentDragY.current > 120) {
      const el = modalRef.current;
      const overlay = el?.parentElement;
      if (el) {
        el.style.transition = 'transform 220ms cubic-bezier(0.4, 0, 1, 1), opacity 200ms ease-out';
        el.style.transform = 'translateY(100vh)';
        el.style.opacity = '0';
      }
      if (overlay) {
        overlay.style.transition = 'background-color 200ms ease-out, opacity 200ms ease-out';
        overlay.style.backgroundColor = 'rgba(0, 0, 0, 0)';
      }
      setTimeout(() => { if (onClose) onClose(); }, 200);
    } else {
      resetTransform();
    }
    touchStart.current = null;
  }, [hasNav, hasPrev, hasNext, animatedGo, onClose, resetTransform]);

  return {
    modalRef,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    animatedGo,
    resetTransform,
  };
}
