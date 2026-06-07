import TrendingPage from "@/app/trending/page";

export const dynamic = "force-dynamic";

export default function AnimeTrendingPage(props: Parameters<typeof TrendingPage>[0]) {
	return TrendingPage({ ...props, baseUrl: "/anime/trending" });
}
