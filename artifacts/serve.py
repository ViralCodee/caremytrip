"""Local preview server that mirrors the production .htaccess clean-URL rules.

- Maps extensionless URLs to their .html file ( /packages -> packages.html ),
  preserving the query string ( /package?id=auli -> package.html?id=auli ).
- Serves index.html for "/".
- Sends no-store so the preview browser never caches edits.

This lets the local preview behave like the Apache host, so clean URLs work
the same in development and production.
"""
import http.server
import os
import socketserver
import sys
from urllib.parse import urlparse

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8125


class CleanURLHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, max-age=0")
        self.send_header("Pragma", "no-cache")
        super().end_headers()

    def _rewrite_clean_url(self):
        """If the path has no extension and no matching file/dir exists,
        rewrite it to the equivalent .html file (query string preserved)."""
        parsed = urlparse(self.path)
        path = parsed.path
        if path in ("", "/") or path.endswith("/"):
            return  # root / directory -> default index handling
        local = self.translate_path(self.path)  # strips query for us
        if os.path.exists(local):
            return  # real file (asset, existing .html, etc.) -> serve as-is
        # No extension on the last segment? try the .html twin.
        last = path.rsplit("/", 1)[-1]
        if "." in last:
            return  # already has an extension -> let it 404 normally
        if os.path.isfile(self.translate_path(path + ".html")):
            self.path = path + ".html"
            if parsed.query:
                self.path += "?" + parsed.query

    def do_GET(self):
        self._rewrite_clean_url()
        super().do_GET()

    def do_HEAD(self):
        self._rewrite_clean_url()
        super().do_HEAD()


if __name__ == "__main__":
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), CleanURLHandler) as httpd:
        print(f"Serving CareMyTrip (clean-URL, no-cache) on http://localhost:{PORT}")
        httpd.serve_forever()
