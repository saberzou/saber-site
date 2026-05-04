#!/usr/bin/env python3
"""
Pixel Icon Generator for SaberOS
Generates pixel art icons at 128x128 with proper transparency
"""

from PIL import Image, ImageDraw
import os

# Palette
COLORS = {
    'bg': (255, 248, 240, 0),      # Transparent background
    'orange': (255, 140, 66, 255),  # Main orange
    'cream': (255, 248, 240, 255),  # Cream
    'dark': (45, 27, 0, 255),       # Dark brown
    'teal': (0, 180, 170, 255),     # Teal accent
    'pink': (255, 150, 180, 255),   # Pink accent
    'green': (100, 200, 100, 255),  # Green
    'brown': (139, 90, 43, 255),    # Brown
    'white': (255, 255, 255, 255),  # White
    'black': (20, 20, 20, 255),     # Black
    'purple': (147, 112, 219, 255), # Purple
    'yellow': (255, 220, 100, 255), # Yellow
}

# 32x32 grid scaled to 128x128 (4x scale)
SCALE = 4
GRID_SIZE = 32
OUTPUT_SIZE = GRID_SIZE * SCALE

def create_canvas():
    """Create transparent canvas"""
    return Image.new('RGBA', (OUTPUT_SIZE, OUTPUT_SIZE), COLORS['bg'])

def draw_pixel(img, x, y, color):
    """Draw a single pixel at grid coordinates"""
    draw = ImageDraw.Draw(img)
    draw.rectangle(
        [x * SCALE, y * SCALE, (x + 1) * SCALE - 1, (y + 1) * SCALE - 1],
        fill=color
    )

def draw_rect(img, x, y, w, h, color):
    """Draw a rectangle in grid coordinates"""
    draw = ImageDraw.Draw(img)
    draw.rectangle(
        [x * SCALE, y * SCALE, (x + w) * SCALE - 1, (y + h) * SCALE - 1],
        fill=color
    )

def draw_circle(img, cx, cy, r, color):
    """Draw a circle in grid coordinates"""
    draw = ImageDraw.Draw(img)
    draw.ellipse(
        [(cx - r) * SCALE, (cy - r) * SCALE, 
         (cx + r) * SCALE - 1, (cy + r) * SCALE - 1],
        fill=color
    )

def draw_line(img, x1, y1, x2, y2, color):
    """Draw a line in grid coordinates"""
    draw = ImageDraw.Draw(img)
    draw.line(
        [(x1 + 0.5) * SCALE, (y1 + 0.5) * SCALE,
         (x2 + 0.5) * SCALE, (y2 + 0.5) * SCALE],
        fill=color, width=SCALE
    )

# Icon definitions - 32x32 grid
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
    """Me icon - stylized head with brain/hair"""
    # Orange rounded square background
    for y in range(2, 30):
        for x in range(2, 30):
            if (x >= 4 and x <= 27) or (y >= 4 and y <= 27):
                draw_pixel(img, x, y, COLORS['orange'])
    
    # White head circle
    for y in range(8, 26):
        for x in range(8, 24):
            if (x-16)**2 + (y-17)**2 <= 64:
                draw_pixel(img, x, y, COLORS['white'])
    
    # Dark outline
    for y in range(8, 26):
        for x in range(8, 24):
            if 56 <= (x-16)**2 + (y-17)**2 <= 64:
                draw_pixel(img, x, y, COLORS['dark'])
    
    # Teal eye
    draw_pixel(img, 11, 15, COLORS['teal'])
    draw_pixel(img, 12, 15, COLORS['teal'])
    
    # Brain/hair squiggles on top
    draw_pixel(img, 13, 10, COLORS['brown'])
    draw_pixel(img, 14, 9, COLORS['brown'])
    draw_pixel(img, 15, 10, COLORS['brown'])
    draw_pixel(img, 16, 9, COLORS['brown'])
    draw_pixel(img, 17, 10, COLORS['brown'])
    draw_pixel(img, 18, 9, COLORS['brown'])
    draw_pixel(img, 19, 10, COLORS['brown'])

def draw_axel(img):
    """Axel icon - tiger face"""
    # Orange rounded square
    for y in range(2, 30):
        for x in range(2, 30):
            draw_pixel(img, x, y, COLORS['orange'])
    
    # Tiger stripes (black)
    for i in range(3):
        draw_pixel(img, 6 + i*2, 6, COLORS['black'])
        draw_pixel(img, 24 + i*2, 6, COLORS['black'])
    
    # Face (lighter orange/cream)
    for y in range(10, 24):
        for x in range(10, 22):
            if (x-16)**2 + (y-17)**2 <= 36:
                draw_pixel(img, x, y, COLORS['cream'])
    
    # Ears
    draw_pixel(img, 10, 8, COLORS['orange'])
    draw_pixel(img, 11, 7, COLORS['orange'])
    draw_pixel(img, 21, 8, COLORS['orange'])
    draw_pixel(img, 20, 7, COLORS['orange'])
    
    # Eyes
    draw_pixel(img, 12, 14, COLORS['black'])
    draw_pixel(img, 20, 14, COLORS['black'])
    
    # Nose
    draw_pixel(img, 16, 18, COLORS['pink'])
    
    # Mouth
    draw_pixel(img, 15, 20, COLORS['dark'])
    draw_pixel(img, 16, 21, COLORS['dark'])
    draw_pixel(img, 17, 20, COLORS['dark'])

def draw_atticus(img):
    """Atticus icon - owl face"""
    # Dark rounded square
    for y in range(2, 30):
        for x in range(2, 30):
            draw_pixel(img, x, y, COLORS['dark'])
    
    # Owl face (cream)
    for y in range(8, 26):
        for x in range(8, 24):
            if (x-16)**2 + (y-17)**2 <= 64:
                draw_pixel(img, x, y, COLORS['cream'])
    
    # Large eyes
    for y in range(11, 17):
        for x in range(10, 15):
            if (x-12.5)**2 + (y-14)**2 <= 6:
                draw_pixel(img, int(x), int(y), COLORS['orange'])
    for y in range(11, 17):
        for x in range(17, 22):
            if (x-19.5)**2 + (y-14)**2 <= 6:
                draw_pixel(img, int(x), int(y), COLORS['orange'])
    
    # Pupils
    draw_pixel(img, 12, 14, COLORS['black'])
    draw_pixel(img, 19, 14, COLORS['black'])
    
    # Beak
    draw_pixel(img, 16, 17, COLORS['orange'])
    draw_pixel(img, 15, 18, COLORS['orange'])
    draw_pixel(img, 16, 18, COLORS['orange'])
    draw_pixel(img, 17, 18, COLORS['orange'])

def draw_koi_pond(img):
    """Koi pond - circular pond with fish"""
    # Water circle
    for y in range(4, 28):
        for x in range(4, 28):
            if (x-16)**2 + (y-16)**2 <= 130:
                draw_pixel(img, x, y, COLORS['teal'])
    
    # Water highlight
    for y in range(6, 12):
        for x in range(8, 14):
            if (x-11)**2 + (y-9)**2 <= 8:
                draw_pixel(img, x, y, (100, 220, 210, 255))
    
    # Koi fish (orange and white)
    # Body
    for y in range(14, 20):
        for x in range(10, 22):
            if 8 <= (x-16)**2 + (y-17)**2 <= 20:
                draw_pixel(img, x, y, COLORS['orange'])
    
    # White patches
    draw_pixel(img, 14, 16, COLORS['white'])
    draw_pixel(img, 15, 17, COLORS['white'])
    draw_pixel(img, 14, 17, COLORS['white'])
    
    # Tail
    draw_pixel(img, 10, 16, COLORS['orange'])
    draw_pixel(img, 9, 15, COLORS['orange'])
    draw_pixel(img, 9, 17, COLORS['orange'])

def draw_cards_of_answers(img):
    """Mystical playing cards"""
    # Purple background
    for y in range(2, 30):
        for x in range(2, 30):
            draw_pixel(img, x, y, COLORS['purple'])
    
    # Card 1 (back)
    for y in range(8, 22):
        for x in range(6, 14):
            draw_pixel(img, x, y, COLORS['cream'])
    # Card pattern
    for y in range(10, 20):
        for x in range(7, 13):
            if (x + y) % 2 == 0:
                draw_pixel(img, x, y, COLORS['orange'])
    
    # Card 2 (front, slightly offset)
    for y in range(10, 24):
        for x in range(12, 20):
            draw_pixel(img, x, y, COLORS['cream'])
    
    # Star on front card
    draw_pixel(img, 16, 14, COLORS['orange'])
    draw_pixel(img, 15, 15, COLORS['orange'])
    draw_pixel(img, 16, 15, COLORS['yellow'])
    draw_pixel(img, 17, 15, COLORS['orange'])
    draw_pixel(img, 16, 16, COLORS['orange'])
    
    # Card 3 (front, more offset)
    for y in range(12, 26):
        for x in range(18, 26):
            draw_pixel(img, x, y, COLORS['cream'])
    
    # Moon on third card
    draw_pixel(img, 22, 17, COLORS['teal'])
    draw_pixel(img, 21, 18, COLORS['teal'])
    draw_pixel(img, 22, 18, COLORS['teal'])

def draw_axiom_thoughts(img):
    """Brain with thought bubbles"""
    # Pink background
    for y in range(2, 30):
        for x in range(2, 30):
            draw_pixel(img, x, y, COLORS['pink'])
    
    # Brain
    for y in range(12, 24):
        for x in range(10, 22):
            if (x-16)**2 + (y-18)**2 <= 25:
                draw_pixel(img, x, y, COLORS['cream'])
    
    # Brain folds
    draw_pixel(img, 13, 16, COLORS['pink'])
    draw_pixel(img, 14, 17, COLORS['pink'])
    draw_pixel(img, 18, 17, COLORS['pink'])
    draw_pixel(img, 19, 16, COLORS['pink'])
    draw_pixel(img, 15, 19, COLORS['pink'])
    draw_pixel(img, 17, 19, COLORS['pink'])
    
    # Thought bubbles
    # Small bubble
    draw_pixel(img, 20, 10, COLORS['white'])
    draw_pixel(img, 21, 10, COLORS['white'])
    draw_pixel(img, 20, 11, COLORS['white'])
    draw_pixel(img, 21, 11, COLORS['white'])
    
    # Medium bubble
    for y in range(6, 10):
        for x in range(22, 26):
            draw_pixel(img, x, y, COLORS['white'])
    
    # Large bubble with sparkle
    for y in range(4, 9):
        for x in range(24, 28):
            if (x-26)**2 + (y-6.5)**2 <= 4:
                draw_pixel(img, x, y, COLORS['white'])
    draw_pixel(img, 26, 6, COLORS['teal'])

def draw_agent_terrarium(img):
    """Glass jar with creature"""
    # Green background
    for y in range(2, 30):
        for x in range(2, 30):
            draw_pixel(img, x, y, COLORS['green'])
    
    # Glass jar outline
    for y in range(6, 26):
        for x in range(10, 22):
            if x == 10 or x == 21 or y == 6 or y == 25:
                draw_pixel(img, x, y, COLORS['cream'])
    
    # Jar lid
    for x in range(9, 23):
        draw_pixel(img, x, 5, COLORS['brown'])
        draw_pixel(img, x, 4, COLORS['brown'])
    
    # Tiny creature inside
    draw_pixel(img, 14, 18, COLORS['orange'])
    draw_pixel(img, 15, 18, COLORS['orange'])
    draw_pixel(img, 14, 19, COLORS['orange'])
    draw_pixel(img, 15, 19, COLORS['orange'])
    
    # Creature eye
    draw_pixel(img, 14, 18, COLORS['black'])
    
    # Small plants
    draw_pixel(img, 12, 22, COLORS['dark'])
    draw_pixel(img, 12, 21, COLORS['green'])
    draw_pixel(img, 11, 20, COLORS['green'])
    draw_pixel(img, 13, 20, COLORS['green'])
    
    draw_pixel(img, 18, 22, COLORS['dark'])
    draw_pixel(img, 18, 21, COLORS['green'])
    draw_pixel(img, 17, 20, COLORS['green'])
    draw_pixel(img, 19, 20, COLORS['green'])

def draw_movie_oracle(img):
    """Film reel with eye"""
    # Dark background
    for y in range(2, 30):
        for x in range(2, 30):
            draw_pixel(img, x, y, COLORS['dark'])
    
    # Film reel circle
    for y in range(6, 26):
        for x in range(6, 26):
            if (x-16)**2 + (y-16)**2 <= 90:
                draw_pixel(img, x, y, COLORS['cream'])
    
    # Reel holes
    for angle in [0, 90, 180, 270]:
        cx = 16 + int(5 * (1 if angle == 0 else -1 if angle == 180 else 0))
        cy = 16 + int(5 * (1 if angle == 90 else -1 if angle == 270 else 0))
        draw_pixel(img, cx, cy, COLORS['dark'])
        draw_pixel(img, cx+1, cy, COLORS['dark'])
        draw_pixel(img, cx, cy+1, COLORS['dark'])
        draw_pixel(img, cx+1, cy+1, COLORS['dark'])
    
    # Central eye
    for y in range(12, 20):
        for x in range(12, 20):
            if (x-16)**2 + (y-16)**2 <= 12:
                draw_pixel(img, x, y, COLORS['white'])
    
    # Iris
    draw_pixel(img, 16, 16, COLORS['orange'])
    draw_pixel(img, 15, 16, COLORS['orange'])
    draw_pixel(img, 16, 15, COLORS['orange'])
    draw_pixel(img, 17, 16, COLORS['orange'])
    draw_pixel(img, 16, 17, COLORS['orange'])
    
    # Pupil
    draw_pixel(img, 16, 16, COLORS['black'])

def draw_between_floors(img):
    """Elevator/stairs between floors"""
    # Orange background
    for y in range(2, 30):
        for x in range(2, 30):
            draw_pixel(img, x, y, COLORS['orange'])
    
    # Floor lines
    for x in range(4, 28):
        draw_pixel(img, x, 10, COLORS['cream'])
        draw_pixel(img, x, 20, COLORS['cream'])
    
    # Stairs connecting floors
    for i in range(8):
        x = 8 + i
        y = 18 - i
        draw_pixel(img, x, y, COLORS['cream'])
        draw_pixel(img, x+1, y, COLORS['cream'])
    
    # Little figure on stairs
    draw_pixel(img, 12, 15, COLORS['dark'])
    draw_pixel(img, 12, 14, COLORS['dark'])
    
    # Up arrow
    draw_pixel(img, 22, 8, COLORS['teal'])
    draw_pixel(img, 21, 9, COLORS['teal'])
    draw_pixel(img, 22, 9, COLORS['teal'])
    draw_pixel(img, 23, 9, COLORS['teal'])
    draw_pixel(img, 22, 10, COLORS['teal'])

def draw_littlebook(img):
    """Small book icon"""
    # Cream background
    for y in range(2, 30):
        for x in range(2, 30):
            draw_pixel(img, x, y, COLORS['cream'])
    
    # Book cover
    for y in range(8, 24):
        for x in range(8, 20):
            draw_pixel(img, x, y, COLORS['orange'])
    
    # Pages (white edge)
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
    """Postcard with red planet"""
    # Teal background
    for y in range(2, 30):
        for x in range(2, 30):
            draw_pixel(img, x, y, COLORS['teal'])
    
    # Postcard
    for y in range(6, 26):
        for x in range(6, 26):
            draw_pixel(img, x, y, COLORS['cream'])
    
    # Mars (red circle)
    for y in range(10, 20):
        for x in range(12, 22):
            if (x-17)**2 + (y-15)**2 <= 16:
                draw_pixel(img, x, y, COLORS['orange'])
    
    # Mars surface details
    draw_pixel(img, 15, 13, COLORS['brown'])
    draw_pixel(img, 18, 16, COLORS['brown'])
    draw_pixel(img, 16, 17, COLORS['brown'])
    
    # Stamp corner
    for y in range(7, 11):
        for x in range(22, 25):
            draw_pixel(img, x, y, COLORS['purple'])

def draw_artuzzle(img):
    """Art puzzle pieces"""
    # Purple background
    for y in range(2, 30):
        for x in range(2, 30):
            draw_pixel(img, x, y, COLORS['purple'])
    
    # Puzzle piece 1
    for y in range(8, 16):
        for x in range(8, 16):
            draw_pixel(img, x, y, COLORS['orange'])
    # Tab
    draw_pixel(img, 12, 7, COLORS['orange'])
    draw_pixel(img, 13, 7, COLORS['orange'])
    
    # Puzzle piece 2 (interlocking)
    for y in range(8, 16):
        for x in range(16, 24):
            draw_pixel(img, x, y, COLORS['cream'])
    # Slot
    draw_pixel(img, 16, 12, COLORS['purple'])
    draw_pixel(img, 16, 13, COLORS['purple'])
    # Tab on side
    draw_pixel(img, 24, 10, COLORS['cream'])
    draw_pixel(img, 24, 11, COLORS['cream'])
    
    # Puzzle piece 3
    for y in range(16, 24):
        for x in range(8, 16):
            draw_pixel(img, x, y, COLORS['teal'])
    # Slot on top
    draw_pixel(img, 12, 16, COLORS['purple'])
    draw_pixel(img, 13, 16, COLORS['purple'])

def draw_pixel_dailies(img):
    """Calendar with pixel art"""
    # Orange background
    for y in range(2, 30):
        for x in range(2, 30):
            draw_pixel(img, x, y, COLORS['orange'])
    
    # Calendar page
    for y in range(6, 26):
        for x in range(6, 26):
            draw_pixel(img, x, y, COLORS['cream'])
    
    # Calendar header
    for x in range(6, 26):
        draw_pixel(img, x, 6, COLORS['dark'])
        draw_pixel(img, x, 7, COLORS['dark'])
    
    # Rings
    draw_pixel(img, 10, 4, COLORS['dark'])
    draw_pixel(img, 10, 5, COLORS['dark'])
    draw_pixel(img, 22, 4, COLORS['dark'])
    draw_pixel(img, 22, 5, COLORS['dark'])
    
    # Pixel art on calendar (tiny heart)
    draw_pixel(img, 14, 14, COLORS['pink'])
    draw_pixel(img, 15, 13, COLORS['pink'])
    draw_pixel(img, 16, 14, COLORS['pink'])
    draw_pixel(img, 15, 15, COLORS['pink'])

def draw_lobster(img):
    """Lobster icon"""
    # Dark background
    for y in range(2, 30):
        for x in range(2, 30):
            draw_pixel(img, x, y, COLORS['dark'])
    
    # Lobster body (red/orange)
    for y in range(12, 20):
        for x in range(12, 20):
            if (x-16)**2 + (y-16)**2 <= 12:
                draw_pixel(img, x, y, COLORS['orange'])
    
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
    draw_pixel(img, 16, 20, COLORS['orange'])
    draw_pixel(img, 16, 22, COLORS['orange'])
    draw_pixel(img, 15, 23, COLORS['orange'])
    draw_pixel(img, 17, 23, COLORS['orange'])

def draw_json_prompts(img):
    """JSON brackets with spark"""
    # Cream background
    for y in range(2, 30):
        for x in range(2, 30):
            draw_pixel(img, x, y, COLORS['cream'])
    
    # { bracket
    draw_pixel(img, 8, 8, COLORS['dark'])
    draw_pixel(img, 7, 9, COLORS['dark'])
    draw_pixel(img, 7, 10, COLORS['dark'])
    draw_pixel(img, 7, 11, COLORS['dark'])
    draw_pixel(img, 8, 12, COLORS['dark'])
    draw_pixel(img, 7, 13, COLORS['dark'])
    draw_pixel(img, 7, 14, COLORS['dark'])
    draw_pixel(img, 7, 15, COLORS['dark'])
    draw_pixel(img, 8, 16, COLORS['dark'])
    
    # } bracket
    draw_pixel(img, 24, 8, COLORS['dark'])
    draw_pixel(img, 25, 9, COLORS['dark'])
    draw_pixel(img, 25, 10, COLORS['dark'])
    draw_pixel(img, 25, 11, COLORS['dark'])
    draw_pixel(img, 24, 12, COLORS['dark'])
    draw_pixel(img, 25, 13, COLORS['dark'])
    draw_pixel(img, 25, 14, COLORS['dark'])
    draw_pixel(img, 25, 15, COLORS['dark'])
    draw_pixel(img, 24, 16, COLORS['dark'])
    
    # Spark/star in middle
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
    for y in range(8, 24):
        for x in range(8, 18):
            draw_pixel(img, x, y, COLORS['cream'])
    
    # Spiral binding
    for y in range(9, 23, 2):
        draw_pixel(img, 8, y, COLORS['dark'])
    
    # Lines on paper
    for y in range(11, 23, 3):
        for x in range(10, 17):
            draw_pixel(img, x, y, COLORS['orange'])
    
    # Pen
    for y in range(6, 14):
        draw_pixel(img, 20, y, COLORS['orange'])
    draw_pixel(img, 19, 6, COLORS['dark'])
    draw_pixel(img, 20, 6, COLORS['dark'])
    draw_pixel(img, 21, 6, COLORS['dark'])

def generate_all_icons():
    """Generate all icons"""
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