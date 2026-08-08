/**
 * User-facing patch notes / "What's new".
 *
 * Authored by us per release. Keep every line PLAIN-LANGUAGE and USER-RELEVANT
 * only — describe what changed for the user, never how it was built. No code,
 * file names, internal systems, or sensitive detail. When a release has nothing
 * worth calling out, a single "Minor bug fixes and improvements." line is fine.
 *
 * The most-recent entry (PATCH_NOTES[0]) is shown once, as a small modal, to a
 * logged-in user who hasn't seen this version yet. Older entries are never
 * back-shown — a user who missed a few only ever sees the latest.
 *
 * To ship a new release's notes: bump APP_VERSION and add a new entry at the
 * TOP of PATCH_NOTES with the same version.
 */

export const APP_VERSION = '1.4.0';

/**
 * Internal sentinel-title prefix for the admin-approval marker. Publishing a
 * release writes one hidden `notifications` row titled
 * `${PATCH_NOTE_MARKER_PREFIX}<version>`; the "What's new" modal only shows once
 * that marker exists for the current build. The prefix has no SQL-LIKE wildcard
 * characters so it can be matched with `.like('title', prefix + '%')` safely,
 * and these rows are filtered out of every user-facing announcement list.
 */
export const PATCH_NOTE_MARKER_PREFIX = 'patchnote.release.';

export interface PatchNote {
  /** Must match APP_VERSION for the current release's entry. */
  version: string;
  /** Human month/date, e.g. 'July 2026'. */
  date: string;
  /** Short, user-relevant bullet points. Keep it to a handful. */
  items: string[];
}

/** Newest first. Only PATCH_NOTES[0] is ever surfaced. */
export const PATCH_NOTES: PatchNote[] = [
  {
    version: '1.4.0',
    date: 'July 2026',
    items: [
      'New Halftone tool — turn any image into print-ready halftone dots, with live preview, one-click styles, color and CMYK options, and dots you can fine-tune by hand.',
      'Background remover — cleaner edges and a more precise, easier-to-use brush.',
      'Smoother zoom and panning while you edit.',
      'Minor bug fixes and improvements.',
    ],
  },
];
