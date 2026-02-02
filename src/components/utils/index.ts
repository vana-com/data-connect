/*
  Utils

  Rule of least permission!
  1. Only export what is needed for the apps/web directory
  2. Do not export if it's only used within this directory
 */

export {
  type PolymorphicProps,
  PolymorphicElement,
} from "./polymorphic-element";
export { Svg, type SvgIconProps } from "./svg";
