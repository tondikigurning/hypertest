import { readVariables } from "../runs/run-variables";

export function readAgentVariables() {
  const { E2E_USERNAME, E2E_PASSWORD } = readVariables();
  return { E2E_USERNAME, E2E_PASSWORD };
}
