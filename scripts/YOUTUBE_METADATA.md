# Music-list titles

`npm run music:metadata:setup -- --ca <Supabase CA> --backfill` creates two
additive cache/budget tables and resolves existing saved links. It does not
change listening-item URLs, order, ownership or manually supplied titles.

The application reads metadata only after the user has access to the list.
Up to 50 distinct IDs are fetched in one `videos.list` / `playlists.list` call.
The shared PostgreSQL cache avoids repeating calls across users and server
instances. Database leases prevent concurrent cache misses from causing duplicate
requests. The app limits this feature to 200 metadata requests per UTC day and
backs off for an hour on quota/rate-limit errors. This limit covers this feature;
other existing YouTube API routes have their own usage.

Titles are refreshed after 28 days. Setup enables pg_cron and creates the scoped
daily `gitarakordi-youtube-metadata-expiry` job, which deletes cache rows older
than 29 days. Unavailable videos are retried after six hours; transient failures
back off for fifteen minutes. Expired values are never displayed as fresh data.

The UI identifies YouTube channel names as channels, not performers. User-written
labels remain primary, with the YouTube title below when different. Metadata
enrichment does not instantiate an iframe, start playback, or search YouTube.

Public source references:
- https://developers.google.com/youtube/data/reference/rest/v3/videos/list
- https://developers.google.com/youtube/terms/developer-policies#e.-handling-youtube-data-and-content
