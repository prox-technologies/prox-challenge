from pathlib import Path
import pymupdf

PDF_DIR = Path("files")
OUTPUT_DIR = Path("knowledge")
IMAGE_DIR = OUTPUT_DIR / "images"

OUTPUT_DIR.mkdir(exist_ok=True)
IMAGE_DIR.mkdir(exist_ok=True)

for pdf_path in PDF_DIR.glob("*.pdf"):
    print(f"Processing {pdf_path.name}...")

    doc = pymupdf.open(pdf_path)
    text_output = []

    for page_num, page in enumerate(doc, start=1):
        text = page.get_text("text").strip()

        text_output.append(
            f"\n\n===== {pdf_path.name} | PAGE {page_num} =====\n{text}"
        )

        images = page.get_images(full=True)

        for image_index, image in enumerate(images):
            xref = image[0]

            try:
                pix = pymupdf.Pixmap(doc, xref)

                if pix.n - pix.alpha > 3:
                    pix = pymupdf.Pixmap(pymupdf.csRGB, pix)

                image_name = (
                    f"{pdf_path.stem}_page_{page_num}_image_{image_index}.png"
                )

                image_path = IMAGE_DIR / image_name
                pix.save(image_path)
                pix = None

            except Exception as e:
                print(f"Image error: {e}")

    output_file = OUTPUT_DIR / f"{pdf_path.stem}.txt"
    output_file.write_text(
        "".join(text_output),
        encoding="utf-8"
    )

    print(f"Created {output_file}")

print("Extraction complete.")