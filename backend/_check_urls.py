"""Quick check: do NCERT Excel files for grades 6-8 have URL columns, and are they populated?"""
import pandas as pd
from pathlib import Path

data_root = Path(r"d:\Sushma\Arna Intelligence\academi-align\backend\data\Ncret")

for grade_dir in sorted(data_root.iterdir()):
    if not grade_dir.is_dir():
        continue
    # Only check grades 6-8 (the grade band from the user's test)
    grade_name = grade_dir.name
    if not any(x in grade_name for x in ["6", "7", "8"]):
        continue
    
    for xlsx in sorted(grade_dir.glob("*.xlsx")):
        try:
            df = pd.read_excel(xlsx, engine="openpyxl")
            cols = list(df.columns)
            has_url_col = "URL" in cols
            url_vals = []
            if has_url_col:
                url_vals = [str(v).strip() for v in df["URL"].dropna().tolist() if str(v).strip() and str(v).strip().lower() != "nan"]
            
            print(f"\n{xlsx.name}")
            print(f"  Has URL column: {has_url_col}")
            print(f"  Non-empty URLs: {len(url_vals)}/{len(df)}")
            if url_vals:
                print(f"  Sample URL: {url_vals[0][:100]}")
            
            # Also show chapter names for context
            if "Chapter" in cols:
                chapters = df["Chapter"].dropna().tolist()[:3]
                print(f"  Chapters (first 3): {chapters}")
        except Exception as e:
            print(f"  ERROR: {e}")
