import type { ReactNode } from "react";

function Step({ text, index }: { text: string; index: number }) {
  return (
    <div className="step">
      <span>{String(index + 1).padStart(2, "0")}</span>
      <p>{text}</p>
    </div>
  );
}

function StepGroup({ children }: { children: ReactNode }) {
  return <div className="steps">{children}</div>;
}

export function ScenarioSteps({ background, steps }: { background: Array<string>; steps: Array<string> }) {
  return (
    <>
      <h3>Scenario steps</h3>
      {background.length > 0 && (
        <>
          <h4>Background</h4>
          <StepGroup>
            {background.map((step, index) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: Source lines can repeat and rows have no state.
              <Step key={index} text={step} index={index} />
            ))}
          </StepGroup>
        </>
      )}
      <StepGroup>
        {steps.length ? (
          steps.map((step, index) =>
            step.startsWith("|") || step.startsWith("Examples:") || step.startsWith("@") ? (
              // biome-ignore lint/suspicious/noArrayIndexKey: Source lines can repeat and rows have no state.
              <div className="example-line" key={index}>
                {step}
              </div>
            ) : (
              // biome-ignore lint/suspicious/noArrayIndexKey: Source lines can repeat and rows have no state.
              <Step key={index} text={step} index={index} />
            ),
          )
        ) : (
          <p>No steps available.</p>
        )}
      </StepGroup>
    </>
  );
}
