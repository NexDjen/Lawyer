import sys
import json
import argparse
import os
import tempfile
from pdf2image import convert_from_path
import pytesseract

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--input', required=True)
    parser.add_argument('--lang', default='rus+eng')
    args = parser.parse_args()

    pdf_path = args.input
    lang = args.lang

    # Convert PDF pages to images
    with tempfile.TemporaryDirectory() as tmpdir:
        pages = convert_from_path(pdf_path, dpi=300, output_folder=tmpdir, fmt='png')
        texts = []
        for idx, img in enumerate(pages):
            txt = pytesseract.image_to_string(img, lang=lang)
            texts.append(f"--- Страница {idx+1} ---\n" + txt)
        recognized = "\n\n".join(texts).strip()
        out = {
            'recognizedText': recognized
        }
        print(json.dumps(out, ensure_ascii=False))

if __name__ == '__main__':
    try:
        main()
    except Exception as e:
        sys.stderr.write(str(e))
        sys.exit(1)

