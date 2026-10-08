import { forwardRef } from "react";
import { Link as RouterLink, type LinkProps } from "react-router-dom";

type LinkPropsWithHref = Omit<LinkProps, "to"> & {
  href: LinkProps["to"];
};

export const Link = forwardRef<HTMLAnchorElement, LinkPropsWithHref>(
  function Link({ href, ...rest }, ref) {
    return <RouterLink ref={ref} to={href} {...rest} />;
  }
);

export default Link;
