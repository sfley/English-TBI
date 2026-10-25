"""Image sizing reused from generer_les_cartes_et_les_sons.py in english.zip."""

def calc_size_contain(src_w, src_h, dst_w, dst_h):
    ratio_src = src_w / src_h
    ratio_dst = dst_w / dst_h
    if ratio_src > ratio_dst:
        new_w = dst_w
        new_h = int(round(new_w / ratio_src))
    else:
        new_h = dst_h
        new_w = int(round(new_h * ratio_src))
    return max(1, new_w), max(1, new_h)
