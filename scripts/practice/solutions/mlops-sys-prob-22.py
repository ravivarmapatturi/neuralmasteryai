import math

def ab_test_z_score(conversions_a, visitors_a, conversions_b, visitors_b):
    p_a = conversions_a / visitors_a
    p_b = conversions_b / visitors_b
    p_pool = (conversions_a + conversions_b) / (visitors_a + visitors_b)
    se = math.sqrt(p_pool * (1 - p_pool) * (1 / visitors_a + 1 / visitors_b))
    return 0.0 if se == 0 else (p_b - p_a) / se
