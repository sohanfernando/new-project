import pypdf

# Test the latest uploaded file
reader = pypdf.PdfReader('uploads/fcb5ea93-370a-4dc9-a128-e39105846ff1.pdf')
print(f'Latest file - Pages: {len(reader.pages)}')
for i, page in enumerate(reader.pages):
    text = page.extract_text()
    tlen = len(text) if text else 0
    print(f'  Page {i}: text_len={tlen}')
    if text:
        print(f'    Content: {repr(text[:300])}')
    try:
        imgs = page.images
        print(f'    Images: {len(imgs)}')
    except Exception:
        print('    Images: unable to check')

print()

# Test the known working file
reader2 = pypdf.PdfReader('uploads/4d8c402b-86cd-4b1d-a881-d84ac4f9d5c0.pdf')
print(f'Known working file - Pages: {len(reader2.pages)}')
for i, page in enumerate(reader2.pages):
    text = page.extract_text()
    tlen = len(text) if text else 0
    print(f'  Page {i}: text_len={tlen}')
    if text:
        print(f'    Content: {repr(text[:300])}')

# Check file sizes
import os
latest_size = os.path.getsize('uploads/fcb5ea93-370a-4dc9-a128-e39105846ff1.pdf')
working_size = os.path.getsize('uploads/4d8c402b-86cd-4b1d-a881-d84ac4f9d5c0.pdf')
print(f'\nLatest file size: {latest_size} bytes')
print(f'Working file size: {working_size} bytes')
