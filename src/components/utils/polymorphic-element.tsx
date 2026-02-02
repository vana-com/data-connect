import type { ComponentPropsWithoutRef, ElementType } from "react";

export type PolymorphicProps<E extends ElementType> = {
  as?: E;
} & ComponentPropsWithoutRef<E>;

export const PolymorphicElement = <E extends ElementType = "div">({
  as,
  ...otherProps
}: PolymorphicProps<E>) => {
  const Tag = as || "div";
  return <Tag {...otherProps} />;
};
