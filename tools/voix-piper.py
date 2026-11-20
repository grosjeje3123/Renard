"""Voix du renard générées sur place, sans clé ni compte : synthèse vocale libre Piper.
Lit paroles/paroles-renard.csv (colonne « lecture », sinon « texte ») et écrit voix/<id>.mp3 (mono, 22 kHz).

Usage : python3 tools/voix-piper.py <modele.onnx> [--refaire] [--part i/n] [--voix jessica|siwis] [--origine dictée]
                                   [--whisper <dossier sherpa-onnx-whisper-small> [--prises 6]]
Reprend là où il s'est arrêté (les fichiers déjà faits sont gardés) ; --refaire réécrit tout ; --origine limite à une famille.

La dictée, plusieurs prises : l'enfant doit comprendre le mot à l'oreille seule, et la synthèse ne dit jamais deux fois une
phrase de la même façon. Avec --whisper, chaque consigne de dictée (« Écris le mot maman. ») est enregistrée jusqu'à --prises
fois ; une reconnaissance vocale (Whisper, par sherpa-onnx : pip install sherpa-onnx) réécoute chaque prise, et on garde la
première où le mot est entendu sans faute, sinon la plus proche. Ce n'est pas une oreille d'enfant : c'est un tri, pas une preuve.

Deux réglages, à choisir avec --voix :
  jessica (par défaut, v1.12) : modèle fr_FR-upmc-medium, locutrice « jessica », remontée de trois demi-tons
      (timbre compris : une voix plus enfantine), débit normal, son nettoyé, 56 kb/s.
      Corpus UPMC du projet MaryTTS, licence CC BY-SA 4.0 d'après la fiche du modèle : citer la source (écran Crédits).
  siwis (voix des versions 1.10 et 1.11) : modèle fr_FR-siwis-medium, un peu ralentie, 24 kb/s.
      Corpus SIWIS, licence CC BY 4.0.
Les modèles se téléchargent sur les releases de rhasspy/piper ou de k2-fsa/sherpa-onnx (tts-models)."""
import csv, os, re, subprocess, sys, wave, tempfile, unicodedata
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
origine = option('--origine', None)
dossier_whisper, prises = option('--whisper', None), int(option('--prises', '6'))
os.makedirs('voix', exist_ok=True)

ecoute = None
if dossier_whisper:
    import numpy as np, sherpa_onnx
    w = dossier_whisper.rstrip('/')
    rec = sherpa_onnx.OfflineRecognizer.from_whisper(encoder=f'{w}/small-encoder.int8.onnx', decoder=f'{w}/small-decoder.int8.onnx', tokens=f'{w}/small-tokens.txt', language='fr', task='transcribe', num_threads=2)
    def ecoute(mp3):
        raw = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', mp3, '-f', 's16le', '-ac', '1', '-ar', '16000', '-'], capture_output=True).stdout
        st = rec.create_stream(); st.accept_waveform(16000, np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768); rec.decode_stream(st)
        return st.result.text
norm = lambda t: re.sub(r'[^a-z0-9 ]', ' ', unicodedata.normalize('NFD', t.lower().replace('œ', 'oe')).encode('ascii', 'ignore').decode()).split()
def distance(a, b):
    d = list(range(len(b) + 1))
    for i in range(1, len(a) + 1):
        p, d[0] = d[0], i
        for j in range(1, len(b) + 1): p, d[j] = d[j], min(d[j] + 1, d[j - 1] + 1, p + (a[i - 1] != b[j - 1]))
    return d[-1]
def ecart(texte, entendu):
    """0 si le mot (ou la phrase) dicté est entendu tel quel ; sinon, l'écart en lettres avec ce qui a été compris."""
    cible = norm(re.search(r'« (.+?) »', texte).group(1)); h = norm(entendu)
    if any(h[i:i + len(cible)] == cible for i in range(len(h) - len(cible) + 1)): return 0
    return 1 + min(distance(' '.join(cible), ' '.join(h[i:i + len(cible)])) for i in range(max(1, len(h) - len(cible) + 1)))
voice = PiperVoice.load(model)
cfg = SynthesisConfig(**reglage['cfg'])
rows = list(csv.DictReader(open('paroles/paroles-renard.csv', encoding='utf-8-sig'), delimiter=';'))
def prise(text, mp3):
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as t: tmp = t.name
    with wave.open(tmp, 'wb') as w: voice.synthesize_wav(text, w, syn_config=cfg)
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', tmp, '-af', reglage['filtre'], '-ac', '1', '-ar', '22050', '-b:a', reglage['debit'], mp3], check=True)
    os.unlink(tmp)

done = nettes = triees = 0
for i, r in enumerate(rows):
    if i % n != k or (origine and r['origine'] != origine): continue
    out = f"voix/{r['id']}.mp3"
    if os.path.exists(out) and not refaire: continue
    text = (r.get('lecture') or r['texte']).strip()
    # écrit d'abord à côté, puis renomme : un arrêt en cours de route ne laisse jamais un fichier tronqué
    part = out + '.part.mp3'
    if ecoute and r['origine'] == 'dictée' and '«' in r['texte'] and re.match(r'Écris (le mot|la phrase) «', r['texte']):
        meilleur = None
        for _ in range(prises):
            prise(text, part); e = ecart(r['texte'], ecoute(part))
            if meilleur is None or e < meilleur: meilleur = e; os.replace(part, out)
            if e == 0: break
        triees += 1; nettes += meilleur == 0
        if os.path.exists(part): os.unlink(part)
    else:
        prise(text, part); os.replace(part, out)
    done += 1
print(f'part {k}/{n} : {done} fichiers' + (f' ; dictée : {nettes} consignes sur {triees} entendues sans faute par la machine' if triees else ''))
