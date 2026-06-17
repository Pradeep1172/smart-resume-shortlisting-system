from PIL import Image
import os

src = r'C:\Users\prade\Desktop\Smart Resume Shortlisting System\frontend\public\shortlistiq-logo-icon.png'
out_dir = r'C:\Users\prade\Desktop\Smart Resume Shortlisting System\frontend\public'

icon = Image.open(src).convert('RGBA')


def make_square_favicon(size: int) -> Image.Image:
    canvas = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    scale = min(size / icon.width, size / icon.height) * 0.88
    new_w = max(1, int(icon.width * scale))
    new_h = max(1, int(icon.height * scale))
    resized = icon.resize((new_w, new_h), Image.Resampling.LANCZOS)
    offset = ((size - new_w) // 2, (size - new_h) // 2)
    canvas.paste(resized, offset, resized)
    return canvas


sizes = [16, 32, 48, 180]
for size in sizes:
    fav = make_square_favicon(size)
    name = 'apple-touch-icon.png' if size == 180 else f'favicon-{size}x{size}.png'
    fav.save(os.path.join(out_dir, name), 'PNG', optimize=False)

# Multi-size ICO for broad browser support
ico_images = [make_square_favicon(s) for s in (16, 32, 48)]
ico_path = os.path.join(out_dir, 'favicon.ico')
ico_images[0].save(
    ico_path,
    format='ICO',
    sizes=[(img.width, img.height) for img in ico_images],
    append_images=ico_images[1:],
)

print('Favicons created in', out_dir)
