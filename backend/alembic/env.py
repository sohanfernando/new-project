import os
import sys
from logging.config import fileConfig

from sqlalchemy import engine_from_config
from sqlalchemy import pool

from alembic import context

# Insert the parent directory to sys.path so we can import 'app' module
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Import database configuration and models. Every model must be imported here
# so that Base.metadata sees it during autogenerate; missing an import silently
# drops the table from generated migrations (the digital twin bug).
from app.config import DATABASE_URL
from app.database import Base
from app.models.user import User
from app.models.profile import CandidateProfile
from app.models.role import Role
from app.models.level import Level
from app.models.digital_twin import CandidateDigitalTwin

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Dynamic setting of database URL from configuration
config.set_main_option("sqlalchemy.url", DATABASE_URL)

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Set model metadata for autogenerate detection
target_metadata = Base.metadata

def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()

def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    # Override configuration section for sqlalchemy engine creation
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, 
            target_metadata=target_metadata,
            render_as_batch=True  # Required for SQLite support during column edits/deletions
        )

        with context.begin_transaction():
            context.run_migrations()

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
