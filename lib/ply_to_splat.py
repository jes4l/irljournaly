import sys
import numpy as np
from plyfile import PlyData

def process_ply_to_splat(ply_file_path, splat_file_path):
    plydata = PlyData.read(ply_file_path)
    vert = plydata['vertex']
    
    x = vert['x']
    y = vert['y']
    z = vert['z']
    
    sx = np.exp(vert['scale_0'])
    sy = np.exp(vert['scale_1'])
    sz = np.exp(vert['scale_2'])
    
    SH_C0 = 0.28209479177387814
    r = np.clip((vert['f_dc_0'] * SH_C0) + 0.5, 0.0, 1.0) * 255
    g = np.clip((vert['f_dc_1'] * SH_C0) + 0.5, 0.0, 1.0) * 255
    b = np.clip((vert['f_dc_2'] * SH_C0) + 0.5, 0.0, 1.0) * 255
    
    opacity = (1 / (1 + np.exp(-vert['opacity']))) * 255
    
    rw = vert['rot_0']
    rx = vert['rot_1']
    ry = vert['rot_2']
    rz = vert['rot_3']
    
    lengths = np.sqrt(rw**2 + rx**2 + ry**2 + rz**2)
    rw, rx, ry, rz = rw/lengths, rx/lengths, ry/lengths, rz/lengths
    
    rot_w = np.clip((rw * 128) + 128, 0, 255)
    rot_x = np.clip((rx * 128) + 128, 0, 255)
    rot_y = np.clip((ry * 128) + 128, 0, 255)
    rot_z = np.clip((rz * 128) + 128, 0, 255)
    
    out = np.zeros(len(x), dtype=[
        ('x', 'f4'), ('y', 'f4'), ('z', 'f4'),
        ('sx', 'f4'), ('sy', 'f4'), ('sz', 'f4'),
        ('r', 'u1'), ('g', 'u1'), ('b', 'u1'), ('a', 'u1'),
        ('rw', 'u1'), ('rx', 'u1'), ('ry', 'u1'), ('rz', 'u1')
    ])
    
    out['x'] = x
    out['y'] = y
    out['z'] = z
    out['sx'] = sx
    out['sy'] = sy
    out['sz'] = sz
    out['r'] = r.astype(np.uint8)
    out['g'] = g.astype(np.uint8)
    out['b'] = b.astype(np.uint8)
    out['a'] = opacity.astype(np.uint8)
    out['rw'] = rot_w.astype(np.uint8)
    out['rx'] = rot_x.astype(np.uint8)
    out['ry'] = rot_y.astype(np.uint8)
    out['rz'] = rot_z.astype(np.uint8)
    
    with open(splat_file_path, 'wb') as f:
        f.write(out.tobytes())

if __name__ == "__main__":
    process_ply_to_splat(sys.argv[1], sys.argv[2])