#!/bin/sh
# Index the .desktop file so the x-scheme-handler/vana MIME type is registered.
update-desktop-database -q /usr/share/applications || true
