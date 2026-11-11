import assert from "node:assert/strict";
import { parseYouTubeVideoUrl } from "./youtubeVideo.js";

const id = "dQw4w9WgXcQ";
for (const url of [
  `https://www.youtube.com/watch?v=${id}`,
  `https://youtu.be/${id}?si=share`,
  `https://www.youtube.com/embed/${id}`,
  `https://www.youtube.com/live/${id}`,
]) assert.equal(parseYouTubeVideoUrl(url).videoId, id);

for (const url of [
  `javascript:alert(1)`,
  `<iframe src="https://www.youtube.com/embed/${id}"></iframe>`,
  `https://youtube.com.attacker.example/watch?v=${id}`,
  `https://youtube.com/watch?v=${id}&x=<script>`,
  `https://youtube.com/watch?v=short`,
  `http://youtube.com/watch?v=${id}`,
]) assert.throws(() => parseYouTubeVideoUrl(url));

console.log("YouTube URL parser checks passed.");
