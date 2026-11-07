import math

def sinusoidal_pe(position: int, dim_index: int, d_model: int) -> float:
    # Dimensions 2i and 2i+1 share one frequency; even uses sin, odd uses cos.
    angle = position / (10000 ** (2 * (dim_index // 2) / d_model))
    return math.sin(angle) if dim_index % 2 == 0 else math.cos(angle)
