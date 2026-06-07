import PopularPage from "@/app/popular/page";

export const dynamic = "force-dynamic";

export default function AnimePopularPage(props: Parameters<typeof PopularPage>[0]) {
	return PopularPage({ ...props, baseUrl: "/anime/popular" });
}
