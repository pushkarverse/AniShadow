import WatchPage from "@/app/watch/[id]/[slug]/page";

export default function AnimeWatchPage(props: Parameters<typeof WatchPage>[0]) {
	return WatchPage(props);
}
