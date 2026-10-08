import {
  useLocation,
  useNavigate,
  useSearchParams as useRRSearchParams,
} from "react-router-dom";

export function usePathname(): string {
  return useLocation().pathname;
}

type NavigateOptions = { scroll?: boolean };

export function useRouter() {
  const navigate = useNavigate();
  const location = useLocation();

  return {
    pathname: location.pathname,
    push: (href: string, _options?: NavigateOptions) => {
      navigate(href);
    },
    replace: (href: string, _options?: NavigateOptions) => {
      navigate(href, { replace: true });
    },
    back: () => navigate(-1),
    forward: () => navigate(1),
    refresh: () => {
      window.location.reload();
    },
    prefetch: () => {},
  };
}

export function useSearchParams(): URLSearchParams {
  return useRRSearchParams()[0];
}

