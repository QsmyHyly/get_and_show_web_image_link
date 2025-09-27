import pygame
import os

# 确保images目录存在
os.makedirs('images', exist_ok=True)

# 定义滑翔机图案 (康威生命游戏)
glider_pattern = [
    (0, 1, 0),
    (0, 0, 1),
    (1, 1, 1)
]

def create_icon(size):
    # 创建黑色背景
    surface = pygame.Surface((size, size))
    surface.fill((0, 0, 0))
    
    # 计算单元格大小和偏移量
    cell_size = size // 8
    offset_x = (size - len(glider_pattern[0]) * cell_size) // 2
    offset_y = (size - len(glider_pattern) * cell_size) // 2
    
    # 绘制滑翔机
    for y, row in enumerate(glider_pattern):
        for x, cell in enumerate(row):
            if cell:
                rect = pygame.Rect(
                    offset_x + x * cell_size,
                    offset_y + y * cell_size,
                    cell_size, cell_size
                )
                pygame.draw.rect(surface, (255, 255, 255), rect)
    
    return surface

# 初始化Pygame
pygame.init()

# 生成三种尺寸的图标
sizes = [(16, 'icon16.png'), (48, 'icon48.png'), (128, 'icon128.png')]
for size, filename in sizes:
    icon = create_icon(size)
    pygame.image.save(icon, f'images/{filename}')

print("图标已生成到images目录")