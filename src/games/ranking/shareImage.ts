/**
 * Desenha o ranking num canvas e compartilha (Web Share com arquivo) ou baixa como PNG.
 * Tudo acontece no aparelho: nada é enviado a servidor.
 */
export async function shareRankingImage(title: string, items: string[], by: string): Promise<"shared" | "downloaded" | "failed"> {
  try {
    const W = 1080;
    const H = 1350;
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    const g = c.getContext("2d");
    if (!g) return "failed";
    const css = getComputedStyle(document.documentElement);
    const display = css.getPropertyValue("--font-rounded").trim() || "sans-serif";
    const ui = css.getPropertyValue("--font-onest").trim() || "sans-serif";
    const colors = ["#FFC23D", "#6EC1FF", "#FF6F91", "#B7A4FF", "#43C59E", "#FFF0C9", "#DDF0FF"];

    g.fillStyle = "#F1F4EF";
    g.fillRect(0, 0, W, H);
    g.fillStyle = "#0F6B52";
    roundRect(g, 60, 60, W - 120, 300, 48);
    g.fill();
    g.fillStyle = "#fff";
    g.font = `900 72px ${display}`;
    wrap(g, title, 110, 175, W - 220, 84);
    g.font = `500 36px ${ui}`;
    g.fillStyle = "#CFE3DA";
    g.fillText(`Ranking às Cegas de ${by}`, 110, 320);

    items.forEach((it, i) => {
      const y = 420 + i * 160;
      g.fillStyle = "#D3DDD3";
      roundRect(g, 60, y + 10, W - 120, 130, 36);
      g.fill();
      g.fillStyle = "#fff";
      roundRect(g, 60, y, W - 120, 130, 36);
      g.fill();
      g.fillStyle = colors[i] ?? "#FFC23D";
      roundRect(g, 90, y + 25, 80, 80, 24);
      g.fill();
      g.fillStyle = "#14241E";
      g.font = `900 48px ${display}`;
      g.textAlign = "center";
      g.fillText(String(i + 1), 130, y + 82);
      g.textAlign = "left";
      g.font = `800 50px ${display}`;
      g.fillText(it, 200, y + 82, W - 320);
    });

    g.fillStyle = "#4B5E56";
    g.font = `600 34px ${ui}`;
    g.fillText("DeResenha", 60, H - 70);

    const blob = await new Promise<Blob | null>((r) => c.toBlob(r, "image/png"));
    if (!blob) return "failed";
    const file = new File([blob], "ranking-deresenha.png", { type: "image/png" });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title });
        return "shared";
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return "failed";
      }
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return "downloaded";
  } catch {
    return "failed";
  }
}

function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.roundRect(x, y, w, h, r);
}

function wrap(g: CanvasRenderingContext2D, text: string, x: number, y: number, max: number, lh: number) {
  const words = text.split(" ");
  let line = "";
  let yy = y;
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (g.measureText(test).width > max && line) {
      g.fillText(line, x, yy);
      line = w;
      yy += lh;
    } else line = test;
  }
  g.fillText(line, x, yy);
}
