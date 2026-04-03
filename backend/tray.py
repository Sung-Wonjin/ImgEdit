"""
ImgEdit 트레이 아이콘 관리자
"""
import sys
import os
import subprocess
import threading
import webbrowser
import time

LOG_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "tray_log.txt")

def log(msg):
    with open(LOG_PATH, "a", encoding="utf-8") as f:
        import datetime
        f.write(f"[{datetime.datetime.now().strftime('%H:%M:%S')}] {msg}\n")

log("tray.py started")
log(f"Python: {sys.executable}")
log(f"Platform: {sys.platform}")

try:
    import pystray
    log(f"pystray OK: {pystray.__version__}")
except ImportError as e:
    log(f"[ERROR] pystray import failed: {e}")
    sys.exit(1)

try:
    from PIL import Image, ImageDraw
    log("PIL OK")
except ImportError as e:
    log(f"[ERROR] PIL import failed: {e}")
    sys.exit(1)

PORT = 8000
server_process = None


def create_icon_image():
    """트레이 아이콘 이미지 생성 (64x64, RGB)"""
    # pystray Windows 호환성을 위해 RGB 모드 사용
    img = Image.new("RGB", (64, 64), (41, 128, 185))
    draw = ImageDraw.Draw(img)
    draw.ellipse([8, 8, 56, 56], fill=(255, 255, 255))
    draw.ellipse([20, 20, 44, 44], fill=(41, 128, 185))
    draw.ellipse([28, 28, 36, 36], fill=(255, 255, 255))
    return img


def start_server():
    global server_process
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    python = sys.executable
    log(f"Starting uvicorn: {python} -m uvicorn main:app --port {PORT}")
    try:
        server_process = subprocess.Popen(
            [python, "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", str(PORT)],
            cwd=backend_dir,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            creationflags=subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0,
        )
        log(f"uvicorn PID: {server_process.pid}")
    except Exception as e:
        log(f"[ERROR] Failed to start uvicorn: {e}")


def wait_and_open_browser():
    import urllib.request
    log("Waiting for server...")
    for i in range(30):
        try:
            urllib.request.urlopen(f"http://localhost:{PORT}/health", timeout=1)
            log("Server ready, opening browser")
            webbrowser.open(f"http://localhost:{PORT}")
            return
        except Exception:
            time.sleep(0.5)
    log("Server timeout, opening browser anyway")
    webbrowser.open(f"http://localhost:{PORT}")


def open_browser(icon, item):
    webbrowser.open(f"http://localhost:{PORT}")


def quit_app(icon, item):
    global server_process
    log("Quit requested")
    icon.stop()
    if server_process and server_process.poll() is None:
        server_process.terminate()
        try:
            server_process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            server_process.kill()
    log("Exiting")
    os._exit(0)


def main():
    log("main() called")

    start_server()
    threading.Thread(target=wait_and_open_browser, daemon=True).start()

    try:
        icon_image = create_icon_image()
        log(f"Icon created: {icon_image.size} {icon_image.mode}")

        menu = pystray.Menu(
            pystray.MenuItem("ImgEdit 열기", open_browser, default=True),
            pystray.Menu.SEPARATOR,
            pystray.MenuItem("서버 종료", quit_app),
        )

        icon = pystray.Icon(
            name="ImgEdit",
            icon=icon_image,
            title="ImgEdit",
            menu=menu,
        )

        log("icon.run() starting...")
        icon.run()
        log("icon.run() returned")
    except Exception as e:
        log(f"[ERROR] {e}")
        import traceback
        log(traceback.format_exc())


if __name__ == "__main__":
    main()
