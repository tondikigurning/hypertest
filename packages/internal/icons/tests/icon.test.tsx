import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";
import { Icon } from "../src/icon";

afterEach(cleanup);

test("should render icon component correctly", () => {
  const { container } = render(<Icon name="user" aria-label="user icon" />);

  expect(container.querySelector("i")).toBeInTheDocument();
  expect(container.children.item(0)).toHaveClass("i-user");
  expect(screen.getByLabelText("user icon")).toBeInTheDocument();
});

test("should render icon component with different element", () => {
  const { container } = render(<Icon as="span" name="user" aria-label="user icon" />);

  expect(container.querySelector("i")).not.toBeInTheDocument();
  expect(container.querySelector("span")).toBeInTheDocument();
  expect(container.children.item(0)).toHaveClass("i-user");
});
