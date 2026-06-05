"use client";

/**
 * OnboardingMascot — a small decorative guide character for the onboarding flow.
 *
 * Design rules (intentional):
 *  - Purely supplementary. It mirrors state that is ALSO shown as real text /
 *    badges elsewhere; it is never the only signal and never gates a decision.
 *  - Decorative for assistive tech: the whole widget is aria-hidden and does not
 *    capture pointer events, so screen-reader / keyboard users rely on the real
 *    status text and buttons.
 *  - No external animation dependency. Motion comes from CSS keyframes in
 *    app/globals.css, which are neutralized by the global prefers-reduced-motion
 *    rule.
 */

export type MascotPose =
  | "idle"
  | "walking"
  | "thumbsUp"
  | "blocked"
  | "pointing"
  | "waving";

type Props = {
  pose: MascotPose;
  /** Optional short caption shown in a speech bubble. Decorative only. */
  message?: string;
  /** Pixel size of the character square. Default 72. */
  size?: number;
  className?: string;
};

const GOLD = "#D4AF37";
const SURFACE = "#191A22";
const SOFT = "#F5D76E";
const RED = "#E10600";
const SUCCESS = "#33D17A";

export function OnboardingMascot({ pose, message, size = 72, className }: Props) {
  const happy = pose === "thumbsUp" || pose === "waving" || pose === "idle";
  const blocked = pose === "blocked";

  return (
    <div
      className={`pointer-events-none select-none flex flex-col items-center ${className ?? ""}`}
      aria-hidden="true"
    >
      {message ? (
        <div className="mb-1 max-w-[160px] rounded-2xl border border-white/10 bg-[#0b0d10] px-3 py-1.5 text-center text-[11px] font-semibold leading-snug text-slate-200 shadow-lg">
          {message}
        </div>
      ) : null}

      <div className="dsg-mascot" data-pose={pose}>
        <svg
          width={size}
          height={size}
          viewBox="0 0 64 64"
          fill="none"
          role="presentation"
        >
          {/* antenna */}
          <line x1="32" y1="8" x2="32" y2="3" stroke={GOLD} strokeWidth="2" strokeLinecap="round" />
          <circle cx="32" cy="3" r="2.4" fill={SOFT} />

          {/* legs (slightly tucked for a friendlier stance) */}
          <rect x="24" y="50" width="6" height="8" rx="3" fill={SURFACE} stroke={GOLD} strokeWidth="1.5" />
          <rect x="34" y="50" width="6" height="8" rx="3" fill={SURFACE} stroke={GOLD} strokeWidth="1.5" />

          {/* body */}
          <rect x="18" y="34" width="28" height="20" rx="8" fill={SURFACE} stroke={GOLD} strokeWidth="2" />
          {/* chest status light */}
          <circle cx="32" cy="44" r="2.6" fill={blocked ? RED : happy ? SUCCESS : SOFT} />

          {/* head */}
          <rect x="13" y="8" width="38" height="28" rx="11" fill={SURFACE} stroke={GOLD} strokeWidth="2" />

          {/* eyes */}
          {blocked ? (
            <>
              <line x1="22" y1="18" x2="27" y2="23" stroke={RED} strokeWidth="2" strokeLinecap="round" />
              <line x1="27" y1="18" x2="22" y2="23" stroke={RED} strokeWidth="2" strokeLinecap="round" />
              <line x1="37" y1="18" x2="42" y2="23" stroke={RED} strokeWidth="2" strokeLinecap="round" />
              <line x1="42" y1="18" x2="37" y2="23" stroke={RED} strokeWidth="2" strokeLinecap="round" />
            </>
          ) : (
            <>
              <circle cx="24.5" cy="20" r="3" fill={SOFT} />
              <circle cx="39.5" cy="20" r="3" fill={SOFT} />
            </>
          )}

          {/* mouth */}
          {blocked ? (
            <line x1="27" y1="30" x2="37" y2="30" stroke={RED} strokeWidth="2" strokeLinecap="round" />
          ) : happy ? (
            <path d="M26 28 Q32 33 38 28" stroke={GOLD} strokeWidth="2" strokeLinecap="round" fill="none" />
          ) : (
            <path d="M27 29 H37" stroke={GOLD} strokeWidth="2" strokeLinecap="round" fill="none" />
          )}

          {/* left arm (mostly resting) */}
          <rect x="12" y="37" width="6" height="10" rx="3" fill={SURFACE} stroke={GOLD} strokeWidth="1.5" />

          {/* right arm — varies by pose */}
          {pose === "waving" ? (
            <g className="dsg-mascot__arm-wave">
              <rect x="46" y="26" width="6" height="12" rx="3" fill={SURFACE} stroke={GOLD} strokeWidth="1.5" />
              <circle cx="49" cy="25" r="3" fill={SOFT} />
            </g>
          ) : pose === "thumbsUp" ? (
            <g>
              <rect x="46" y="30" width="6" height="10" rx="3" fill={SURFACE} stroke={GOLD} strokeWidth="1.5" />
              <circle cx="49" cy="28" r="3.4" fill={SUCCESS} />
              <rect x="48" y="22" width="2" height="5" rx="1" fill={SUCCESS} />
            </g>
          ) : pose === "pointing" ? (
            <g>
              <rect x="46" y="38" width="11" height="5" rx="2.5" fill={SURFACE} stroke={GOLD} strokeWidth="1.5" />
              <circle cx="58" cy="40.5" r="2.6" fill={SOFT} />
            </g>
          ) : pose === "blocked" ? (
            <g>
              {/* arm holding a small BLOCK placard */}
              <rect x="46" y="30" width="6" height="10" rx="3" fill={SURFACE} stroke={GOLD} strokeWidth="1.5" />
              <rect x="44" y="18" width="20" height="11" rx="2.5" fill={RED} />
              <text x="54" y="26" textAnchor="middle" fontSize="6" fontWeight="700" fill="#fff" fontFamily="Inter, sans-serif">BLOCK</text>
            </g>
          ) : (
            <rect x="46" y="37" width="6" height="10" rx="3" fill={SURFACE} stroke={GOLD} strokeWidth="1.5" />
          )}
        </svg>
      </div>
    </div>
  );
}

export default OnboardingMascot;
