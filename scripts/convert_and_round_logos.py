import os
import shutil
from PIL import Image, ImageDraw

def round_corners_antialiased(image_path, output_path, radius, size=(512, 512)):
    # 1. Open and convert to RGBA
    with Image.open(image_path) as img:
        img = img.convert("RGBA")
        img_resized = img.resize(size, Image.Resampling.LANCZOS)
        
    # 2. Create high-resolution mask for high-quality anti-aliasing
    scale = 4
    high_res_size = (size[0] * scale, size[1] * scale)
    high_res_radius = radius * scale
    
    # Create mask image
    mask = Image.new("L", high_res_size, 0)
    draw = ImageDraw.Draw(mask)
    
    # Draw rounded rectangle in high resolution
    draw.rounded_rectangle(
        [0, 0, high_res_size[0], high_res_size[1]],
        radius=high_res_radius,
        fill=255
    )
    
    # Scale down mask with Lanczos filter for smooth antialiased edges
    mask_resized = mask.resize(size, Image.Resampling.LANCZOS)
    
    # 3. Create transparent output and paste resized image using mask
    output_img = Image.new("RGBA", size, (0, 0, 0, 0))
    output_img.paste(img_resized, (0, 0), mask=mask_resized)
    
    # 4. Save to target path as PNG
    output_img.save(output_path, "PNG")
    print(f"Successfully created rounded image: {output_path}")
    return output_img

def main():
    public_dir = r"c:\Users\hp\Mailent\public"
    backup_dir = os.path.join(public_dir, "logo_backups")
    
    # Create backup directory if it doesn't exist
    os.makedirs(backup_dir, exist_ok=True)
    
    # Files to replace/round
    logo_files = [
        "favicon.png",
        "apple-touch-icon.png",
        "mailient-logo-premium.png",
        "mailient-logo-v3.png",
        "mailient-logo.png"
    ]
    
    # First, let's backup all original files
    print("Backing up original logo assets...")
    for filename in logo_files + ["favicon.ico"]:
        src_file = os.path.join(public_dir, filename)
        backup_file = os.path.join(backup_dir, filename)
        if os.path.exists(src_file):
            shutil.copy2(src_file, backup_file)
            print(f"Backed up: {src_file} -> {backup_file}")
    
    # Run rounding process on one image to get the master rounded image
    master_src = os.path.join(backup_dir, "favicon.png")
    master_rounded_path = os.path.join(backup_dir, "master_rounded.png")
    
    # Round with a premium 104px radius for 528x528 size (exact multiple of 48 for Google's favicon guidelines)
    master_img = round_corners_antialiased(master_src, master_rounded_path, radius=104, size=(528, 528))
    
    # Copy the master rounded PNG to all the target png files
    print("\nApplying rounded corners to all PNG logo files...")
    for filename in logo_files:
        dest_file = os.path.join(public_dir, filename)
        shutil.copy2(master_rounded_path, dest_file)
        print(f"Updated: {dest_file}")
        
    # Generate a true favicon.ico file with multiple resolutions
    ico_dest = os.path.join(public_dir, "favicon.ico")
    print("\nGenerating multi-resolution favicon.ico...")
    sizes = [(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
    # Save the master_img as an ICO
    master_img.save(ico_dest, format="ICO", sizes=sizes)
    print(f"Successfully generated: {ico_dest}")

if __name__ == "__main__":
    main()
