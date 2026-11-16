import { describe, expect, it } from "vitest";
import { detectPlatform } from "./install.ts";

const UA = {
  iphoneSafari: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1",
  iphoneChrome: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/138.0 Mobile/15E148 Safari/604.1",
  iphoneInstagram: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 390.0.0",
  ipad: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15",
  android: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0 Mobile Safari/537.36",
};

describe("detectPlatform", () => {
  it("reconhece cada navegador", () => {
    expect(detectPlatform(UA.iphoneSafari, 5, false)).toBe("ios");
    expect(detectPlatform(UA.iphoneChrome, 5, false)).toBe("ios-other");
    expect(detectPlatform(UA.iphoneInstagram, 5, false)).toBe("ios-inapp");
    expect(detectPlatform(UA.ipad, 5, false)).toBe("ios");
    expect(detectPlatform(UA.ipad, 0, false)).toBe("desktop"); // Mac de verdade
    expect(detectPlatform(UA.android, 5, false)).toBe("android");
  });
  it("já instalado não mostra nada", () => {
    expect(detectPlatform(UA.iphoneSafari, 5, true)).toBe("standalone");
  });
});
