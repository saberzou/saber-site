#!/usr/bin/env python3
"""
Pixel Icon Generator v2 for SaberOS
Better designs, proper transparency, warm palette
"""

from PIL import Image, ImageDraw
import os

# Warm palette
COLORS = {
    'bg': (255, 248, 240, 0),      # Transparent
    'orange': (255, 140, 66, 255),  # Main orange
    'cream': (255, 248, 240, 255),  # Cream white
    'dark': (60, 40, 20, 255),      # Dark brown
    'teal': (0, 180, 170, 255),     # Teal
    'pink': (255, 150, 180, 255),   # Pink
    'green': (120, 200, 120, 255),  # Green
    'brown': (160, 100, 60, 255),   # Brown
    'white': (255, 255, 255, 255),  # White
    'black': (30, 30, 30, 255),     # Black
    'purple': (160, 120, 200, 255), # Purple
    'yellow': (255, 220, 100, 255), # Yellow
    'red': (230, 100, 100, 255),    # Red
    'light_orange': (255, 180, 130, 255),
}

SCALE = 4
GRID_SIZE = 32
OUTPUT_SIZE = GRID_SIZE * SCALE

def create_canvas():
    return Image.new('RGBA', (OUTPUT_SIZE, OUTPUT_SIZE), COLORS['bg'])

def draw_pixel(img, x, y, color):
    draw = ImageDraw.Draw(img)
    draw.rectangle(
        [x * SCALE, y * SCALE, (x + 1) * SCALE - 1, (y + 1) * SCALE - 1],
        fill=color
    )

def fill_rect(img, x, y, w, h, color):
    for dy in range(h):
        for dx in range(w):
            draw_pixel(img, x + dx, y + dy, color)

def draw_circle(img, cx, cy, r, color):
    for y in range(max(0, cy-r), min(GRID_SIZE, cy+r+1)):
        for x in range(max(0, cx-r), min(GRID_SIZE, cx+r+1)):
            if (x-cx)**2 + (y-cy)**2 <= r**2:
                draw_pixel(img, x, y, color)

def draw_ring(img, cx, cy, r, thickness, color):
    for y in range(max(0, cy-r-thickness), min(GRID_SIZE, cy+r+thickness+1)):
        for x in range(max(0, cx-r-thickness), min(GRID_SIZE, cx+r+thickness+1)):
            d2 = (x-cx)**2 + (y-cy)**2
            if r**2 <= d2 <= (r+thickness)**2:
                draw_pixel(img, x, y, color)

ICONS = {
    'me': lambda img: draw_me(img),
    'axel': lambda img: draw_axel(img),
    'atticus': lambda img: draw_atticus(img),
    'koi-pond': lambda img: draw_koi_pond(img),
    'cards-of-answers': lambda img: draw_cards_of_answers(img),
    'axiom-thoughts': lambda img: draw_axiom_thoughts(img),
    'agent-terrarium': lambda img: draw_agent_terrarium(img),
    'movie-oracle': lambda img: draw_movie_oracle(img),
    'between-floors': lambda img: draw_between_floors(img),
    'littlebook': lambda img: draw_littlebook(img),
    'postcards-from-mars': lambda img: draw_postcards_from_mars(img),
    'artuzzle': lambda img: draw_artuzzle(img),
    'pixel-dailies': lambda img: draw_pixel_dailies(img),
    'lobster': lambda img: draw_lobster(img),
    'json-prompts': lambda img: draw_json_prompts(img),
    'about-notebook': lambda img: draw_about_notebook(img),
}

def draw_me(img):
    """Me - stylized head with brain waves"""
    # Orange rounded square background
    for y in range(2, 30):
        for x in range(2, 30):
            draw_pixel(img, x, y, COLORS['orange'])
    
    # White face circle
    draw_circle(img, 16, 17, 8, COLORS['white'])
    
    # Dark outline (manual for better control)
    for angle in range(0, 360, 10):
        import math
        rad = math.radians(angle)
        x = int(16 + 8.5 * math.cos(rad))
        y = int(17 + 8.5 * math.sin(rad))
        if 0 <= x < GRID_SIZE and 0 <= y < GRID_SIZE:
            draw_pixel(img, x, y, COLORS['dark'])
    
    # Teal eye (left side)
    draw_pixel(img, 13, 16, COLORS['teal'])
    draw_pixel(img, 14, 16, COLORS['teal'])
    
    # Brain waves / hair on top
    waves = [(12, 10), (13, 9), (14, 10), (15, 9), (16, 10), (17, 9), (18, 10), (19, 9), (20, 10)]
    for x, y in waves:
        draw_pixel(img, x, y, COLORS['brown'])
    
    # Small smile
    draw_pixel(img, 15, 20, COLORS['dark'])
    draw_pixel(img, 16, 21, COLORS['dark'])
    draw_pixel(img, 17, 20, COLORS['dark'])

def draw_axel(img):
    """Axel - cute tiger face"""
    # Orange background
    for y in range(2, 30):
        for x in range(2, 30):
            draw_pixel(img, x, y, COLORS['orange'])
    
    # Tiger ears (triangles)
    draw_pixel(img, 9, 7, COLORS['orange'])
    draw_pixel(img, 10, 6, COLORS['orange'])
    draw_pixel(img, 11, 7, COLORS['orange'])
    draw_pixel(img, 21, 7, COLORS['orange'])
    draw_pixel(img, 22, 6, COLORS['orange'])
    draw_pixel(img, 23, 7, COLORS['orange'])
    
    # Inner ears
    draw_pixel(img, 10, 7, COLORS['cream'])
    draw_pixel(img, 22, 7, COLORS['cream'])
    
    # Face (cream circle)
    draw_circle(img, 16, 16, 7, COLORS['cream'])
    
    # Tiger stripes (black)
    stripes = [(8, 8), (9, 8), (10, 8), (22, 8), (23, 8), (24, 8),
               (8, 9), (24, 9), (8, 10), (24, 10)]
    for x, y in stripes:
        draw_pixel(img, x, y, COLORS['black'])
    
    # Eyes (black dots)
    draw_pixel(img, 13, 15, COLORS['black'])
    draw_pixel(img, 19, 15, COLORS['black'])
    
    # Pink nose
    draw_pixel(img, 16, 17, COLORS['pink'])
    
    # Cute mouth
    draw_pixel(img, 15, 19, COLORS['dark'])
    draw_pixel(img, 16, 20, COLORS['dark'])
    draw_pixel(img, 17, 19, COLORS['dark'])
    
    # Whiskers
    draw_pixel(img, 11, 17, COLORS['dark'])
    draw_pixel(img, 21, 17, COLORS['dark'])

def draw_atticus(img):
    """Atticus - wise owl"""
    # Dark brown background
    for y in range(2, 30):
        for x in range(2, 30):
            draw_pixel(img, x, y, COLORS['dark'])
    
    # Owl body (cream)
    draw_circle(img, 16, 17, 8, COLORS['cream'])
    
    # Large orange eyes
    draw_circle(img, 13, 14, 3, COLORS['orange'])
    draw_circle(img, 19, 14, 3, COLORS['orange'])
    
    # Black pupils
    draw_pixel(img, 13, 14, COLORS['black'])
    draw_pixel(img, 19, 14, COLORS['black'])
    
    # Beak (orange triangle)
    draw_pixel(img, 16, 17, COLORS['orange'])
    draw_pixel(img, 15, 18, COLORS['orange'])
    draw_pixel(img, 16, 18, COLORS['orange'])
    draw_pixel(img, 17, 18, COLORS['orange'])
    
    # Ear tufts
    draw_pixel(img, 11, 9, COLORS['cream'])
    draw_pixel(img, 12, 8, COLORS['cream'])
    draw_pixel(img, 20, 9, COLORS['cream'])
    draw_pixel(img, 21, 8, COLORS['cream'])

def draw_koi_pond(img):
    """Koi pond - top-down view"""
    # Teal water circle
    draw_circle(img, 16, 16, 12, COLORS['teal'])
    
    # Water highlight
    draw_circle(img, 11, 11, 3, (100, 220, 210, 255))
    
    # Koi fish (orange and white)
    # Body
    draw_circle(img, 16, 16, 4, COLORS['orange'])
    
    # White patches
    draw_pixel(img, 15, 15, COLORS['white'])
    draw_pixel(img, 14, 16, COLORS['white'])
    
    # Tail
    draw_pixel(img, 12, 16, COLORS['orange'])
    draw_pixel(img, 11, 15, COLORS['orange'])
    draw_pixel(img, 11, 17, COLORS['orange'])
    
    # Fins
    draw_pixel(img, 17, 14, COLORS['light_orange'])
    draw_pixel(img, 18, 15, COLORS['light_orange'])

def draw_cards_of_answers(img):
    """Mystical cards fanned out"""
    # Purple background
    for y in range(2, 30):
        for x in range(2, 30):
            draw_pixel(img, x, y, COLORS['purple'])
    
    # Card 1 (back, diagonal)
    for i in range(12):
        for j in range(8):
            x = 6 + j + i//3
            y = 8 + i
            draw_pixel(img, x, y, COLORS['cream'])
    # Pattern on back
    for i in range(3, 10):
        for j in range(2, 6):
            if (i + j) % 2 == 0:
                x = 6 + j + i//3
                y = 8 + i
                draw_pixel(img, x, y, COLORS['orange'])
    
    # Card 2 (middle, star)
    for y in range(10, 22):
        for x in range(12, 20):
            draw_pixel(img, x, y, COLORS['cream'])
    
    # Star
    star = [(16, 13), (15, 14), (16, 14), (17, 14), (16, 15),
            (14, 15), (18, 15), (16, 16)]
    for x, y in star:
        draw_pixel(img, x, y, COLORS['orange'])
    draw_pixel(img, 16, 14, COLORS['yellow'])
    
    # Card 3 (front, moon)
    for y in range(12, 24):
        for x in range(18, 26):
            draw_pixel(img, x, y, COLORS['cream'])
    
    # Crescent moon
    draw_circle(img, 22, 18, 3, COLORS['teal'])
    draw_circle(img, 23, 18, 2, COLORS['cream'])

def draw_axiom_thoughts(img):
    """Brain with floating thoughts"""
    # Pink background
    for y in range(2, 30):
        for x in range(2, 30):
            draw_pixel(img, x, y, COLORS['pink'])
    
    # Brain (cream)
    draw_circle(img, 16, 18, 7, COLORS['cream'])
    
    # Brain folds (pink lines)
    folds = [(13, 15), (14, 16), (18, 16), (19, 15),
             (14, 19), (15, 20), (17, 20), (18, 19)]
    for x, y in folds:
        draw_pixel(img, x, y, COLORS['pink'])
    
    # Thought bubbles
    # Small bubble
    draw_pixel(img, 22, 10, COLORS['white'])
    draw_pixel(img, 23, 10, COLORS['white'])
    draw_pixel(img, 22, 11, COLORS['white'])
    draw_pixel(img, 23, 11, COLORS['white'])
    
    # Medium bubble
    fill_rect(img, 24, 6, 4, 4, COLORS['white'])
    
    # Large bubble with sparkle
    draw_circle(img, 26, 7, 2, COLORS['white'])
    draw_pixel(img, 26, 7, COLORS['teal'])

def draw_agent_terrarium(img):
    """Glass jar with creature"""
    # Green background
    for y in range(2, 30):
        for x in range(2, 30):
            draw_pixel(img, x, y, COLORS['green'])
    
    # Glass jar outline
    for y in range(6, 26):
        draw_pixel(img, 10, y, COLORS['cream'])
        draw_pixel(img, 22, y, COLORS['cream'])
    for x in range(10, 23):
        draw_pixel(img, x, 6, COLORS['cream'])
        draw_pixel(img, x, 25, COLORS['cream'])
    
    # Jar lid
    fill_rect(img, 9, 4, 14, 2, COLORS['brown'])
    
    # Tiny creature (orange blob)
    draw_pixel(img, 14, 18, COLORS['orange'])
    draw_pixel(img, 15, 18, COLORS['orange'])
    draw_pixel(img, 14, 19, COLORS['orange'])
    draw_pixel(img, 15, 19, COLORS['orange'])
    draw_pixel(img, 14, 18, COLORS['black'])  # Eye
    
    # Plants
    # Left plant
    draw_pixel(img, 12, 22, COLORS['dark'])
    draw_pixel(img, 12, 21, COLORS['green'])
    draw_pixel(img, 11, 20, COLORS['green'])
    draw_pixel(img, 13, 20, COLORS['green'])
    
    # Right plant
    draw_pixel(img, 20, 22, COLORS['dark'])
    draw_pixel(img, 20, 21, COLORS['green'])
    draw_pixel(img, 19, 20, COLORS['green'])
    draw_pixel(img, 21, 20, COLORS['green'])

def draw_movie_oracle(img):
    """Film reel with eye"""
    # Dark background
    for y in range(2, 30):
        for x in range(2, 30):
            draw_pixel(img, x, y, COLORS['dark'])
    
    # Film reel (cream circle)
    draw_circle(img, 16, 16, 10, COLORS['cream'])
    
    # Reel holes
    holes = [(12, 12), (20, 12), (12, 20), (20, 20)]
    for hx, hy in holes:
        draw_pixel(img, hx, hy, COLORS['dark'])
        draw_pixel(img, hx+1, hy, COLORS['dark'])
        draw_pixel(img, hx, hy+1, COLORS['dark'])
        draw_pixel(img, hx+1, hy+1, COLORS['dark'])
    
    # Central eye
    draw_circle(img, 16, 16, 4, COLORS['white'])
    draw_circle(img, 16, 16, 2, COLORS['orange'])
    draw_pixel(img, 16, 16, COLORS['black'])

def draw_between_floors(img):
    """Elevator between floors"""
    # Orange background
    for y in range(2, 30):
        for x in range(2, 30):
            draw_pixel(img, x, y, COLORS['orange'])
    
    # Floor lines
    for x in range(4, 28):
        draw_pixel(img, x, 10, COLORS['cream'])
        draw_pixel(img, x, 20, COLORS['cream'])
    
    # Stairs
    for i in range(8):
        x = 8 + i
        y = 18 - i
        draw_pixel(img, x, y, COLORS['cream'])
        draw_pixel(img, x+1, y, COLORS['cream'])
    
    # Little person
    draw_pixel(img, 12, 15, COLORS['dark'])
    draw_pixel(img, 12, 14, COLORS['dark'])
    
    # Up arrow
    draw_pixel(img, 22, 8, COLORS['teal'])
    draw_pixel(img, 21, 9, COLORS['teal'])
    draw_pixel(img, 22, 9, COLORS['teal'])
    draw_pixel(img, 23, 9, COLORS['teal'])
    draw_pixel(img, 22, 10, COLORS['teal'])

def draw_littlebook(img):
    """Small book"""
    # Cream background
    for y in range(2, 30):
        for x in range(2, 30):
            draw_pixel(img, x, y, COLORS['cream'])
    
    # Book cover
    fill_rect(img, 8, 8, 12, 16, COLORS['orange'])
    
    # Pages (white strip)
    for y in range(9, 23):
        draw_pixel(img, 19, y, COLORS['white'])
    
    # Spine
    for y in range(8, 24):
        draw_pixel(img, 8, y, COLORS['dark'])
    
    # Bookmark
    draw_pixel(img, 16, 10, COLORS['teal'])
    draw_pixel(img, 16, 11, COLORS['teal'])
    draw_pixel(img, 16, 12, COLORS['teal'])
    draw_pixel(img, 15, 13, COLORS['teal'])
    draw_pixel(img, 17, 13, COLORS['teal'])

def draw_postcards_from_mars(img):
    """Postcard from Mars"""
    # Teal background
    for y in range(2, 30):
        for x in range(2, 30):
            draw_pixel(img, x, y, COLORS['teal'])
    
    # Postcard
    fill_rect(img, 6, 6, 20, 20, COLORS['cream'])
    
    # Mars (red circle)
    draw_circle(img, 16, 16, 5, COLORS['orange'])
    
    # Surface details
    draw_pixel(img, 14, 14, COLORS['brown'])
    draw_pixel(img, 17, 17, COLORS['brown'])
    draw_pixel(img, 15, 18, COLORS['brown'])
    
    # Stamp
    fill_rect(img, 22, 7, 4, 4, COLORS['purple'])

def draw_artuzzle(img):
    """Art puzzle pieces"""
    # Purple background
    for y in range(2, 30):
        for x in range(2, 30):
            draw_pixel(img, x, y, COLORS['purple'])
    
    # Puzzle piece 1 (orange with tab)
    fill_rect(img, 8, 8, 8, 8, COLORS['orange'])
    draw_pixel(img, 12, 7, COLORS['orange'])
    draw_pixel(img, 13, 7, COLORS['orange'])
    
    # Puzzle piece 2 (cream with slot and tab)
    fill_rect(img, 16, 8, 8, 8, COLORS['cream'])
    draw_pixel(img, 16, 12, COLORS['purple'])
    draw_pixel(img, 16, 13, COLORS['purple'])
    draw_pixel(img, 24, 10, COLORS['cream'])
    draw_pixel(img, 24, 11, COLORS['cream'])
    
    # Puzzle piece 3 (teal with slot)
    fill_rect(img, 8, 16, 8, 8, COLORS['teal'])
    draw_pixel(img, 12, 16, COLORS['purple'])
    draw_pixel(img, 13, 16, COLORS['purple'])

def draw_pixel_dailies(img):
    """Calendar with pixel art"""
    # Orange background
    for y in range(2, 30):
        for x in range(2, 30):
            draw_pixel(img, x, y, COLORS['orange'])
    
    # Calendar page
    fill_rect(img, 6, 6, 20, 20, COLORS['cream'])
    
    # Header
    fill_rect(img, 6, 6, 20, 3, COLORS['dark'])
    
    # Rings
    draw_pixel(img, 10, 4, COLORS['dark'])
    draw_pixel(img, 10, 5, COLORS['dark'])
    draw_pixel(img, 22, 4, COLORS['dark'])
    draw_pixel(img, 22, 5, COLORS['dark'])
    
    # Pixel heart
    draw_pixel(img, 14, 14, COLORS['pink'])
    draw_pixel(img, 15, 13, COLORS['pink'])
    draw_pixel(img, 16, 14, COLORS['pink'])
    draw_pixel(img, 15, 15, COLORS['pink'])

def draw_lobster(img):
    """Lobster"""
    # Dark background
    for y in range(2, 30):
        for x in range(2, 30):
            draw_pixel(img, x, y, COLORS['dark'])
    
    # Body
    draw_circle(img, 16, 16, 5, COLORS['orange'])
    
    # Claws
    draw_pixel(img, 10, 14, COLORS['orange'])
    draw_pixel(img, 9, 13, COLORS['orange'])
    draw_pixel(img, 22, 14, COLORS['orange'])
    draw_pixel(img, 23, 13, COLORS['orange'])
    
    # Eyes
    draw_pixel(img, 14, 14, COLORS['white'])
    draw_pixel(img, 18, 14, COLORS['white'])
    draw_pixel(img, 14, 14, COLORS['black'])
    draw_pixel(img, 18, 14, COLORS['black'])
    
    # Tail
    draw_pixel(img, 16, 21, COLORS['orange'])
    draw_pixel(img, 16, 23, COLORS['orange'])
    draw_pixel(img, 15, 24, COLORS['orange'])
    draw_pixel(img, 17, 24, COLORS['orange'])

def draw_json_prompts(img):
    """JSON with spark"""
    # Cream background
    for y in range(2, 30):
        for x in range(2, 30):
            draw_pixel(img, x, y, COLORS['cream'])
    
    # { bracket left
    left_bracket = [(8, 8), (7, 9), (7, 10), (7, 11), (8, 12), 
                    (7, 13), (7, 14), (7, 15), (8, 16)]
    for x, y in left_bracket:
        draw_pixel(img, x, y, COLORS['dark'])
    
    # } bracket right
    right_bracket = [(24, 8), (25, 9), (25, 10), (25, 11), (24, 12),
                     (25, 13), (25, 14), (25, 15), (24, 16)]
    for x, y in right_bracket:
        draw_pixel(img, x, y, COLORS['dark'])
    
    # Spark/star
    draw_pixel(img, 16, 10, COLORS['orange'])
    draw_pixel(img, 15, 11, COLORS['orange'])
    draw_pixel(img, 16, 11, COLORS['yellow'])
    draw_pixel(img, 17, 11, COLORS['orange'])
    draw_pixel(img, 16, 12, COLORS['orange'])
    
    # Code lines
    for x in range(11, 21):
        draw_pixel(img, x, 14, COLORS['teal'])
    for x in range(11, 18):
        draw_pixel(img, x, 16, COLORS['pink'])

def draw_about_notebook(img):
    """Notebook with pen"""
    # Teal background
    for y in range(2, 30):
        for x in range(2, 30):
            draw_pixel(img, x, y, COLORS['teal'])
    
    # Notebook
    fill_rect(img, 8, 8, 10, 16, COLORS['cream'])
    
    # Spiral
    for y in range(9, 23, 2):
        draw_pixel(img, 8, y, COLORS['dark'])
    
    # Lines
    for y in range(11, 23, 3):
        for x in range(10, 17):
            draw_pixel(img, x, y, COLORS['orange'])
    
    # Pen
    for y in range(6, 14):
        draw_pixel(img, 20, y, COLORS['orange'])
    fill_rect(img, 19, 6, 3, 1, COLORS['dark'])

def generate_all_icons():
    output_dir = os.path.join(os.path.dirname(__file__), '..', 'images', 'icons-pixel-v2')
    os.makedirs(output_dir, exist_ok=True)
    
    for name, draw_func in ICONS.items():
        img = create_canvas()
        draw_func(img)
        
        output_path = os.path.join(output_dir, f'{name}.png')
        img.save(output_path, 'PNG')
        print(f'Generated: {output_path}')
    
    print(f'\nAll {len(ICONS)} icons generated in {output_dir}')

if __name__ == '__main__':
    generate_all_icons()