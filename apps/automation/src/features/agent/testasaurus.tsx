export type TestasaurusMood = "idle" | "working" | "waiting" | "offline" | "connecting" | "listening";

/** Code-native artwork keeps the character crisp at every size and its motion state-driven. */
export function Testasaurus({ mood = "idle", large = false }: { mood?: TestasaurusMood; large?: boolean }) {
  return (
    <span className={`testasaurus ${large ? "testasaurus-large" : ""}`} data-mood={mood} aria-hidden="true">
      <svg viewBox="0 0 120 120" fill="none">
        <title>Testasaurus, an indigo dinosaur carrying a test checklist</title>
        <ellipse className="testasaurus-shadow" cx="60" cy="109" rx="32" ry="4" fill="#293548" opacity=".1" />
        <g className="testasaurus-body" stroke="#40558f" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path className="testasaurus-tail" d="M43 80C29 87 21 81 15 72C13 88 23 99 44 96Z" fill="#7186c3" />
          <path d="m41 55-9-8 12-5-6-11 14 1 2-13 13 8" fill="#c7d2f4" />
          <path d="M65 91L62 103Q61 106 65 106H77Q81 106 79 102L75 91Z" fill="#7186c3" />
          <path
            d="M47 56C39 65 35 78 38 89C39 95 43 98 48 99L46 104Q44 108 49 108H61Q65 108 65 104L66 98C80 98 86 90 84 80C83 71 78 64 74 59Z"
            fill="#91a4e8"
          />
          <path d="M73 69C68 74 66 82 67 90Q68 95 72 96C81 94 85 88 82 79Q79 72 73 69Z" fill="#e9eefb" stroke="none" />
          <path d="M53 104v3m6-3v3m11-5v3m5-3v3" strokeWidth="1.5" />
          <g className="testasaurus-head">
            <path
              d="M42 51V39C42 24 54 17 68 21C78 23 83 31 83 37H94C102 37 107 42 107 49V56C107 64 102 69 94 69H63C50 69 42 62 42 51Z"
              fill="#91a4e8"
            />
            <path d="M82 56Q90 62 99 55" />
            <path d="m87 59 3 5 4-6" fill="#fff" stroke="none" />
            <g className="testasaurus-eyes">
              <ellipse cx="67" cy="41" rx="4" ry="6" fill="#293548" stroke="none" />
              <circle cx="68" cy="39" r="1.4" fill="#fff" stroke="none" />
            </g>
            <circle cx="97" cy="46" r="1.8" fill="#40558f" stroke="none" />
            <ellipse cx="75" cy="54" rx="5" ry="3" fill="#c7d2f4" stroke="none" />
          </g>
          {/* Move the holding arm and clipboard together so the grip stays attached. */}
          <g className="testasaurus-check">
            <rect x="77" y="75" width="26" height="29" rx="4" fill="#f8fbff" />
            <rect x="84" y="72" width="12" height="6" rx="2" fill="#c7d2f4" strokeWidth="2" />
            <path d="m84 90 4 4 8-10" stroke="#4f63c8" strokeWidth="3" />
            <path
              d="M61 77Q65 74 68 78L73 83H79Q83 83 83 85Q83 87 80 87H78H81Q84 87 83 89Q83 91 80 91H78Q81 91 80 93Q79 95 76 94L69 91Q62 88 60 83Q59 79 61 77Z"
              fill="#91a4e8"
              strokeWidth="2"
            />
            <path d="M74 84Q74 81 77 80Q80 80 80 83" strokeWidth="1.5" />
          </g>
        </g>
        <g className="testasaurus-spark" stroke="#7186c3" strokeWidth="2.5" strokeLinecap="round">
          <path d="M22 29v10m-5-5h10M101 18v8m-4-4h8" />
        </g>
      </svg>
    </span>
  );
}
