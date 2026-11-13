"""Voix générées sur place, sans clé ni compte : synthèse vocale libre Piper, voix française « siwis » (medium).
Lit paroles/paroles-renard.csv (colonne « lecture », sinon « texte ») et écrit voix/<id>.mp3 (mono, 24 kb/s).
Usage : python3 tools/voix-piper.py <modele.onnx> [--refaire] [--part i/n]
Reprend là où il s'est arrêté (les fichiers déjà faits sont gardés). Licence de la voix : jeu de données SIWIS, CC BY 4.0."""
import csv, os, subprocess, sys, wave, tempfile
from piper import PiperVoice, SynthesisConfig

model = sys.argv[1]
refaire = '--refaire' in sys.argv
part = next((a.split('=')[1] if '=' in a else sys.argv[sys.argv.index(a) + 1]) for a in sys.argv if a.startswith('--part')) if any(a.startswith('--part') for a in sys.argv) else '0/1'
k, n = map(int, part.split('/'))
os.makedirs('voix', exist_ok=True)
voice = PiperVoice.load(model)
cfg = SynthesisConfig(length_scale=1.12, noise_scale=0.6, noise_w_scale=0.7)  # un peu plus lent : pour des enfants
rows = list(csv.DictReader(open('paroles/paroles-renard.csv', encoding='utf-8-sig'), delimiter=';'))
done = 0
for i, r in enumerate(rows):
    if i % n != k: continue
    out = f"voix/{r['id']}.mp3"
    if os.path.exists(out) and not refaire: continue
    text = (r.get('lecture') or r['texte']).strip()
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as t: tmp = t.name
    with wave.open(tmp, 'wb') as w: voice.synthesize_wav(text, w, syn_config=cfg)
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', tmp, '-af', 'silenceremove=start_periods=1:start_threshold=-50dB,apad=pad_dur=0.12', '-ac', '1', '-ar', '22050', '-b:a', '24k', out], check=True)
    os.unlink(tmp); done += 1
print(f'part {k}/{n} : {done} fichiers')
