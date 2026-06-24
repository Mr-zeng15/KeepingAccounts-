import cairosvg
import os

svg_path = os.path.join(os.path.dirname(__file__), '..', 'assets', 'icon.svg')
res_dir = os.path.join(os.path.dirname(__file__), '..', 'android', 'app', 'src', 'main', 'res')

sizes = {
    'mipmap-mdpi': 48,
    'mipmap-hdpi': 72,
    'mipmap-xhdpi': 96,
    'mipmap-xxhdpi': 144,
    'mipmap-xxxhdpi': 192,
}

for folder, size in sizes.items():
    dir_path = os.path.join(res_dir, folder)
    os.makedirs(dir_path, exist_ok=True)

    png_data = cairosvg.svg2png(url=svg_path, output_width=size, output_height=size)

    files = ['ic_launcher.png', 'ic_launcher_round.png',
             'ic_launcher_background.png', 'ic_launcher_foreground.png']
    for f in files:
        path = os.path.join(dir_path, f)
        with open(path, 'wb') as out:
            out.write(png_data)
        print(f"  {folder}/{f} ({size}x{size})")

print("Done!")
