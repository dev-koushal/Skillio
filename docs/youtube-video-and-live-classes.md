# YouTube lectures and institution Live Classes

## Lecture sources

Lectures continue to use the existing playback authorization route. `videoProvider` distinguishes `bunny`, legacy `cloudinary`, and `youtube`. YouTube lectures store only `youtubeVideoId` and a canonical `youtubeUrl`; arbitrary iframe markup is never accepted or rendered. Uploads continue through the Bunny Stream service, with the existing Cloudinary fallback.

The educator UI accepts secure `youtube.com` and `youtu.be` watch, short, embed, and live links. The server extracts and validates the 11-character video ID on validation, create, and update. It does not call YouTube on page load and does not require a YouTube Data API key. A structurally valid link does not prove a video exists or permits embedding; the player reports playback failures inside Skillio.

The student player keeps one 16:9 Skillio frame for Bunny, Cloudinary, and YouTube. YouTube playback uses `youtube-nocookie.com`, supported `controls=1`, `playsinline=1`, `rel=0`, and the IFrame API `enablejsapi=1` plus the current site `origin`. The IFrame API reports the ended event so the existing Skillio next-lecture action can continue. The application does not persist YouTube watch time because there is no existing per-lecture progress model; course progress shown today is the selected lesson position.

YouTube owns its player behavior and embedding restrictions. `rel=0` limits end-of-video related items to the same channel; it does not remove related videos entirely. Privacy-enhanced mode affects personalization behavior for embedded playback; it does not make a public or unlisted video private. Some owners disable embedding, and some videos cannot play on third-party sites. Skillio does not bypass those restrictions.

## Institution Live Classes

`LiveClass` is a separate collection scoped to both `tenantId` and `institutionId` (the institution Tenant record ID), with `createdBy`, YouTube video ID/canonical URL, status, and start/end timestamps. A partial unique index permits at most one `isActive: true` record per institution. Educator list/create/update/activate/end/cancel endpoints are scoped to the resolved request tenant and require an educator role. Student current/playback endpoints require authenticated membership in the resolved institution and return no other tenant's class.

Run `npm run migrate:live-class-indexes` during deployment after setting the production `MONGO_URI`. This creates the declared indexes, including the per-institution active-session constraint, without dropping existing indexes.

Educators can add a YouTube Live URL without external API configuration. A new link stays hidden until the educator selects **Show to students**; **End & remove alert** immediately removes an active link from the student home. If `YOUTUBE_API_KEY` is configured, the server can also reconcile starts and ends through YouTube Data API v3 `videos.list` (default every 30 seconds, configurable with `YOUTUBE_LIVE_SYNC_INTERVAL_MS`). Without that optional key, educators control visibility manually. Skillio does not broadcast. An already-loaded public/unlisted YouTube embed cannot be made cryptographically private or remotely revoked by Skillio.

The home page shows the same authorized YouTube player used by the live-class page, inside a compact live card with a rotating red signal ring and LIVE badge. The card checks current status every 20 seconds; the player end event hides the local alert immediately while server reconciliation clears it for every other student.

## API routes

- `POST /api/course/youtube/validate` â€” educator-only lecture URL shape validation.
- `GET /api/institution/live` â€” educator list for the active institution.
- `POST /api/institution/live/validate-youtube` â€” educator-only live URL shape validation.
- `POST /api/institution/live` â€” schedule a session.
- `PUT /api/institution/live/:liveClassId` â€” update a scheduled/live record in the active institution.
- `POST /api/institution/live/:liveClassId/activate` â€” mark one session live, ending any previous active session in that tenant.
- `POST /api/institution/live/:liveClassId/end` â€” end an active session.
- `DELETE /api/institution/live/:liveClassId` â€” remove a scheduled link or end an active alert.
- `GET /api/institution/live/current` â€” member-only current session for the active institution.
- `GET /api/institution/live/:liveClassId/playback` â€” member-only playback authorization for an active session.

