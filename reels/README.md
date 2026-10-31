# reels

One folder per video. Git ignores everything in here except this file, so none of it gets committed.

```
reels/
  my-video/           you make this, named for the video
    raw/              you: your raw takes, as video files
    assets/           you: logos, photos, cut-outs, screenshots, screen recordings, a background picture
    brief.md          Claude: the facts allowed on screen
    cut.json          Claude: which takes play, and what's dropped
    edit.tsx          Claude: the scenes, captions and sound
    graphics.tsx      Claude: the animated graphics
    audio/            Claude: music and sound effects for this video
    work/             generated: the transcript, the cut, the cut-out
    renders/          the finished video, my-video.mp4, and still frames
```

Then open Claude Code in the project folder and say **"go"**. It asks for anything else the video needs.

Takes play in file-name order unless you tell Claude otherwise. Shoot vertical, phone at eye level, head and shoulders
with some room above the head.
