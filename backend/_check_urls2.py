import pandas as pd, sys
from pathlib import Path
data = Path(r"d:\Sushma\Arna Intelligence\academi-align\backend\data\Ncret")
out = []
for gd in sorted(data.iterdir()):
    if not gd.is_dir() or not any(x in gd.name for x in ["6","7","8"]): continue
    for f in sorted(gd.glob("*.xlsx")):
        try:
            df = pd.read_excel(f, engine="openpyxl")
            has_url = "URL" in df.columns
            urls = [str(v).strip() for v in df.get("URL", pd.Series()).dropna() if str(v).strip() not in ("","nan","None")]
            out.append(f"{f.name} | URL_col={has_url} | filled={len(urls)}/{len(df)} | sample={urls[0][:80] if urls else 'NONE'}")
        except Exception as e:
            out.append(f"{f.name} | ERROR: {e}")
Path(r"d:\Sushma\Arna Intelligence\academi-align\backend\_url_report.txt").write_text("\n".join(out))
print("Done")
