import LatestPage from "@/app/latest/page";

export const dynamic = "force-dynamic";

export default function AnimeLatestPage(props: Parameters<typeof LatestPage>[0]) {
	return LatestPage({ ...props, baseUrl: "/anime/latest" });
}
