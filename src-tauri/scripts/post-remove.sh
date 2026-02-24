#!/bin/sh
# Re-index after removing the .desktop file.
update-desktop-database -q /usr/share/applications || true
