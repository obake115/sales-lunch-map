from pathlib import Path

from PIL import Image


def main():
    src_dir = Path(__file__).resolve().parent.parent / "store-assets" / "appstore" / "ja"
    out_dir = Path(__file__).resolve().parent.parent / "store-assets" / "appstore" / "ja_iphone_65"
    out_dir.mkdir(parents=True, exist_ok=True)

    # App Store Connect iPhone 6.5" portrait accepts 1242x2688 (or landscape 2688x1242).
    target_w, target_h = 1242, 2688

    for name in ["01_memo.png", "02_add_store.png", "03_location_heading.png"]:
        p = src_dir / name
        if not p.exists():
            raise FileNotFoundError(str(p))

        img = Image.open(p).convert("RGB")
        # Same aspect ratio as iPhone 6.5 portrait; upscale with high quality.
        out = img.resize((target_w, target_h), resample=Image.Resampling.LANCZOS)
        out.save(out_dir / name, format="PNG", optimize=True)

    (out_dir / "README.txt").write_text(
        "iPhone 6.5-inch App Store screenshots (1242x2688)\n"
        "Upload these in App Store Connect -> iOS App Version 1.0 -> iPhone 6.5-inch.\n",
        encoding="utf-8",
    )

    print(str(out_dir))


if __name__ == "__main__":
    main()

