import sys

import ddddocr


def recognize_captcha(image_path: str) -> str:
    ocr = ddddocr.DdddOcr(show_ad=False)
    with open(image_path, "rb") as f:
        img_bytes = f.read()
    return ocr.classification(img_bytes)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python recognize.py <image_path>", file=sys.stderr)
        sys.exit(1)

    path = sys.argv[1]
    result = recognize_captcha(path)
    print(result)
