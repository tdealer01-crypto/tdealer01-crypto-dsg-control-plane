'use client';

/**
 * SkipLink Component (WCAG 2.2 SC 2.4.1 - Bypass Blocks)
 *
 * Provides keyboard users with a way to bypass repeated navigation elements
 * and jump directly to the main content area.
 *
 * Features:
 * - Hidden by default, visible on focus (keyboard navigation)
 * - First in tab order for immediate accessibility
 * - Links to #main-content landmark
 * - Screen reader friendly
 *
 * Usage:
 *   <SkipLink />
 *   // Later in the layout:
 *   <main id="main-content" role="main">
 *     {children}
 *   </main>
 */

export default function SkipLink() {
  const handleSkipClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      mainContent.focus();
      mainContent.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <a
      href="#main-content"
      onClick={handleSkipClick}
      className="sr-only focus:not-sr-only focus:absolute focus:left-0 focus:top-0 focus:z-50 focus:inline-block focus:bg-blue-600 focus:px-4 focus:py-2 focus:text-white focus:font-semibold"
      tabIndex={0}
    >
      Skip to main content
    </a>
  );
}
