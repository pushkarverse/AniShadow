import { forwardRef, type ImgHTMLAttributes, type CSSProperties } from "react";

type ImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "alt"> & {
  src: string;
  alt: string;
  fill?: boolean;
  priority?: boolean;
  unoptimized?: boolean;
  quality?: number | string;
  placeholder?: string;
  blurDataURL?: string;
};

export const Image = forwardRef<HTMLImageElement, ImageProps>(function Image(
  { src, alt, fill, priority, sizes, className, style, loading, decoding, ...rest },
  ref
) {
  const computedStyle: CSSProperties = fill
    ? {
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        objectFit: "cover",
        ...style,
      }
    : style ?? {};

  return (
    <img
      ref={ref}
      src={src}
      alt={alt}
      sizes={sizes}
      className={className}
      style={computedStyle}
      loading={priority ? "eager" : loading ?? "lazy"}
      decoding={priority ? "sync" : decoding ?? "async"}
      {...rest}
    />
  );
});

export default Image;
