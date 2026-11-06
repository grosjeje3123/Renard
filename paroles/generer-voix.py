#!/usr/bin/env python3
"""Génère les voix du renard avec l'API de synthèse vocale d'OpenAI, d'après paroles-renard.csv.

Mise en route (une fois) :
    pip install openai
    export OPENAI_API_KEY="sk-..."          # Windows PowerShell : $env:OPENAI_API_KEY="sk-..."

1. Comparer quelques voix sur 6 phrases (écrit le dossier essai/) :
    python generer-voix.py --essai
2. Générer toutes les phrases avec la voix choisie (écrit le dossier voix/, reprend où il s'est arrêté) :
    python generer-voix.py --voix coral
   Pour ne refaire qu'un groupe : --origine consigne   (ou félicitation, retour, tableau, dessin, animal, carte, accueil, interface)
   Pour essayer sur peu de phrases : --max 20

Le texte envoyé est la colonne « lecture » du CSV : vous pouvez la corriger à la main (prononciation d'une lettre, d'un mot).
La voix est pilotée par prompt-voix.txt, à modifier à volonté.
"""
import argparse
import csv
import sys
import time
from pathlib import Path

try:
    from openai import OpenAI
except ImportError:
    sys.exit("Il manque la bibliothèque : pip install openai")

ICI = Path(__file__).resolve().parent
MODELE = "gpt-4o-mini-tts"  # voix pilotable par consignes ; vérifiez le nom du modèle et les voix disponibles dans la documentation OpenAI
VOIX_ESSAI = ["coral", "nova", "shimmer", "sage", "ballad", "verse"]


def lignes():
    with open(ICI / "paroles-renard.csv", encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f, delimiter=";"))

def parler(client, texte, voix, consignes, sortie, essais=4):
    for n in range(essais):
        try:
            with client.audio.speech.with_streaming_response.create(
                model=MODELE, voice=voix, input=texte, instructions=consignes, response_format="mp3"
            ) as reponse:
                reponse.stream_to_file(sortie)
            return True
        except Exception as e:  # limite de débit, coupure réseau…
            attente = 2 ** (n + 1)
            print(f"   ! {e.__class__.__name__}: {str(e)[:120]} — nouvel essai dans {attente} s")
            time.sleep(attente)
    return False

def main():
    ap = argparse.ArgumentParser(description="Génère les voix du renard (OpenAI).")
    ap.add_argument("--essai", action="store_true", help="comparer plusieurs voix sur quelques phrases")
    ap.add_argument("--voix", default="coral", help="voix à utiliser (défaut : coral)")
    ap.add_argument("--dossier", default=str(ICI / "voix"), help="dossier de sortie (défaut : voix/)")
    ap.add_argument("--origine", help="ne traiter qu'un groupe de phrases")
    ap.add_argument("--max", type=int, help="s'arrêter après N phrases")
    ap.add_argument("--refaire", action="store_true", help="regénérer aussi les fichiers déjà présents")
    a = ap.parse_args()
    consignes = (ICI / "prompt-voix.txt").read_text(encoding="utf-8").strip()
    client = OpenAI()
    rows = lignes()

    if a.essai:
        choisies = [r for r in rows if r["origine"] in ("consigne", "retour", "accueil")][::40][:6] or rows[:6]
        sortie = ICI / "essai"; sortie.mkdir(exist_ok=True)
        for v in VOIX_ESSAI:
            for i, r in enumerate(choisies, 1):
                f = sortie / f"{v}-{i}.mp3"
                print(f"{v} {i}/{len(choisies)} : {r['lecture'][:60]}")
                parler(client, r["lecture"], v, consignes, f)
        print(f"\nÉcoutez le dossier {sortie} : choisissez la voix, puis lancez  python generer-voix.py --voix <nom>")
        return

    sortie = Path(a.dossier); sortie.mkdir(parents=True, exist_ok=True)
    todo = [r for r in rows if (not a.origine or r["origine"] == a.origine)]
    if a.max: todo = todo[: a.max]
    car = sum(len(r["lecture"]) for r in todo)
    print(f"{len(todo)} phrases, {car} caractères, voix « {a.voix} » → {sortie}")
    faits = rates = 0
    for i, r in enumerate(todo, 1):
        f = sortie / f"{r['id']}.mp3"
        if f.exists() and not a.refaire:
            continue
        print(f"[{i}/{len(todo)}] {r['id']} {r['lecture'][:70]}")
        if parler(client, r["lecture"], a.voix, consignes, f): faits += 1
        else: rates += 1; f.unlink(missing_ok=True)
    print(f"\nTerminé : {faits} fichiers créés, {rates} échecs (relancez la même commande pour reprendre).")

if __name__ == "__main__":
    main()
