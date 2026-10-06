# Walkthrough video

[`team-activation-lab-walkthrough.mp4`](team-activation-lab-walkthrough.mp4): 144 s, 1080×1920, 30 fps, H.264 + AAC, with burned-in subtitles. A separate [SRT](team-activation-lab-walkthrough.srt) and the timed [script](VOICEOVER.md) are included.

- A live recording of the real UI running locally (`npm run dev`) with synthetic data. Nothing is staged or composited: every state shown came from real clicks in the app.
- Path shown: manager goal → plan → simulated invites → first value; then the growth view for Scenario A (validation, contract, funnel, results, **Ship**) and Scenario B (**No decision**), decision export, and the footer credit.
- The highlighted cursor and the smooth zooms are drawn in the page during recording. Zooms are CSS scale on the page.
- No paid service was used to produce the video.
- Rebuild: `node scripts/record-walkthrough.mjs` (dev server running), then `python3 scripts/assemble-walkthrough.py`.
