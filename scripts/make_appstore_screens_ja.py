import os
from pathlib import Path
from typing import List, Tuple, Dict

from PIL import Image, ImageDraw, ImageFont


def pick_japanese_font() -> str:
    candidates = [
        r"C:\Windows\Fonts\meiryo.ttc",
        r"C:\Windows\Fonts\meiryob.ttc",
        r"C:\Windows\Fonts\YuGothR.ttc",
        r"C:\Windows\Fonts\YuGothB.ttc",
        r"C:\Windows\Fonts\msgothic.ttc",
    ]
    for p in candidates:
        if os.path.exists(p):
            return p
    raise RuntimeError("日本語フォントが見つかりませんでした（Windows Fonts 参照に失敗）")


def wrap_text(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.FreeTypeFont, max_width: int) -> List[str]:
    # Simple Japanese-friendly wrap: split by newline, then wrap by char using measured width
    lines: List[str] = []
    for raw in text.split("\n"):
        s = raw.strip()
        if not s:
            lines.append("")
            continue
        cur = ""
        for ch in s:
            test = cur + ch
            if draw.textlength(test, font=font) <= max_width or not cur:
                cur = test
            else:
                lines.append(cur)
                cur = ch
        if cur:
            lines.append(cur)
    return lines


def draw_caption(img: Image.Image, title: str, bullets: List[str]) -> Image.Image:
    w, h = img.size
    img_rgba = img.convert("RGBA")
    overlay = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)

    font_path = pick_japanese_font()
    title_size = max(34, int(w * 0.055))
    body_size = max(22, int(w * 0.032))
    title_font = ImageFont.truetype(font_path, title_size)
    body_font = ImageFont.truetype(font_path, body_size)

    pad = int(w * 0.045)
    box_w = w - pad * 2
    # Estimate height
    tmp = ImageDraw.Draw(img_rgba)
    wrapped_bullets: List[str] = []
    for b in bullets:
        wrapped_bullets.extend(wrap_text(tmp, f"・{b}", body_font, box_w - int(w * 0.04)))
    title_h = title_font.getbbox(title)[3]
    line_h = body_font.getbbox("あ")[3] + int(body_size * 0.35)
    box_h = int(pad * 0.6) + title_h + int(body_size * 0.55) + line_h * len(wrapped_bullets) + int(pad * 0.55)
    box_h = min(box_h, int(h * 0.34))

    x0, y0 = pad, pad
    x1, y1 = w - pad, pad + box_h
    radius = int(w * 0.04)

    # Soft panel
    d.rounded_rectangle((x0, y0, x1, y1), radius=radius, fill=(255, 254, 248, 235), outline=(231, 226, 213, 255), width=2)

    tx = x0 + int(pad * 0.6)
    ty = y0 + int(pad * 0.45)
    d.text((tx, ty), title, font=title_font, fill=(17, 24, 39, 255))

    ty += title_h + int(body_size * 0.45)
    for line in wrapped_bullets:
        if line == "":
            ty += line_h // 2
            continue
        d.text((tx, ty), line, font=body_font, fill=(55, 65, 81, 255))
        ty += line_h

    out = Image.alpha_composite(img_rgba, overlay)
    return out.convert("RGB")


def main():
    # These are the "yesterday screenshots" provided in the chat.
    inputs: List[Tuple[str, str, List[str], str]] = [
        (
            r"C:\Users\81808\.cursor\projects\c-Users-81808-Desktop-app\assets\c__Users_81808_AppData_Roaming_Cursor_User_workspaceStorage_eda04bced287676f0f0f1d9b44a2aeb9_images_r3_FCAD28FD-1E20-4769-9F77-945046B67C3E-e647f00f-3c72-468b-b055-a84df68ce471.png",
            "買い物メモを管理",
            ["メモを追加・チェック", "日時リマインド（アラーム式）", "店舗ごとに通知ON/OFF"],
            "01_memo.png",
        ),
        (
            r"C:\Users\81808\.cursor\projects\c-Users-81808-Desktop-app\assets\c__Users_81808_AppData_Roaming_Cursor_User_workspaceStorage_eda04bced287676f0f0f1d9b44a2aeb9_images_r2_C1ACCD5A-B186-4E50-8654-00B3CBFF990A-9c33182e-bb6c-4830-bdd5-73b2e5c955f2.png",
            "店舗を地図で登録",
            ["地図タップ or ピン移動で場所指定", "現在地を取得してすぐ登録", "近づいた通知（半径200m）"],
            "02_add_store.png",
        ),
        (
            r"C:\Users\81808\.cursor\projects\c-Users-81808-Desktop-app\assets\c__Users_81808_AppData_Roaming_Cursor_User_workspaceStorage_eda04bced287676f0f0f1d9b44a2aeb9_images_r1_96469EF7-94B3-4902-9AC8-3A1F08F71A7D-340d2254-3415-4a61-8d68-40c02958e46f.png",
            "現在地の向きも表示",
            ["ライト表示で進行方向が分かる", "登録位置はピンで調整できる"],
            "03_location_heading.png",
        ),
    ]

    out_dir = Path(__file__).resolve().parent.parent / "store-assets" / "appstore" / "ja"
    out_dir.mkdir(parents=True, exist_ok=True)

    meta: Dict[str, Dict[str, int]] = {}

    for src, title, bullets, out_name in inputs:
        p = Path(src)
        if not p.exists():
            raise FileNotFoundError(f"入力画像が見つかりません: {src}")
        img = Image.open(p).convert("RGB")
        out = draw_caption(img, title, bullets)
        out_path = out_dir / out_name
        out.save(out_path, format="PNG", optimize=True)
        meta[out_name] = {"width": out.width, "height": out.height}

    # Write a small manifest for reference
    manifest = out_dir / "manifest.txt"
    lines = ["Generated App Store screenshots (JA):"]
    for name, wh in meta.items():
        lines.append(f"- {name}: {wh['width']}x{wh['height']}")
    manifest.write_text("\n".join(lines) + "\n", encoding="utf-8")

    print(str(manifest))


if __name__ == "__main__":
    main()

