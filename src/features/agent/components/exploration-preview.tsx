import { Icon } from "@hyperscal/icons";
import { useState } from "react";
import { createPortal } from "react-dom";
import { BrowserPreview } from "../../../components";
import { agentFetch } from "../agent-api";
import { useWidgetDrag } from "../use-widget-drag";

export function ExplorationPreview() {
  const [expanded, setExpanded] = useState(false);
  const drag = useWidgetDrag(!expanded);
  return createPortal(
    <div
      ref={drag.ref}
      style={drag.style}
      className={expanded ? "exploration-preview expanded" : "exploration-preview"}
    >
      <section className="live-browser" aria-label="Q-Rex browser exploration preview">
        <div className="live-browser-bar exploration-bar" {...(!expanded ? drag.handleProps : {})}>
          <span className="live-browser-dots" aria-hidden="true">
            ● ● ●
          </span>
          <span>Q-Rex browser preview</span>
          <button
            type="button"
            className="evidence-close exploration-expand"
            onClick={() => setExpanded(!expanded)}
            aria-label={expanded ? "Minimize browser preview" : "Maximize browser preview"}
          >
            <Icon name={expanded ? "arrows-diagonal-minimize-2" : "arrows-maximize"} aria-hidden="true" />
          </button>
        </div>
        <BrowserPreview
          url="/api/agent/exploration-frame"
          fetchFrame={agentFetch}
          label="Starting exploration browser"
        />
      </section>
    </div>,
    document.body,
  );
}
