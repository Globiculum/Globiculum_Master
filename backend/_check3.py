import pandas as pd, sys, os
from pathlib import Path

outpath = os.path.join(os.path.dirname(__file__), "_url_out.txt")
data = Path(os.path.join(os.path.dirname(__file__), "data", "Ncret"))
lines = []
for gd in sorted(data.iterdir()):
    if not gd.is_dir():
        continue
    if not any(x in gd.name for x in ["6","7","8"]):
        continue
    for f in sorted(gd.glob("*.xlsx")):
        try:
            df = pd.read_excel(f, engine="openpyxl")
            has_url = "URL" in df.columns
            urls = []
            if has_url:
                for v in df["URL"]:
                    s = str(v).strip()
                    if s and s.lower() not in ("nan","none",""):
                        urls.append(s)
            lines.append(f"{f.name} | URL_col={has_url} | filled={len(urls)}/{len(df)} | sample={urls[0][:80] if urls else 'NONE'}")
        except Exception as e:
            lines.append(f"{f.name} | ERROR: {e}")

with open(outpath, "w", encoding="utf-8") as fout:
    fout.write("\n".join(lines))
