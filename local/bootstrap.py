"""Prepare a project-local Python environment, then start the local workshop."""
import importlib.metadata
import pathlib
import subprocess
import sys
import venv

ROOT = pathlib.Path(__file__).resolve().parent.parent

def main():
    if sys.version_info < (3, 10):
        raise SystemExit('Python 3.10 ou plus est nécessaire.')
    executable = ROOT / '.venv' / ('Scripts/python.exe' if sys.platform == 'win32' else 'bin/python')
    if not executable.exists():
        print('Première installation dans ce dossier. Internet est nécessaire.', flush=True)
        venv.EnvBuilder(with_pip=True).create(ROOT / '.venv')
    probe = subprocess.run([str(executable), '-c', "from PIL import Image; from gtts import gTTS; from mutagen.mp3 import MP3"], capture_output=True)
    if probe.returncode:
        subprocess.run([str(executable), '-m', 'pip', 'install', '-r', str(ROOT/'local/requirements.txt')], check=True)
    subprocess.run([str(executable), str(ROOT/'local/server.py')], check=True, cwd=ROOT)

if __name__ == '__main__':
    try:
        main()
    except (OSError, subprocess.CalledProcessError) as exc:
        print('Démarrage interrompu :', exc)
        print('Vos thèmes sont conservés dans le dossier donnees_locales.')
        raise SystemExit(1)
