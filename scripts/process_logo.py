from PIL import Image
import os

src = r'C:\Users\prade\.cursor\projects\c-Users-prade-Desktop-Smart-Resume-Shortlisting-System\assets\c__Users_prade_AppData_Roaming_Cursor_User_workspaceStorage_eae9781c9928dbdd5c0435742a7b346e_images_WhatsApp_Image_2026-06-06_at_1.23.50_PM-ece08598-2056-4d46-8fec-f316e92b7a6d.png'
out_dir = r'C:\Users\prade\Desktop\Smart Resume Shortlisting System\frontend\public'

img = Image.open(src).convert('RGBA')
w, h = img.size
pixels = img.load()


def is_bg(r, g, b, a):
    if a < 10:
        return True
    lum = 0.299 * r + 0.587 * g + 0.114 * b
    if lum < 32 and b >= r - 2 and b >= g - 8:
        return True
    if lum < 20:
        return True
    return False


for y in range(h):
    for x in range(w):
        r, g, b, a = pixels[x, y]
        if is_bg(r, g, b, a):
            pixels[x, y] = (r, g, b, 0)

row_counts = [sum(1 for x in range(w) if pixels[x, y][3] > 20) for y in range(h)]

split_y = h
for y in range(int(h * 0.45), int(h * 0.75)):
    if row_counts[y] < 25 and row_counts[y + 1] < 25 and row_counts[y + 2] < 25:
        above = max(row_counts[max(0, y - 40):y])
        below = max(row_counts[y + 3 : min(h, y + 80)])
        if above > 80 and below > 80:
            split_y = y
            break

print('Split at y:', split_y)

icon_coords = [(x, y) for y in range(0, split_y) for x in range(w) if pixels[x, y][3] > 20]
if not icon_coords:
    raise SystemExit('No icon pixels found')

xs = [c[0] for c in icon_coords]
ys = [c[1] for c in icon_coords]
pad = 16
left = max(0, min(xs) - pad)
right = min(w, max(xs) + pad + 1)
top = max(0, min(ys) - pad)
bottom = min(split_y, max(ys) + pad + 1)

icon = img.crop((left, top, right, bottom))

full_path = os.path.join(out_dir, 'shortlistiq-logo.png')
icon_path = os.path.join(out_dir, 'shortlistiq-logo-icon.png')

img.save(full_path, 'PNG', optimize=False)
icon.save(icon_path, 'PNG', optimize=False)

print('Full:', img.size, '->', full_path)
print('Icon:', icon.size, '->', icon_path)
