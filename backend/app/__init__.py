# Copyright (C) 2026 gbao86 <tiktokthu10@gmail.com>
# This file is part of the chims project.
# Licensed under the GNU General Public License v3.0; see LICENSE for details.
# app package

# Patch bcrypt to fix passlib incompatibility in modern Python/bcrypt environments
try:
    import bcrypt
    if not hasattr(bcrypt, "__about__"):
        class MockAbout:
            __version__ = bcrypt.__version__
        bcrypt.__about__ = MockAbout()
except ImportError:
    pass

