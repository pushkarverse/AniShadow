import { NextResponse } from 'next/server';

export async function GET() {
    const query = `
    query ($page: Int, $perPage: Int) {
      Page (page: $page, perPage: $perPage) {
        media (type: ANIME, sort: POPULARITY_DESC) {
          id
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
            return NextResponse.json({ id: randomAnime.id });
        }
        
        return NextResponse.json({ error: 'No anime found' }, { status: 404 });
    } catch (error) {
        console.error("Random API Error:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
