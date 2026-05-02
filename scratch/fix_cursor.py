from PIL import Image

def process_cursor(input_path, output_path):
    img = Image.open(input_path).convert("RGBA")
    datas = img.getdata()

    new_data = []
    for item in datas:
        # If it's very bright (background), make it transparent
        # Adjust threshold as needed. 250 is near white.
        if item[0] > 240 and item[1] > 240 and item[2] > 240:
            new_data.append((255, 255, 255, 0))
        else:
            new_data.append(item)

    img.putdata(new_data)
    # Resize to standard cursor size 32x32
    img = img.resize((32, 32), Image.Resampling.LANCZOS)
    img.save(output_path, "PNG")

if __name__ == "__main__":
    input_p = 'C:/Users/hp/.gemini/antigravity/brain/363bf06c-d9c6-4591-a62a-97bbfa7e4258/macos_hand_cursor_1777623222430.png'
    output_p = 'c:/Users/hp/Mailent/public/macos-cursor.png'
    process_cursor(input_p, output_p)
