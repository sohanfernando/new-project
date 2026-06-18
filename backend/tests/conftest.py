import os

# Provide a deterministic SECRET_KEY for the test session before any app modules
# are imported. The application now refuses to start without one, and pytest
# collects test modules before fixtures run.
os.environ.setdefault("SECRET_KEY", "test-only-secret-key-not-for-production")
