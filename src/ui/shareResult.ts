/**
 * Gera uma imagem do resultado (título + classificação) no próprio aparelho e compartilha
 * pelo menu do sistema, ou baixa como PNG quando o navegador não suporta compartilhar arquivos.
 */
export async function shareResultImage(opts: { title: string; subtitle: string; rows: { name: string; value: string }[]; filename: string }): Promise<"shared" | "downloaded" | "failed"> {
  try {
    const W = 1080;
    const rowH = 130;
    const H = Math.max(1080, 460 + opts.rows.length * rowH + 140);
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    const g = c.getContext("2d");
    if (!g) return "failed";
    const css = getComputedStyle(document.documentElement);
    const display = css.getPropertyValue("--font-rounded").trim() || "sans-serif";
    const ui = css.getPropertyValue("--font-onest").trim() || "sans-serif";
    const medal = ["#FFC23D", "#6EC1FF", "#FF6F91", "#B7A4FF", "#43C59E"];

    g.fillStyle = "#F1F4EF";
    g.fillRect(0, 0, W, H);
    g.fillStyle = "#0B3B2E";
    g.beginPath();
    g.roundRect(60, 60, W - 120, 300, 48);
    g.fill();
    g.fillStyle = "#FFC23D";
    g.font = `900 76px ${display}`;
    g.fillText(opts.title, 110, 190, W - 220);
    g.fillStyle = "#CFE3DA";
    g.font = `500 38px ${ui}`;
    g.fillText(opts.subtitle, 110, 280, W - 220);

    opts.rows.slice(0, 10).forEach((r, i) => {
      const y = 420 + i * rowH;
      g.fillStyle = "#D3DDD3";
      g.beginPath();
      g.roundRect(60, y + 8, W - 120, rowH - 24, 32);
      g.fill();
      g.fillStyle = "#FFFFFF";
      g.beginPath();
      g.roundRect(60, y, W - 120, rowH - 24, 32);
      g.fill();
      g.fillStyle = medal[i] ?? "#E4EBE3";
      g.beginPath();
      g.roundRect(84, y + 18, 70, 70, 22);
      g.fill();
      g.fillStyle = "#14241E";
      g.textAlign = "center";
      g.font = `900 42px ${display}`;
      g.fillText(String(i + 1), 119, y + 68);
      g.textAlign = "left";
      g.font = `800 46px ${display}`;
      g.fillText(r.name, 180, y + 68, W - 480);
      g.textAlign = "right";
      g.font = `900 46px ${display}`;
      g.fillText(r.value, W - 100, y + 68);
      g.textAlign = "left";
    });

    g.fillStyle = "#4B5E56";
    g.font = `600 34px ${ui}`;
    g.fillText("DeResenha", 60, H - 60);

    const blob = await new Promise<Blob | null>((res) => c.toBlob(res, "image/png"));
    if (!blob) return "failed";
    const file = new File([blob], opts.filename, { type: "image/png" });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: opts.title });
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
