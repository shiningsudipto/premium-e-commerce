import { describe, expect, it } from "vitest";
import { videoSource } from "./video";

describe("videoSource", () => {
  it("turns YouTube links into no-cookie embeds", () => {
    for (const url of [
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "https://youtu.be/dQw4w9WgXcQ",
      "https://m.youtube.com/shorts/dQw4w9WgXcQ",
      "https://www.youtube.com/embed/dQw4w9WgXcQ",
    ]) {
      expect(videoSource(url)).toEqual({
        kind: "embed",
        provider: "youtube",
        src: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0",
      });
    }
    expect(videoSource("https://youtu.be/dQw4w9WgXcQ", { autoplay: true, loop: true })?.src).toBe(
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0&autoplay=1&mute=1&loop=1&playlist=dQw4w9WgXcQ",
    );
  });

  it("turns Vimeo links into do-not-track embeds", () => {
    expect(videoSource("https://vimeo.com/76979871")).toEqual({
      kind: "embed",
      provider: "vimeo",
      src: "https://player.vimeo.com/video/76979871?dnt=1",
    });
  });

  it("plays other https files directly and refuses everything else", () => {
    expect(videoSource("https://cdn.shop.test/clip.mp4")).toEqual({
      kind: "file",
      src: "https://cdn.shop.test/clip.mp4",
    });
    expect(videoSource("http://cdn.shop.test/clip.mp4")).toBeNull();
    expect(videoSource("javascript:alert(1)")).toBeNull();
    expect(videoSource("not a url")).toBeNull();
    expect(videoSource("https://www.youtube.com/watch?v=bad")).toBeNull();
    expect(videoSource("https://vimeo.com/channels/staff")).toBeNull();
  });
});
