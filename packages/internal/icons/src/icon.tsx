import * as React from "react";
import type { IconName } from "./gen/types";

// Define the generic props for the Icon component
export type IconProps<T extends React.ElementType> = {
  /**
   * The HTML element to render.
   * @default 'i'
   */
  as?: T;

  enlarged?: boolean;
  /**
   * The name of the icon, used to generate the CSS class (e.g., "home" becomes "i-home").
   */
  name: IconName;
} & Omit<React.ComponentPropsWithoutRef<T>, "as" | "name">; // Inherit all other props from the element type

export function Icon<T extends React.ElementType = "i">({ as, name, className, customIcons, ...props }: IconProps<T>) {
  // Use the 'as' prop as the component, defaulting to 'i'
  const Component = as || "i";

  // Create the element using React.createElement
  return React.createElement(Component, {
    ...props,
    className: [`i-${name}`, className, props.enlarged ? "text-[1.6em]" : undefined].filter(Boolean).join(" "),
  });
}
