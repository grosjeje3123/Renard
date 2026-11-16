"""Voix du renard générées sur place, sans clé ni compte : synthèse vocale libre Piper.
Lit paroles/paroles-renard.csv (colonne « lecture », sinon « texte ») et écrit voix/<id>.mp3 (mono, 22 kHz).

Usage : python3 tools/voix-piper.py <modele.onnx> [--refaire] [--part i/n] [--voix jessica|siwis]
Reprend là où il s'est arrêté (les fichiers déjà faits sont gardés) ; --refaire réécrit tout.

Deux réglages, à choisir avec --voix :
  jessica (par défaut, v1.12) : modèle fr_FR-upmc-medium, locutrice « jessica », remontée de trois demi-tons
      (timbre compris : une voix plus enfantine), débit normal, son nettoyé, 56 kb/s.
      Corpus UPMC du projet MaryTTS, licence CC BY-SA 4.0 d'après la fiche du modèle : citer la source (écran Crédits).
  siwis (voix des versions 1.10 et 1.11) : modèle fr_FR-siwis-medium, un peu ralentie, 24 kb/s.
      Corpus SIWIS, licence CC BY 4.0.
Les modèles se téléchargent sur les releases de rhasspy/piper ou de k2-fsa/sherpa-onnx (tts-models)."""
import csv, os, subprocess, sys, wave, tempfile
from piper import PiperVoice, SynthesisConfig

SOIN = ('silenceremove=start_periods=1:start_threshold=-50dB,highpass=f=70,equalizer=f=3200:t=q:w=1.2:g=1.5,'
        'acompressor=threshold=-20dB:ratio=2.5:attack=8:release=120:makeup=2,alimiter=limit=0.9,apad=pad_dur=0.22')
VOIX = {
    'jessica': dict(cfg=dict(length_scale=1.0, noise_scale=0.75, noise_w_scale=0.9, speaker_id=0),
                    # trois demi-tons plus haut, formants déplacés avec la hauteur : c'est ce qui rajeunit la voix
                    filtre=f'rubberband=pitch={2 ** (3 / 12):.4f}:formant=shifted,' + SOIN, debit='56k'),
    'siwis': dict(cfg=dict(length_scale=1.12, noise_scale=0.6, noise_w_scale=0.7),
                  filtre='silenceremove=start_periods=1:start_threshold=-50dB,apad=pad_dur=0.12', debit='24k'),
}

def option(nom, defaut):
    for i, a in enumerate(sys.argv):
        if a == nom: return sys.argv[i + 1]
        if a.startswith(nom + '='): return a.split('=', 1)[1]
    return defaut

model = sys.argv[1]
refaire = '--refaire' in sys.argv
k, n = map(int, option('--part', '0/1').split('/'))
reglage = VOIX[option('--voix', 'jessica')]
os.makedirs('voix', exist_ok=True)
voice = PiperVoice.load(model)
cfg = SynthesisConfig(**reglage['cfg'])
rows = list(csv.DictReader(open('paroles/paroles-renard.csv', encoding='utf-8-sig'), delimiter=';'))
done = 0
for i, r in enumerate(rows):
    if i % n != k: continue
    out = f"voix/{r['id']}.mp3"
    if os.path.exists(out) and not refaire: continue
    text = (r.get('lecture') or r['texte']).strip()
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as t: tmp = t.name
    with wave.open(tmp, 'wb') as w: voice.synthesize_wav(text, w, syn_config=cfg)
    # écrit d'abord à côté, puis renomme : un arrêt en cours de route ne laisse jamais un fichier tronqué
    part = out + '.part.mp3'
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', tmp, '-af', reglage['filtre'], '-ac', '1', '-ar', '22050', '-b:a', reglage['debit'], part], check=True)
    os.replace(part, out); os.unlink(tmp); done += 1
print(f'part {k}/{n} : {done} fichiers')
