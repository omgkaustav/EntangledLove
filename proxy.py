#!/usr/bin/env python3
"""
proxy.py - Minimal local Python CORS proxy for Moth Atlas API.
Forwards incoming requests and the Authorization header directly to api.mothquantum.com.
Stores no keys or state.
"""
from http.server import HTTPServer, BaseHTTPRequestHandler
import urllib.request
import urllib.error

PORT = 8787
TARGET_BASE = "https://api.mothquantum.com"

class ProxyHandler(BaseHTTPRequestHandler):
    def _send_cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "*")

    def do_OPTIONS(self):
        self.send_response(204)
        self._send_cors()
        self.end_headers()

    def do_GET(self):
        self._forward_request("GET")

    def do_POST(self):
        self._forward_request("POST")

    def _forward_request(self, method):
        url = TARGET_BASE + self.path
        body = None
        if "Content-Length" in self.headers:
            length = int(self.headers["Content-Length"])
            body = self.rfile.read(length)

        headers = {
            "User-Agent": self.headers.get("User-Agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        }
        if "Authorization" in self.headers:
            headers["Authorization"] = self.headers["Authorization"]
        if "Content-Type" in self.headers:
            headers["Content-Type"] = self.headers["Content-Type"]

        req = urllib.request.Request(url, data=body, headers=headers, method=method)
        try:
            with urllib.request.urlopen(req) as resp:
                self.send_response(resp.status)
                self._send_cors()
                for key, val in resp.getheaders():
                    if key.lower() not in ("access-control-allow-origin", "transfer-encoding"):
                        self.send_header(key, val)
                self.end_headers()
                self.wfile.write(resp.read())
        except urllib.error.HTTPError as e:
            self.send_response(e.code)
            self._send_cors()
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(e.read())
        except Exception as e:
            self.send_response(502)
            self._send_cors()
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(f'{{"error": "{str(e)}"}}'.encode())

if __name__ == "__main__":
    server = HTTPServer(("localhost", PORT), ProxyHandler)
    print(f"[Atlas Proxy] Running at http://localhost:{PORT}")
    print(f"[Atlas Proxy] Set Base URL to: http://localhost:{PORT}/api/v1")
    server.serve_forever()
