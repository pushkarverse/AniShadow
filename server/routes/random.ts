export async function randomHandler(): Promise<Response> {
    const query = `
    query ($page: Int, $perPage: Int) {
      Page (page: $page, perPage: $perPage) {
        media (type: ANIME, sort: POPULARITY_DESC) {
          id
          title {
            english
            romaji
            native
          }
        }
      }
    }`;

    try {
        // Pick a random page from the first 5 pages of popular anime
        const randomPage = Math.floor(Math.random() * 5) + 1;
        const response = await fetch('https://graphql.anilist.co', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({ query, variables: { page: randomPage, perPage: 50 } })
        });

        const data = await response.json();
        const results = data?.data?.Page?.media || [];

        if (results.length > 0) {
            const randomAnime = results[Math.floor(Math.random() * results.length)];
            const title = randomAnime.title.english || randomAnime.title.romaji || randomAnime.title.native;
            const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
            return Response.json({ id: randomAnime.id, slug });
        }

        return Response.json({ error: 'No anime found' }, { status: 404 });
    } catch (error) {
        console.error("Random API Error:", error);
        return Response.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
