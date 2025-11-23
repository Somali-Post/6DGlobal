export async function onRequest(context) {
    const apiKey = context.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
        return new Response(
            JSON.stringify({ error: 'API key not configured' }),
            { status: 500, headers: { 'content-type': 'application/json', 'Cache-Control': 'no-store' } }
        );
    }

    return new Response(
        JSON.stringify({ key: apiKey }),
        { headers: { 'content-type': 'application/json', 'Cache-Control': 'no-store' } }
    );
}
