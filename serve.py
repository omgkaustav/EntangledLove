#!/usr/bin/env python3
"""
serve.py - Entangled Love Development Server with Built-in Zero-CORS Moth Atlas Proxy
Serves static project files on port 8000 AND reverse-proxies /api/v1/* to
https://api.mothquantum.com/api/v1/* with zero CORS issues on the same origin.
"""

import sys
import os
import urllib.request
import urllib.error
from http.server import SimpleHTTPRequestHandler, HTTPServer

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
TARGET_BASE = "https://api.mothquantum.com"

class UnifiedHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        # Attach open CORS headers to all responses
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, DELETE, PUT")
        self.send_header("Access-Control-Allow-Headers", "Authorization, Content-Type, Accept, Origin, User-Agent, X-Requested-With")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def do_HEAD(self):
        if self.path.startswith("/api/v1/"):
            self._proxy_request("HEAD")
        else:
            super().do_HEAD()

    def do_GET(self):
        if self.path.startswith("/api/v1/"):
            self._proxy_request("GET")
        else:
            super().do_GET()

    def do_POST(self):
        if self.path.startswith("/api/v1/"):
            self._proxy_request("POST")
        else:
            self.send_response(405)
            self.end_headers()

    def do_DELETE(self):
        if self.path.startswith("/api/v1/"):
            self._proxy_request("DELETE")
        else:
            self.send_response(405)
            self.end_headers()

    def _proxy_request(self, method):
        target_url = TARGET_BASE + self.path
        body = None
        if "Content-Length" in self.headers:
            content_length = int(self.headers["Content-Length"])
            body = self.rfile.read(content_length)

        forward_headers = {
            "User-Agent": self.headers.get("User-Agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"),
            "Host": "api.mothquantum.com"
        }
        if "Authorization" in self.headers:
            forward_headers["Authorization"] = self.headers["Authorization"]
        if "Content-Type" in self.headers:
            forward_headers["Content-Type"] = self.headers["Content-Type"]

        req = urllib.request.Request(target_url, data=body, headers=forward_headers, method=method)
        try:
            with urllib.request.urlopen(req) as resp:
                self.send_response(resp.status)
                for key, val in resp.getheaders():
                    if key.lower() not in ("access-control-allow-origin", "transfer-encoding", "content-encoding", "content-length"):
                        self.send_header(key, val)
                content = resp.read()
                self.send_header("Content-Length", str(len(content)))
                self.end_headers()
                self.wfile.write(content)
        except urllib.error.HTTPError as e:
            err_body = e.read()
            self.send_response(e.code)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(err_body)))
            self.end_headers()
            self.wfile.write(err_body)
        except Exception as e:
            err_msg = f'{{"error": "{str(e)}"}}'.encode('utf-8')
            self.send_response(502)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(err_msg)))
            self.end_headers()
            self.wfile.write(err_msg)

if __name__ == "__main__":
    server_address = ("", PORT)
    httpd = HTTPServer(server_address, UnifiedHandler)
    print("=" * 65)
    print(f"🦋 Entangled Love Server running at http://localhost:{PORT}")
    print(f"   • Open Game:               http://localhost:{PORT}/")
    print(f"   • Built-in Zero-CORS Proxy: http://localhost:{PORT}/api/v1/*")
    print("=" * 65)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")
