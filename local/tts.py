"""gTTS request construction with TLS-verified HTTPS transport.

Use gTTS's public get_bodies API for tokenization/RPC construction. Keep the
network transport explicit: gTTS 2.5.4's own stream method disables TLS checking.
"""
import base64
import json
from gtts import gTTS
import requests


def generate_audio(label, accent):
    voice = gTTS(label, lang='en', tld=accent, lang_check=False)
    audio = bytearray()
    for body in voice.get_bodies():
        found = False
        with requests.post(
            f'https://translate.google.{accent}/_/TranslateWebserverUi/data/batchexecute',
            data=body, headers=voice.GOOGLE_TTS_HEADERS,
            timeout=(8, 20), verify=True, stream=True,
        ) as response:
            response.raise_for_status()
            for line in response.iter_lines():
                try:
                    rows = json.loads(line)
                except (ValueError, UnicodeDecodeError):
                    continue
                if not isinstance(rows, list):
                    continue
                for row in rows:
                    if isinstance(row, list) and len(row) > 2 and row[1] == voice.GOOGLE_TTS_RPC:
                        values = json.loads(row[2])
                        if not isinstance(values, list) or not values or not isinstance(values[0], str):
                            raise ValueError('Réponse vocale invalide.')
                        audio.extend(base64.b64decode(values[0], validate=True))
                        found = True
                        if len(audio) > 8 * 1024 * 1024:
                            raise ValueError('Réponse vocale trop volumineuse.')
        if not found:
            raise ValueError('Le service n’a retourné aucun son.')
    return bytes(audio)
